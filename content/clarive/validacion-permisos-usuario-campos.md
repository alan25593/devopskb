---
title: "Validación de Permisos de Usuario sobre Campos"
category: "clarive"
tags: ["clarive", "perl", "permisos", "roles", "usuarios", "campos", "seguridad"]
keywords: ["permisos clarive", "action.topicsfield.write", "roles clarive", "usergroup clarive", "validar permisos usuario", "project_security"]
description: "Script Perl y guía para verificar si un usuario tiene permisos de escritura sobre un campo en una categoría y estado específicos de Clarive, identificando los grupos y roles que lo otorgan."
---

# Validación de Permisos de Usuario sobre Campos (Perl / MongoDB)

En Clarive, la seguridad granular sobre los campos de un tópico (`topicsfield`) depende de la interacción entre:
1. **Roles y Acciones (`mdb.role`)**: Definición de la acción de edición (`action.topicsfield.write`) restringida por límites (*bounds*), como el estado (`id_status`), la categoría (`id_category`) y el campo (`id_field`).
2. **Grupos de Usuarios (`UserGroup`)**: Colección de documentos donde se asignan roles de seguridad (`project_security.id_role`).
3. **Pertenencia de Usuarios**: Integración de los usuarios dentro de uno o varios grupos (`ci->new($grupo->{mid})->users`).

Este script en Perl permite verificar de forma rápida e iterativa si un usuario posee permisos de escritura sobre un campo específico en un estado y categoría determinados, devolviendo el desglose detallado de los **grupos y roles** (incluyendo sus identificadores MIDs / IDs) mediante los cuales obtiene la autorización.

---

## Script Perl de Consulta

```perl
my $username      = 'franky';
my $name_category = 'Soporte';
my $id_field      = 'valoracion_de_tipificacion';
my $name_status   = 'Pendiente Sistemas';

# 0. Obtener IDs correspondientes al estado y categoría
my $id_status   = ci->status->find_one({ name => $name_status })->{mid};
my $id_category = mdb->category->find_one({ name => $name_category })->{id};

# 1. Guardamos ID y Nombre de los roles permitidos
my %roles_permitidos = map { $_->{id} => $_->{role} } mdb->role->find({ 
    actions => { '$elemMatch' => { 
        action => 'action.topicsfield.write', 
        bounds => { '$elemMatch' => { id_status => $id_status, id_category => $id_category, id_field => $id_field } }
    }}
})->all;

my @roles_permitidos_ids = keys %roles_permitidos;

# 2. Traemos los grupos que tienen alguno de esos roles
my @grupos = mdb->master_doc->find({
    collection => 'UserGroup',
    'project_security.id_role' => { '$in' => \@roles_permitidos_ids }
})->all;

# 3. Validamos al usuario y extraemos los roles matcheados
my @detalles;

foreach my $grupo (@grupos) {
    my @users_en_grupo = map { $_->username } ci->new($grupo->{mid})->users;
    
    if (grep { $_ eq $username } @users_en_grupo) {
        my %roles_del_grupo;
        
        my $ps = $grupo->{project_security} || [];
        my @seguridades = ref($ps) eq 'ARRAY' ? @$ps : ($ps);
        
        foreach my $sec (@seguridades) {
            my $id_rol = $sec->{id_role};
            if (exists $roles_permitidos{$id_rol}) {
                my $nombre_rol = $roles_permitidos{$id_rol};
                # Usamos Nombre - ID como clave para evitar duplicados en pantalla
                $roles_del_grupo{"$nombre_rol - $id_rol"} = 1;
            }
        }
        
        if (%roles_del_grupo) {
            # Armamos el string del grupo y abajo la lista de roles
            my $texto_grupo = "$grupo->{name} - $grupo->{mid} :\n" . 
                              join("\n", map { "       - Role: $_" } sort keys %roles_del_grupo);
            push @detalles, $texto_grupo;
        }
    }
}

# 4. Imprimimos el resultado
print @detalles ? "$username TIENE permisos por:\n • " . join("\n • ", @detalles) . "\n" : "$username NO tiene permisos.\n";
```

---

## Explicación Detallada del Proceso

### 1. Resolución de Identificadores (MIDs / IDs)
Clarive utiliza identificadores internos para referenciar estados y categorías en la base de datos:
* `ci->status->find_one({ name => $name_status })->{mid}`: Encuentra el identificador interno (`mid`) del estado a partir de su nombre visible (ej. *'Pendiente Sistemas'*).
* `mdb->category->find_one({ name => $name_category })->{id}`: Obtiene el ID numérico o alfanumérico de la categoría (ej. *'Soporte'*).

### 2. Identificación de Roles Autorizados (`mdb.role`)
El script busca en la colección `role` los roles que concedan la acción `action.topicsfield.write`.
Utiliza el operador `$elemMatch` de MongoDB para asegurar la coincidencia exacta de los tres límites (*bounds*):
* `id_status`: El estado del tópico.
* `id_category`: La categoría del tópico.
* `id_field`: El identificador del campo personalizado o estándar (ej. *'valoracion_de_tipificacion'*).

Los pares `id => role` se mapean directamente en el hash `%roles_permitidos`.

### 3. Búsqueda de Grupos de Usuarios (`UserGroup`)
A continuación, consulta la colección `master_doc` filtrando por la colección `'UserGroup'`.
Busca aquellos grupos que posean asignado en `project_security.id_role` al menos uno de los IDs de los roles válidos (`$in`).

### 4. Verificación de Pertenencia del Usuario y Desglose
Para cada grupo devuelto por la consulta:
1. Obtiene la lista de nombres de usuario integrantes utilizando la API de Clarive (`ci->new($grupo->{mid})->users`).
2. Verifica si el usuario especificado (`$username`) forma parte del grupo (`grep`).
3. Si el usuario pertenece al grupo, itera la estructura `project_security` del grupo asociando el nombre del rol con su ID (`Nombre - ID`) para evitar duplicados en la visualización.
4. Concatena el nombre del grupo con su `mid` y lista subordinada de roles en `@detalles`.

### 5. Salida del Script
* **Si el usuario posee permisos**: Muestra un resumen formateado con el detalle de cada grupo y sus roles asociados:
  ```text
  franky TIENE permisos por:
   • SCyA Canales - UserGroup-159 :
         - Role: CM_Soporte - 190
   • SCyA Rec y Pagos - UserGroup-165 :
         - Role: CM_Soporte - 190
   • CM_Líder Colaborativo - UserGroup-197 :
         - Role: CM_Líder Colaborativo - 189
   • CM_Soporte - UserGroup-198 :
         - Role: CM_Soporte - 190
   • SCyA Contabilidad y Clientes - cla-default-UserGroup-221 :
         - Role: CM_Soporte - 190
   • SCyA Productos - cla-default-UserGroup-222 :
         - Role: CM_Soporte - 190
   • SCyA Contabilidad y Clientes - Evolutivo - cla-default-UserGroup-233 :
         - Role: CM_Soporte - 190
  ```
* **Si no posee permisos**:
  ```text
  franky NO tiene permisos.
  ```

---

## Casos de Uso y Aplicaciones

* **Auditoría de Accesos**: Diagnosticar y auditar permisos de edición sobre campos sensibles en flujos de trabajo de Clarive.
* **Resolución de Incidencias (Troubleshooting)**: Identificar la causa cuando un usuario no puede modificar un campo determinado en la interfaz.
* **Verificación Previa a Modificaciones**: Validar el impacto de añadir o remover roles en grupos de usuarios de proyecto.

---

## Variantes y Adaptaciones

### Permisos de Lectura (`action.topicsfield.read`)
Para comprobar permisos de visualización o lectura en lugar de escritura, únicamente debe modificarse el parámetro de la acción en la consulta a la colección `role`:
```perl
action => 'action.topicsfield.read'
```
