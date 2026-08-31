---
title: "Limpiar Ramas Huérfanas de un Tópico"
category: "clarive"
tags: ["clarive", "git", "troubleshooting", "perl", "mongodb", "branches"]
keywords: ["limpiar ramas clarive", "ramas huerfanas", "GitRevision", "borrar ramas topico", "branches clarive"]
description: "Guía paso a paso para eliminar referencias a ramas Git (GitRevision) asociadas a una Historia de Usuario o tópico en Clarive."
---

# Limpiar Ramas Huérfanas de un Tópico

Cuando las ramas Git (CIs del tipo `GitRevision`) quedan asociadas a un tópico (por ejemplo, una Historia de Usuario) pero ya no corresponden o deben desvincularse, es necesario limpiar tanto el campo `branches` del tópico en MongoDB como los objetos `GitRevision` huérfanos a través del ORM de Clarive.

Ejecutar los siguientes pasos **en orden** desde el entorno REPL de Clarive.

> [!WARNING]
> Operación destructiva. Verificar los IDs antes de ejecutar. Una vez borrados los `GitRevision`, la acción no se puede deshacer fácilmente.

## 1. Limpiar el array `branches` del tópico y refrescarlo

Vaciar el campo `branches` directamente en MongoDB y forzar un `touch` para que Clarive recalcule el estado del tópico:

```perl
# Reemplazar '326615' con el MID real del tópico
mdb->topic->update(
    { mid => '326615' },
    { '$set' => { branches => [] } }
);

my $stash = mdb->topic->find_one({ mid => '326615' });

Baseliner::Model::Topic->touch( $stash->{topic_mid}, 'clarive' );
Baseliner::Model::Topic->touch( $stash->{topic_mid}, $stash->{username} );
```

## 2. Borrar los objetos `GitRevision` huérfanos

Instanciar cada `GitRevision` con el ORM y eliminarlo. Los IDs se obtienen previamente consultando el tópico o la colección `master_rel`:

```perl
# Reemplazar con los IDs reales de los GitRevision a eliminar
my @ids = ('GitRevision-16092', 'GitRevision-16093', 'GitRevision-16094');

foreach my $id (@ids) {
    my $obj = ci->new($id);
    if ($obj) {
        $obj->delete();
    }
}
```

> [!TIP]
> Para obtener los IDs de los `GitRevision` vinculados a un tópico, buscar en `master_rel` con `from_mid` igual al MID del tópico y `rel_field` igual a `branches`.

## 3. Forzar guardado del tópico padre

Para evitar el error *"Master row not found"* en la UI, guardar el tópico padre y refrescar el navegador (F5):

```perl
# Reemplazar '326615' con el MID real del tópico
my $his = ci->new('326615');
if ($his) {
    $his->save();
}
```
