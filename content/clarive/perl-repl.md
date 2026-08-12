---
title: "Desarrollo de Scripts (Perl / REPL)"
category: "clarive"
tags: ["clarive", "perl", "repl", "scripts"]
---

# Automatización con Perl / REPL

Clarive permite ejecutar código Perl utilizando el entorno REPL disponible en la instalación.

Esto resulta especialmente útil para:

* consultas masivas
* migraciones
* correcciones puntuales
* búsquedas
* actualización de tópicos
* administración de usuarios
* consulta de secuencias
* tareas repetitivas

## Visualizaciones de un tópico

Clarive mantiene información relacionada con los objetos que los usuarios ya visualizaron en el "ojito".

### Buscar visualizaciones

Desde el acceso a MongoDB/REPL:

```perl
mdb->master_seen->find({ mid => '337780' })->all
```

Esto permite consultar quién tiene registrado como visto el tópico indicado.

### Eliminar una visualización

> [!WARNING]
> Acción destructiva.

Para eliminar el estado de visto de un usuario específico:

```perl
mdb->master_seen->remove({
    mid      => '337780',
    username => 'lamberta'
});
```

Puede resultar útil cuando la interfaz muestra un tópico como visto para un usuario y se necesita resetear manualmente ese estado.

## Buscar usuarios por email

```perl
my @emails = (
    'alan.lampert@equila.com.ar',
    # ... pegá el resto acá
);

print "--- Inicio de búsqueda ---\n";

foreach my $mail (@emails) {
    # Limpiar posibles espacios provenientes de Excel
    $mail =~ s/^\s+|\s+$//g;

    my $user = ci->user->find_one({
        email => $mail
    });

    if ($user) {
        # En Clarive, el ID de login suele estar en 'name'
        my $username = $user->{name} || $user->{username};

        if ($username) {
            print "Mail: $mail -> Username: $username\n";
        }
        else {
            print "Mail: $mail -> Encontrado pero sin campo 'name'\n";
        }
    }
    else {
        print "ERROR: No se encontró el mail: $mail\n";
    }
}

print "--- Proceso finalizado ---\n";
```

> [!TIP]
> Para operaciones masivas conviene:
> 1. probar primero con un único usuario;
> 2. imprimir los resultados;
> 3. validar que el campo utilizado sea el esperado;
> 4. recién después ejecutar sobre la lista completa.

## Actualización de datos de un tópico

Para actualizar un campo de un tópico:

```perl
mdb->topic->update(
    { mid => '274758' },
    {
        '$set' => {
            fecha_emision => '2025-09-19 00:00:00'
        }
    }
);
```

Antes de modificarlo, consultar el registro:

```perl
my $stash = mdb->topic->find_one({
    mid => '274758'
});
```

### Forzar actualización / touch de un tópico

Después de obtener el tópico, puede ejecutarse:

```perl
Baseliner::Model::Topic->touch(
    $stash->{topic_mid},
    'clarive'
);

Baseliner::Model::Topic->touch(
    $stash->{topic_mid},
    $stash->{username}
);
```

El `touch` puede ser necesario para que Clarive procese nuevamente determinados cambios o actualice información relacionada con el tópico.

## Secuencias custom

Clarive utiliza secuencias para generar determinados identificadores. Por ejemplo, una secuencia custom para Auditoría: `ref_audi`.

Consultar y actualizar:

```perl
# Consultar el valor actual de una secuencia (ej. ref_audi)
my $val = mdb->seq('ref_audi');
print "El valor actual es: $val\n";

# Actualizar la secuencia (¡PRECAUCIÓN!)
# mdb->seq('ref_audi', 1017);
```

> [!CAUTION]
> Modificar una secuencia puede provocar IDs duplicados o inconsistencias si se establece un valor inferior al último utilizado.
> Verificar cuál debería ser el próximo valor válido antes de cambiarla.

## Búsqueda de Tópicos con Proyección (fields)

Para traer solo campos específicos y optimizar memoria, con `find_one` la proyección va en el segundo hash. Con `find`, se utiliza `fields()`.

```perl
# Búsqueda de un único registro proyectando campos
my $topic = mdb->topic->find_one(
    { mid => '91728' },
    { _id => 0, _status_changes => 1 }
);

# Búsqueda de múltiples registros proyectando campos
my @bloqueados = mdb->topic->find({
    category_name        => 'Bloqueado',
    _created_by_parent   => $evo_mid
})->fields({ _id => 0, _status_changes => 1 })->all;
```

### Consultar transiciones de estado de un tópico

Usando el campo `_status_changes`:

```perl
my $topic = mdb->topic->find_one({ mid => '91995' });
my $status_old = $topic->{_status_changes}->{last_transition}->{from};
my $status_new = $topic->{_status_changes}->{last_transition}->{to};
```

## Consultas Complejas con Aggregation Pipeline

Es posible utilizar toda la potencia de MongoDB `aggregate` directo desde Perl para cruzar colecciones y agrupar datos (ej: traer roles por grupo de usuario):

```perl
my $roles_x_grupo = mdb->master_doc->aggregate([
    { '$match' => { collection => 'UserGroup' } },
    { '$project' => { realname => 1, name => 1, 'project_security' => 1, '_id' => 0 } },
    { '$unwind'  => '$project_security' },
    { '$lookup' => {
            from         => 'master_doc',
            localField   => 'project_security.mid',
            foreignField => 'mid',
            as           => 'ci'
        }
    },
    { '$unwind' => '$ci'},
    {   '$project' => {
            realname => 1,
            name     => 1,
            role     => '$project_security.id_role',
            project  => '$ci.name',
            type     => '$ci.collection'
        }
    },
    { '$lookup' => {
            from         => 'role',
            localField   => 'role',
            foreignField => 'id',
            as           => 'role_data'
        }
    },
    { '$unwind' => '$role_data'},
    { '$project' => { realname => 1, name => 1, role => '$role_data.role', project => 1 } }, 
    
    { '$group' => {
        '_id' => { 
            name => '$name',
            project => '$project'
        },
        'roles' => { '$push' => '$role' },
        'realname' => { '$first' => '$realname' }
    } },
    
    { '$project' => {
        _id => 0,
        name => '$_id.name',
        project => '$_id.project',
        realname => '$realname',
        roles => '$roles'
    }}
])->all;

use Data::Dumper;
print Dumper($roles_x_grupo);
```
