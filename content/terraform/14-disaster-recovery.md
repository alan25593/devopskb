---
title: "Disaster Recovery del State en S3"
category: "Terraform"
tags: ["terraform", "dr", "backup", "s3"]
description: "Cómo prepararse para el desastre: versionado de S3 y estrategias de recuperación para el state."
---

¡Qué onda! Imagínate esto: un compa borró accidentalmente el bucket donde guardabas tu `terraform.tfstate` o peor, corrió un apply que destruyó cosas y el state se actualizó. Entras en pánico, ¿no? Bueno, para eso armamos un plan de Disaster Recovery (DR).

### La regla de oro: S3 Versioning

Si usas S3 como backend, **el versionado de objetos debe estar encendido SÍ O SÍ**. Esto significa que cada vez que Terraform actualiza el state, S3 guarda la versión anterior en lugar de sobrescribirla por completo.

Si alguien la caga, simplemente puedes ir a la consola de AWS (o usar el CLI), descargar la versión anterior del state file que funcionaba, y volverla a subir o usarla para recuperarte.

```bash
# Para ver las versiones de tu archivo de state
aws s3api list-object-versions --bucket mi-bucket-tfstate --prefix prod/terraform.tfstate

# Y luego puedes descargar la versión específica que necesitas
aws s3api get-object --bucket mi-bucket-tfstate --key prod/terraform.tfstate --version-id "id-de-la-version-buena" tfstate-recuperado.json
```

### Prevenir borrados accidentales (MFA Delete)

Para evitar que alguien borre el bucket entero, activa **MFA Delete**. Esto requiere que uses un token de hardware o app (MFA) para poder borrar objetos o cambiar la configuración de versionado.

También puedes usar **Bucket Policies** para que nadie, ni siquiera el root, pueda borrar el bucket del state:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:DeleteBucket",
      "Resource": "arn:aws:s3:::mi-bucket-tfstate"
    }
  ]
}
```

### Backup Cross-Region

Para los súper paranoicos (y me incluyo), deberías configurar S3 Cross-Region Replication (CRR). Esto copia automáticamente cada versión nueva de tu state a otro bucket en una región diferente (ej. de `us-east-1` a `us-west-2`).

Si la región principal de AWS se cae por completo, tú sigues teniendo acceso a tu estado de Terraform en la otra región.

¡Prepárate para lo peor y nunca vas a sudar frío cuando las cosas fallen!
