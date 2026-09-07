---
title: "Limpiar Ramas Huérfanas de un Tópico"
category: "clarive"
tags: ["clarive", "git", "troubleshooting", "perl", "mongodb", "branches"]
keywords: ["limpiar ramas clarive", "ramas huerfanas", "GitRevision", "borrar ramas topico", "branches clarive"]
description: "Script unificado en Perl para obtener y eliminar automáticamente referencias a ramas Git (GitRevision) asociadas a una Historia de Usuario o tópico en Clarive."
---

# Limpiar Ramas Huérfanas de un Tópico

Cuando las ramas Git (CIs del tipo `GitRevision`) quedan asociadas a un tópico (por ejemplo, una Historia de Usuario) pero ya no corresponden o deben desvincularse, es necesario limpiar tanto el campo `branches` del tópico en MongoDB como eliminar los objetos `GitRevision` huérfanos a través del ORM de Clarive.

Para simplificar este proceso y evitar inconsistencias, se puede ejecutar un **único script unificado** directamente en el entorno REPL de Clarive.

> [!WARNING]
> Operación destructiva. Una vez borrados los objetos `GitRevision`, la acción no se puede deshacer fácilmente. Verificar el MID del tópico antes de ejecutar.

---

## Script Unificado de Limpieza (Perl / REPL)

Simplemente modifique la variable `$mid_topico` y ejecute el siguiente bloque en el REPL de Clarive:

```perl
# Reemplazar con el MID real del tópico a limpiar
my $mid_topico = '326615';

print "--- Iniciando limpieza de ramas para el tópico $mid_topico ---\n";

# 1. Buscar el tópico y respaldar los IDs de GitRevision vinculados
my $stash = mdb->topic->find_one({ mid => $mid_topico });
die "ERROR: No se encontró el tópico con MID: $mid_topico\n" unless $stash;

my @ids = @{ $stash->{branches} || [] };

if (!@ids) {
    print "AVISO: El tópico no tiene ramas en su arreglo 'branches'.\n";
} else {
    print "Se encontraron " . scalar(@ids) . " rama(s) a eliminar: " . join(', ', @ids) . "\n";
}

# 2. Vaciar el campo 'branches' en MongoDB
mdb->topic->update(
    { mid => $mid_topico },
    { '$set' => { branches => [] } }
);

# 3. Eliminar cada objeto GitRevision a través del ORM de Clarive
foreach my $id (@ids) {
    my $obj = ci->new($id);
    if ($obj) {
        $obj->delete();
        print " [OK] Eliminado: $id\n";
    } else {
        print " [WARN] Objeto no encontrado o ya eliminado: $id\n";
    }
}

# 4. Refrescar estado en Clarive y guardar el tópico padre
Baseliner::Model::Topic->touch( $stash->{topic_mid}, 'clarive' );
Baseliner::Model::Topic->touch( $stash->{topic_mid}, $stash->{username} );

my $topico = ci->new($mid_topico);
if ($topico) {
    $topico->save();
}

print "--- Proceso completado exitosamente para el tópico $mid_topico ---\n";
```

---

## ¿Qué realiza este script automáticamente?

1. **Lectura previa**: Consulta el documento en MongoDB y rescata en memoria la lista de IDs de `GitRevision` antes de limpiar el arreglo.
2. **Limpieza del campo `branches`**: Actualiza el campo `branches` a `[]` en la colección `topic`.
3. **Eliminación vía ORM**: Instancia y ejecuta `$obj->delete()` sobre cada objeto `GitRevision` registrado.
4. **Sincronización y persistencia**: Ejecuta `touch` para recalcular el estado y realiza un `$topico->save()` sobre el tópico padre para evitar errores de tipo *"Master row not found"* en la interfaz gráfica.

---

## Búsqueda manual de relaciones (Opcional)

> [!TIP]
> Si requiere consultar los vínculos externamente antes de ejecutar la eliminación, puede consultar la colección `master_rel` donde `from_mid` sea igual al MID del tópico y `rel_field` sea igual a `branches`.
