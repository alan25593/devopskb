---
title: "Testing Nativo en Terraform"
category: "Terraform"
tags: ["terraform", "testing", "qa"]
description: "Cómo usar terraform test para validar tus módulos antes de romper producción."
---

¡Qué tal! Históricamente testear Terraform era medio engorroso. Tenías que usar herramientas de terceros como Terratest o InSpec. Pero desde la versión 1.6, HashiCorp nos regaló el comando `terraform test`. ¡Es nativo y súper fácil de usar!

### ¿Por qué testear?

Porque todos cometemos errores, bro. Especialmente cuando haces módulos reutilizables. Un test te asegura que si le pasas X variables, se crea Y recurso con las configuraciones correctas.

### ¿Cómo funciona?

Creas archivos con extensión `.tftest.hcl` en tu repositorio. Terraform va a leer estos archivos, levantar la infra en memoria (o en real si quieres) y verificar que se cumplan las condiciones.

### Un ejemplo práctico

Imagina que tienes un módulo que crea un bucket S3. Quieres asegurarte de que el nombre siempre empiece con un prefijo específico.

En tu archivo `tests/s3_bucket.tftest.hcl`:

```hcl
# Configuramos el provider, usualmente usando credenciales dummy para validación de plan
provider "aws" {
  region = "us-east-1"
}

variables {
  bucket_name = "prod-imagenes-app"
  environment = "production"
}

run "validar_nombre_bucket" {
  command = plan # Solo hacemos plan, no creamos recursos reales

  assert {
    condition     = startswith(aws_s3_bucket.main.bucket, "prod-")
    error_message = "El nombre del bucket debe empezar con 'prod-'. Revisa tus variables."
  }
}
```

Para correrlo, simplemente ejecutas:
```bash
terraform test
```

Si todo está bien, te va a salir un mensaje verde hermoso. Si no, te tira el error. Es ideal para que lo corras en tus pipelines y duermas tranquilo sabiendo que tus módulos son a prueba de balas.
