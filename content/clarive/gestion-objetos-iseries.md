---
title: "Gestión de Objetos iSeries (Búsqueda y Eliminación)"
category: "clarive"
tags: ["clarive", "iseries", "perl", "script", "busqueda", "delete"]
keywords: ["objetos iseries clarive", "buscar objeto iseries", "borrar objeto iseries", "eliminar duplicados iseries", "iseries_object", "ci new delete"]
description: "Guía y scripts en Perl para buscar objetos iSeries por nombre, consultar sus librerías/entornos y eliminar objetos duplicados u obsoletos en Clarive."
---

# Gestión de Objetos iSeries en Clarive

En Clarive, los elementos de configuración asociados a AS400 / iSeries se representan mediante CIs como `iseries_object` e `iseries_library`. Esta guía reúne las operaciones principales para buscar objetos iSeries, inspeccionar sus atributos (librería, entornos, baseline) y eliminar aquellos registros que se encuentren duplicados u obsoletos.

---

## 1. Búsqueda de Objetos iSeries por Nombre

Para localizar un objeto iSeries por su nombre técnico (ejemplo `PSIP300`) y conocer la librería a la que pertenece, sus entornos asignados y su versión o Baseline (`bl`), utilice el siguiente script en el REPL de Clarive:

```perl
my $nombre_objeto = 'PSIP300';

# Buscar todos los objetos iSeries con el nombre indicado
my @objetos = ci->iseries_object->find({ name => $nombre_objeto })->all;

print "--- Resultados de búsqueda para: $nombre_objeto ---\n";

foreach my $obj (@objetos) {
    my $lib_id  = $obj->{library};
    my $entorno = 'N/A';
    
    if ($lib_id) {
        my $lib_obj = ci->iseries_library->find_one({ mid => $lib_id });
        
        if ($lib_obj && $lib_obj->{environments}) {
            my $env = $lib_obj->{environments};
            $entorno = ref $env eq 'ARRAY' ? join(', ', @$env) : $env;
        }
    }

    print "ID (MID): " . $obj->{mid} 
        . " | Nombre: " . $obj->{name}
        . " | Lib: " . ($lib_id || '-') 
        . " | Entorno(Lib): $entorno"
        . " | BL: " . ($obj->{bl} || '-') . "\n";
}
```

---

## 2. Eliminación de Objetos iSeries (Duplicados u Obsoletos)

Cuando existen registros duplicados o elementos obsoletos en la base de datos de Clarive, no basta con eliminar el documento directo en MongoDB. Se debe instanciar el objeto utilizando el ORM de Clarive (`ci->new($id)`) para invocar el método de borrado `$obj->delete()`.

```perl
# Identificador MID del objeto iSeries a eliminar (ejemplo: 'iseries_object-590083')
my $id_a_eliminar = 'iseries_object-590083';

# Instanciar el objeto mediante la API de Clarive
my $obj_duplicado = ci->new($id_a_eliminar);

if ($obj_duplicado) {
    # Ejecutar el método delete del ORM
    $obj_duplicado->delete(); 
    print "¡Éxito! El objeto iSeries '$id_a_eliminar' fue eliminado correctamente.\n";
} else {
    print "ERROR: No se pudo instanciar el objeto con el ID: $id_a_eliminar\n";
}
```

---

## 3. Script Unificado (Buscar e Identificar Duplicados)

Para listar todas las instancias de un objeto y eliminar únicamente una versión específica por su `mid`:

```perl
my $nombre_busqueda = 'PSIP300';
my $mid_a_borrar    = ''; # Opcional: Especificar MID si se desea borrar directamente

print "--- Gestión de Objetos iSeries: $nombre_busqueda ---\n";

my @encontrados = ci->iseries_object->find({ name => $nombre_busqueda })->all;

foreach my $item (@encontrados) {
    print " - MID: $item->{mid} | Librería: " . ($item->{library} || '-') . " | BL: " . ($item->{bl} || '-') . "\n";
}

# Si se especificó un MID a eliminar:
if ($mid_a_borrar) {
    my $target = ci->new($mid_a_borrar);
    if ($target) {
        $target->delete();
        print " [OK] Objeto $mid_a_borrar eliminado exitosamente.\n";
    }
}
```

> [!WARNING]
> La eliminación a través de `$obj->delete()` es irreversible y remueve los vínculos asociados en Clarive. Se recomienda verificar previamente los MIDs con la consulta de búsqueda.
