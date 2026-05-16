---
title: "Terraform Data Sources: Leer Infraestructura Existente"
category: "terraform"
tags: ["data-sources", "remote-state", "ssm", "secretsmanager"]
keywords: ["data source terraform", "leer recurso existente terraform", "terraform remote state", "ssm parameter terraform", "secrets manager terraform", "data aws", "buscar ami terraform", "data source vpc", "terraform_remote_state", "leer output otro state", "compartir datos entre states"]
description: "Uso de data sources para leer recursos existentes, consumir outputs de otros states con terraform_remote_state y obtener secrets desde SSM y Secrets Manager."
---

# Terraform Data Sources

## Contenido

- [Data sources de AWS más usados](#data-sources-de-aws-más-usados)
- [Secrets desde AWS SSM Parameter Store](#secrets-desde-aws-ssm-parameter-store)
- [Secrets desde AWS Secrets Manager](#secrets-desde-aws-secrets-manager)
- [terraform_remote_state — compartir outputs entre states](#terraform_remote_state-—-compartir-outputs-entre-states)
- [Renderizar templates](#renderizar-templates)
- [Esperar a que un recurso externo esté listo](#esperar-a-que-un-recurso-externo-esté-listo)

---

Los data sources leen información de recursos **ya existentes** (creados manualmente, por otro módulo, o por otra herramienta) sin crear nada nuevo.

```hcl
# Sintaxis: data "tipo" "nombre_local" { filtros }
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]   # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-*-22.04-amd64-server-*"]
  }
}

# Usar el dato leído
resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"
}
```

---

## Data sources de AWS más usados

```hcl
# Cuenta y región actuales
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

output "account_id" {
  value = data.aws_caller_identity.current.account_id
}

# VPC por nombre o tags
data "aws_vpc" "prod" {
  filter {
    name   = "tag:Environment"
    values = ["prod"]
  }
}

# Subnets dentro de un VPC
data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.prod.id]
  }
  filter {
    name   = "tag:Tier"
    values = ["private"]
  }
}

# Security group
data "aws_security_group" "app" {
  name   = "app-sg"
  vpc_id = data.aws_vpc.prod.id
}

# Hosted zone de Route53
data "aws_route53_zone" "domain" {
  name         = "empresa.com."
  private_zone = false
}

# Certificate Manager
data "aws_acm_certificate" "ssl" {
  domain   = "*.empresa.com"
  statuses = ["ISSUED"]
}

# IAM policy document
data "aws_iam_policy_document" "s3_access" {
  statement {
    effect  = "Allow"
    actions = ["s3:GetObject", "s3:PutObject"]
    resources = ["${aws_s3_bucket.assets.arn}/*"]
  }
}
```

---

## Secrets desde AWS SSM Parameter Store

```hcl
# Parámetro simple
data "aws_ssm_parameter" "db_host" {
  name = "/prod/database/host"
}

# SecureString (encriptado)
data "aws_ssm_parameter" "db_password" {
  name            = "/prod/database/password"
  with_decryption = true
}

resource "aws_db_instance" "main" {
  # ...
  address  = data.aws_ssm_parameter.db_host.value
  password = data.aws_ssm_parameter.db_password.value
}
```

---

## Secrets desde AWS Secrets Manager

```hcl
data "aws_secretsmanager_secret" "app_secrets" {
  name = "prod/mi-app/secrets"
}

data "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = data.aws_secretsmanager_secret.app_secrets.id
}

locals {
  secrets = jsondecode(data.aws_secretsmanager_secret_version.app_secrets.secret_string)
}

resource "aws_ecs_task_definition" "app" {
  # ...
  container_definitions = jsonencode([{
    environment = [
      { name = "DB_PASSWORD", value = local.secrets["db_password"] },
      { name = "API_KEY",     value = local.secrets["api_key"] },
    ]
  }])
}
```

---

## terraform_remote_state — compartir outputs entre states

Permite que un state lea outputs de otro state. Útil para separar infra base (VPC, subnets) de infra de aplicación.

```hcl
# State de infra base expone estos outputs:
# outputs.tf en environments/prod/base/
output "vpc_id"             { value = module.networking.vpc_id }
output "private_subnet_ids" { value = module.networking.private_subnet_ids }
```

```hcl
# State de app lee los outputs del state de base
# environments/prod/app/main.tf
data "terraform_remote_state" "base" {
  backend = "s3"
  config = {
    bucket = "mi-empresa-tfstate"
    key    = "environments/prod/base/main.tfstate"
    region = "us-east-1"
  }
}

resource "aws_eks_cluster" "main" {
  name     = "prod-cluster"
  role_arn = aws_iam_role.eks.arn

  vpc_config {
    subnet_ids = data.terraform_remote_state.base.outputs.private_subnet_ids
  }
}
```

---

## Renderizar templates

```hcl
# user_data para EC2
data "cloudinit_config" "web" {
  gzip          = true
  base64_encode = true

  part {
    content_type = "text/x-shellscript"
    content      = templatefile("${path.module}/scripts/init.sh", {
      db_host     = aws_db_instance.main.address
      app_version = var.app_version
    })
  }
}

# Archivo de configuración con variables
data "template_file" "nginx_config" {
  template = file("${path.module}/templates/nginx.conf.tpl")
  vars = {
    server_name = var.domain_name
    upstream    = aws_lb.app.dns_name
  }
}
```

---

## Esperar a que un recurso externo esté listo

```hcl
# Leer una instancia RDS creada fuera de Terraform
data "aws_db_instance" "existing" {
  db_instance_identifier = "prod-database"
}

# Usar sus atributos como si fuera un recurso propio
resource "aws_ssm_parameter" "db_endpoint" {
  name  = "/prod/db/endpoint"
  type  = "String"
  value = data.aws_db_instance.existing.endpoint
}
```
