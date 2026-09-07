---
title: "Limpiar Ramas Huérfanas de un Tópico"
category: "clarive"
tags: ["clarive", "git", "troubleshooting", "perl", "mongodb", "branches"]
keywords: ["limpiar ramas clarive", "ramas huerfanas", "GitRevision", "borrar ramas topico", "branches clarive"]
description: "Guía paso a paso para obtener y eliminar referencias a ramas Git (GitRevision) asociadas a una Historia de Usuario o tópico en Clarive."
---

# Limpiar Ramas Huérfanas de un Tópico

Cuando las ramas Git (CIs del tipo `GitRevision`) quedan asociadas a un tópico (por ejemplo, una Historia de Usuario) pero ya no corresponden o deben desvincularse, es necesario limpiar tanto el campo `branches` del tópico en MongoDB como los objetos `GitRevision` huérfanos a través del ORM de Clarive.

Ejecutar los siguientes pasos **en orden** desde el entorno REPL de Clarive.

> [!WARNING]
> Operación destructiva. Verificar los IDs antes de ejecutar. Una vez borrados los `GitRevision`, la acción no se puede deshacer fácilmente.

---

## 1. Obtener los IDs de `GitRevision` y limpiar el array `branches` del tópico

Obtener la lista de IDs de `GitRevision` vinculados al tópico **antes de vaciar el campo**, limpiar el array `branches` directamente en MongoDB y forzar un `touch` para que Clarive recalcule el estado del tópico:

```perl
# Reemplazar '326615' con el MID real del tópico
my $mid_topico = '326615';

# 1. Obtener el tópico y respaldar los IDs de las ramas antes de vaciar
my $stash = mdb->topic->find_one({ mid => $mid_topico });
my @ids = @{ $stash->{branches} || [] };

print "GitRevision a eliminar: ", join(', ', @ids), "\n";

# 2. Vaciar el array 'branches' en MongoDB
mdb->topic->update(
    { mid => $mid_topico },
    { '$set' => { branches => [] } }
);

# 3. Forzar touch para que Clarive recalcule el estado
Baseliner::Model::Topic->touch( $stash->{topic_mid}, 'clarive' );
Baseliner::Model::Topic->touch( $stash->{topic_mid}, $stash->{username} );
```

---

## 2. Borrar los objetos `GitRevision` huérfanos

Instanciar cada `GitRevision` (utilizando la variable `@ids` obtenida en el Paso 1 o indicando los IDs de forma manual) con el ORM de Clarive y eliminarlo:

```perl
# Utiliza el arreglo @ids capturado en el Paso 1
# (O definir manualmente: my @ids = ('GitRevision-16092', 'GitRevision-16093');)

foreach my $id (@ids) {
    my $obj = ci->new($id);
    if ($obj) {
        $obj->delete();
    }
}
```

> [!TIP]
> En caso de requerir consultar los vínculos externamente, también se puede buscar en `master_rel` donde `from_mid` sea igual al MID del tópico y `rel_field` sea igual a `branches`.

---

## 3. Forzar guardado del tópico padre

Para evitar el error *"Master row not found"* en la interfaz de Clarive, guardar el tópico padre y refrescar la página en el navegador (F5):

```perl
# Reemplazar '326615' con el MID real del tópico
my $his = ci->new('326615');
if ($his) {
    $his->save();
}
```
