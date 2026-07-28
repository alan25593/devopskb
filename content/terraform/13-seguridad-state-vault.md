---
title: "Seguridad del State y Rotación con Vault"
category: "Terraform"
tags: ["terraform", "vault", "security", "state"]
description: "Protegiendo el state file y gestionando credenciales dinámicas con HashiCorp Vault."
---

¡Hola! Hablemos de algo súper crítico: el archivo `terraform.tfstate`. Ese archivo es oro puro porque tiene TODO sobre tu infra, incluyendo contraseñas, IPs y tokens en texto plano. Si alguien se lo roba, estás frito.

### ¿Cómo lo protegemos?

Primero, ¡nunca lo subas a Git! Usa siempre un backend remoto seguro, como S3 con encriptación habilitada y DynamoDB para el lock.

```hcl
terraform {
  backend "s3" {
    bucket         = "mi-bucket-seguro-tfstate"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-lock"
  }
}
```

### Inyectando credenciales con Vault

Otro problema común es hardcodear las credenciales de AWS o DBs para que Terraform corra. Eso es un no rotundo. La mejor práctica es usar **HashiCorp Vault** para generar credenciales temporales.

Vault se conecta a AWS y genera un Access Key y Secret Key que duran solo el tiempo que dura tu pipeline.

1. **Configuras Vault** para que hable con AWS.
2. **Tu pipeline se autentica** con Vault (usando AppRole o JWT).
3. **Vault le da las credenciales temporales** a tu pipeline.
4. **Terraform corre** y usa esas credenciales.
5. Cuando termina, las credenciales expiran solas.

**Ejemplo de cómo obtener la credencial en bash antes de correr TF:**

```bash
# Asumiendo que ya estás autenticado en Vault
export VAULT_TOKEN="s.tu-token-seguro"

# Le pedimos a Vault las credenciales de AWS
AWS_CREDS=$(vault read -format=json aws/creds/terraform-role)

export AWS_ACCESS_KEY_ID=$(echo $AWS_CREDS | jq -r .data.access_key)
export AWS_SECRET_ACCESS_KEY=$(echo $AWS_CREDS | jq -r .data.secret_key)

# Ahora sí, a correr Terraform de forma segura
terraform plan
```

Así te aseguras de que nadie tiene credenciales permanentes de admin dando vueltas por ahí. ¡Pura seguridad!
