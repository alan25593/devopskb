---
title: "Cómo listar los archivos de un artefacto de una HU"
category: "clarive"
tags: ["clarive", "perl", "scripting", "artefactos", "historia de usuario"]
keywords: ["listar artefactos hu", "buscar revisión artefacto", "master_doc", "ArtifactRevision"]
description: "Script de Perl para listar los archivos físicos entregados en un artefacto de una Historia de Usuario (HU) en Clarive."
---

# Listar Artefactos de una Historia de Usuario en Clarive

El siguiente script en Perl permite obtener la ruta física y listar los archivos que se entregan como parte del artefacto de una Historia de Usuario (HU) en Clarive. Busca la revisión del artefacto en la colección `master_doc`, resuelve el repositorio padre y lista los archivos a nivel del sistema operativo.

## Script de Perl

```perl
# 1. Definís el MID de la historia
my $hu_mid = '220681'; 
my $hu_name = "HIS#$hu_mid";

# 2. Buscamos la revisión del artefacto en Mongo
my $artifact = mdb->collection('master_doc')->find_one({
    collection => 'ArtifactRevision',
    name       => $hu_name
});

die "No encontré la revisión del artefacto para $hu_name\n" unless $artifact;

# 3. Buscamos el repo padre para sacar el nombre de la carpeta (ej. Backend-Canales)
my $repo = mdb->collection('master_doc')->find_one({
    mid => $artifact->{repo}
});

die "No encontré el repositorio padre del artefacto\n" unless $repo;

# 4. Armamos la ruta física exacta
my $base_path = '/opt/clarive/artifacts';
my $full_path = "$base_path/" . $repo->{name} . "/" . $artifact->{name};

print "Ruta armada: $full_path\n";
print "--------------------------------------------------------\n";

# 5. Listamos los archivos directo del SO
if (-d $full_path) {
    my $files = `find "$full_path" -type f`;
    print $files ? $files : "La carpeta está vacía.\n";
} else {
    print "Ojo: El directorio físico no existe en el servidor.\n";
}
```

## Resultado Esperado

```text
Ruta armada: /opt/clarive/artifacts/Backend-Canales/HIS#220681
--------------------------------------------------------
/opt/clarive/artifacts/Backend-Canales/HIS#220681/canales/WEB-INF/classes/com/btcanales/apigateway.class
/opt/clarive/artifacts/Backend-Canales/HIS#220681/canales/WEB-INF/classes/com/btcanales/apigateway_RESTInterfaceIN.class
/opt/clarive/artifacts/Backend-Canales/HIS#220681/canales/WEB-INF/classes/com/btcanales/apigateway_RESTInterfaceOUT.class
/opt/clarive/artifacts/Backend-Canales/HIS#220681/canales/WEB-INF/classes/com/btcanales/apigateway_services_rest.class
...
/opt/clarive/artifacts/Backend-Canales/HIS#220681/sqlserver/script20260901113000.sql
/opt/clarive/artifacts/Backend-Canales/HIS#220681/sqlserver/Script_202604092026133000.sql
/opt/clarive/artifacts/Backend-Canales/HIS#220681/sqlserver/script20260904145000.sql
--- 1
```
