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

## 3. Script Unificado (Borrado y Verificación en 1 sola ejecución)

Para borrar un objeto duplicado (si se especifica `$mid_a_borrar`) y **mostrar inmediatamente la lista actualizada** sin necesidad de volver a ejecutar el script:

```perl
my $nombre_busqueda = 'PSIP300';
my $mid_a_borrar    = 'iseries_object-590083'; # Opcional: Dejar en '' si solo se desea consultar

print "--- Gestión de Objetos iSeries: $nombre_busqueda ---\n";

# 1. Si se especificó un MID a eliminar, lo borramos primero
if ($mid_a_borrar) {
    my $target = ci->new($mid_a_borrar);
    if ($target) {
        $target->delete();
        print " [OK] Objeto $mid_a_borrar eliminado exitosamente.\n\n";
    } else {
        print " [WARN] No se pudo instanciar o encontrar el objeto: $mid_a_borrar\n\n";
    }
}

# 2. Consultamos y mostramos el listado actualizado de objetos vigentes
my @encontrados = ci->iseries_object->find({ name => $nombre_busqueda })->all;

print "Objetos vigentes en Clarive (" . scalar(@encontrados) . "):\n";
foreach my $item (@encontrados) {
    print " - MID: $item->{mid} | Librería: " . ($item->{library} || '-') . " | BL: " . ($item->{bl} || '-') . "\n";
}
```

> [!WARNING]
> La eliminación a través de `$obj->delete()` es irreversible y remueve los vínculos asociados en Clarive.
