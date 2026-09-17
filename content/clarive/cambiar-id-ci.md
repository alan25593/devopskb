---
title: "Cómo cambiar el ID de un CI"
category: "clarive"
tags: ["clarive", "mongodb", "ci", "perl", "troubleshooting"]
keywords: ["cambiar id de un ci", "modificar mid clarive", "update_one master_doc", "bftaxonomiagob"]
description: "Guía rápida para cambiar el ID (mid) de un CI en la base de datos de Clarive utilizando la colección master_doc."
---

# Cambiar el ID de un CI en Clarive

En ciertas ocasiones, puede ser necesario modificar el ID (`mid`) de un CI directamente en la base de datos de Clarive (por ejemplo, para corregir un prefijo erróneo como `cla-default-`).

Para hacerlo, se puede ejecutar el siguiente fragmento de código (en un script de Perl o en el REPL de Clarive conectado a MongoDB), el cual actualiza el documento en la colección `master_doc`:

```perl
mdb->collection('master_doc')->update_one(
    { mid => 'cla-default-BFTaxonomiaGOB-12' },
    { '$set' => { 
        mid  => 'BFTaxonomiaGOB-12',
        _uid => '' 
    } }
);
```

## Consideraciones
- **Colección**: Se utiliza `master_doc` que es donde se almacenan los CIs.
- **`_uid`**: Al actualizar, puede ser necesario resetear el campo `_uid` (si aplica al esquema) para forzar la regeneración de ciertas referencias o evitar conflictos, o simplemente dejarlo vacío si así lo requiere la lógica del negocio.
- **Reinicio**: Dependiendo de si la caché de Clarive ya había cargado el CI antiguo, puede ser necesario reiniciar el dispatcher o el servicio web para reflejar completamente el cambio.
