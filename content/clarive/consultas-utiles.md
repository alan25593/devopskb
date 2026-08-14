---
title: "Consultas Útiles y Búsquedas (Perl/MongoDB)"
category: "clarive"
tags: ["clarive", "perl", "mongodb", "busquedas", "ejemplos"]
keywords: ["ejemplos clarive", "busquedas clarive", "mongodb", "usuarios", "roles", "soportes", "query"]
description: "Colección de scripts y consultas útiles en Perl y MongoDB para administrar usuarios, roles, tópicos y grupos en Clarive."
---

# Consultas Útiles y Búsquedas en Clarive

A continuación, se documentan distintos ejemplos de consultas y scripts útiles para ejecutar en el entorno REPL de Clarive. Estas búsquedas abarcan desde la gestión de usuarios y roles hasta el filtrado avanzado de tópicos.

## Administración de Usuarios

### Búsqueda de Usuarios por Email
Permite validar si un listado de correos electrónicos existe en el sistema y devuelve sus nombres de usuario, o reporta cuáles no se encontraron.

```perl
my @emails = (
    'gabriel.martinez@bancoformosa.com.ar', 'Yolanda.Gonzalez@bancoformosa.com.ar', 'YesicaCarolina.Espinoza@bancoformosa.com.ar'
);

print "--- Inicio de búsqueda ---\n";

foreach my $mail (@emails) {
    $mail =~ s/^\s+|\s+$//g;
    next if $mail eq '';
    my $user = ci->user->find_one({ email => qr/^$mail$/i });

    if ($user) {
        my $username = $user->{name};
        print "Mail: $mail -> Username: $username \n";
    } else {
        print "ERROR: No se encontró el mail: $mail\n";
    }
}

print "--- Proceso finalizado ---\n";

my @found_usernames;
my @errors;

foreach my $mail (@emails) {
    $mail =~ s/^\s+|\s+$//g;
    next if $mail eq '';
    my $user = ci->user->find_one({ email => qr/^$mail$/i });
    if ($user && $user->{name}) {
        push @found_usernames, "'" . $user->{name} . "'";
    } else {
        push @errors, $mail;
    }
}

print "\n--- ARRAY USERS ---\n";
print "my \@usernames = (" . join(', ', @found_usernames) . ");";
print "\n--- FIN DEL ARRAY ---\n";

if (@errors) {
    print "\n--- MAILS NO ENCONTRADOS (" . scalar @errors . ") ---\n";
    print join("\n", @errors) . "\n";
}
```

### Usuarios miembros de un grupo
Devuelve todos los MIDs de los usuarios que pertenecen a un UserGroup específico, útil para consultas posteriores (`$in`).

```perl
my @referentes = map { $_->mid } ci->new('cla-default-UserGroup-228')->users;
my $referentes_joined = join('","', @referentes);
$referentes_joined;
```

## Administración de Roles y Grupos

### Grupos de usuarios con un rol específico
Cruza la colección de UserGroups con los roles para encontrar qué grupos tienen asignado el rol buscado.

```perl
my $role = 'Creador de aprobaciones';

grep { $_->{role} eq $role } mdb->master_doc->aggregate([
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
    { '$project' => { group => '$name', role => '$role_data.role', scope => '$project' } },
])->all;
```

### Grupos de usuario por proyecto
Obtiene un listado de todos los grupos de usuarios que están vinculados a un proyecto en particular.

```perl
my $project_name = 'ARQUITECTURA SISTEMAS';

my @grupos = mdb->master_doc->aggregate([
    { '$match' => { collection => 'UserGroup' } },
    { '$project' => { name => 1, 'project_security' => 1, '_id' => 0 } },
    { '$unwind'  => '$project_security' },
    { '$lookup' => {
            from         => 'master_doc',
            localField   => 'project_security.mid',
            foreignField => 'mid',
            as           => 'ci'
        }
    },
    { '$unwind' => '$ci'},
    
    # Filtramos solo por el proyecto
    { '$match' => { 'ci.name' => $project_name } },
    
    # Agrupamos por nombre de grupo para evitar duplicados
    { '$group' => { _id => '$name', scope => { '$first' => '$ci.name' } } },
    
    # Dejamos lindo el formato final
    { '$project' => { group => '$_id', scope => 1, _id => 0 } }
])->all;
```

### Roles con permiso CI Admin
Busca y lista qué roles poseen la acción `action.ci.admin`.

```perl
my @roles_admin = map { $_->{role} } mdb->role->find({
    actions => {
        '$elemMatch' => {
            action => 'action.ci.admin'
        }
    }
})->all;
```

### Roles con permisos de denegación (deny)
Busca roles que tengan explícitamente configurado un bloqueo (`_deny = 1`) para una determinada acción, en este caso escritura de campos de tópico.

```perl
map { $_->{role} } mdb->role->find({
    actions => {
        '$elemMatch' => {
            action => 'action.topicsfield.write',
            bounds => {
                '$elemMatch' => {
                    '_deny' => 1
                }
            }
        }
    }
})->all;
```

### Roles por grupo de usuario
Consulta qué roles tiene asignado un grupo de usuarios en los distintos proyectos.

```perl
my $group = 'Desarrolladores';

mdb->master_doc->aggregate([
    { '$match' => { collection => 'UserGroup', name => $group } },
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
])->all;
```

## Búsquedas en Tópicos

### Búsqueda de tópicos por título
Realiza un filtrado mediante expresiones regulares sobre el campo `title`.

```perl
# Primero hacer el conteo total de tickets
my $total = mdb->topic->find({
        category_name => 'Soporte',
        title         => qr/^-/
    })->count;

# Después traés los datos (proyectando para aligerar la memoria)
my @topicos = mdb->topic->find({
        category_name => 'Soporte',
        title         => qr/^-/
    })->fields({_id => 0, mid => 1, title => 1})->all;
```

### Filtro de soportes por estado (Pipeline avanzado)
Encuentra tópicos de la categoría "Soporte" que estén en un estado particular (`status-79`) y tengan vinculadas aprobaciones que se encuentren en otro estado específico (`status-19`), proyectando el timestamp de la transición de estado.

```perl
my $pipeline = [
  {
    '$match' => {
      'category_name'         => 'Soporte',
      'category_status_id'   => 'status-79' # Ajusta esta condición
    }
  },
  {
    '$lookup' => {
      'from' => 'master_rel',
      'let'  => { 'hu_mid' => '$mid' },
      'pipeline' => [
        {
          '$match' => {
            '$expr' => {
              '$and' => [
                { '$eq' => ['$from_mid', '$$hu_mid'] },
                { '$eq' => ['$rel_field', 'aprobaciones'] }
              ]
            }
          }
        },
        {
          '$lookup' => {
            'from' => 'topic',
            'let'  => { 'approval_mid' => '$to_mid' },
            'pipeline' => [
              {
                '$match' => {
                  '$expr' => {
                    '$and' => [
                      { '$eq' => ['$mid', '$$approval_mid'] },
                      { '$eq' => ['$category_status_id', 'status-19'] } # Estado deseado de la aprobación
                    ]
                  }
                }
              },
              {
                # Aquí proyectamos el mid, nombre e id de estado, así como el campo de la transición
                '$project' => {
                  '_id' => 0,
                  'mid' => '$mid',
                  'category_status_name' => '$category_status_name',
                  'category_status_id' => '$category_status_id',
                  'ts' => '$_status_changes.last_transition.ts' # Campo especificado para el timestamp
                }
              }
            ],
            'as' => 'approval_details'
          }
        },
        { '$match' => { 'approval_details' => { '$ne' => [] } } } # Filtrar por aprobaciones en estado específico
      ],
      'as' => 'hu_to_approval_chain'
    }
  },
  {
    '$match' => {
      'hu_to_approval_chain' => { '$ne' => [] }
    }
  },
  {
    '$project' => {
      '_id' => 0,
      'mid' => '$mid',
      'category_status_name' => '$category_status_name',
      'category_status_id' => '$category_status_id',
      'aprobaciones' => {
        '$reduce' => {
          input => '$hu_to_approval_chain.approval_details',
          initialValue => [],
          in => { '$concatArrays' => ['$$value', '$$this'] }
        }
      }
    }
  }
];

# Ejecuta el pipeline
my @rs = mdb->topic->aggregate($pipeline)->all;
```
