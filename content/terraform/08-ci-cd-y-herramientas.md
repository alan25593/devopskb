---
title: "Terraform en CI/CD: Workflow Seguro, tflint, checkov y Atlantis"
category: "terraform"
tags: ["ci-cd", "automatizacion", "tflint", "checkov", "atlantis", "github-actions"]
keywords: ["terraform ci cd", "terraform github actions", "plan automatico terraform", "atlantis terraform", "tflint", "checkov terraform", "validar terraform automaticamente", "pipeline terraform", "terraform apply automatico", "seguridad terraform ci", "tfsec", "terraform en pipeline", "pull request terraform plan"]
description: "Automatización del ciclo plan/apply en CI/CD, validación estática con tflint y checkov, y flujo GitOps con Atlantis para revisión de cambios en Pull Requests."
---

# Terraform en CI/CD

## Contenido

- [Workflow manual seguro (base)](#workflow-manual-seguro-base)
- [tflint — linter de buenas prácticas](#tflint-—-linter-de-buenas-prácticas)
- [checkov — análisis de seguridad y compliance](#checkov-—-análisis-de-seguridad-y-compliance)
- [tfsec — análisis de seguridad (alternativa a checkov)](#tfsec-—-análisis-de-seguridad-alternativa-a-checkov)
- [GitHub Actions — pipeline completo](#github-actions-—-pipeline-completo)
- [Atlantis — GitOps para Terraform](#atlantis-—-gitops-para-terraform)
- [Permisos IAM para el rol de CI](#permisos-iam-para-el-rol-de-ci)

---

## Workflow manual seguro (base)

```bash
terraform fmt -check -recursive    # falla si hay archivos sin formatear
terraform validate                 # valida sintaxis y referencias
terraform plan -out=tfplan         # genera y guarda el plan
# → revisión humana del plan
terraform apply tfplan             # aplica EXACTAMENTE ese plan
```

---

## tflint — linter de buenas prácticas

Detecta configuraciones incorrectas, tipos inválidos, recursos deprecados y convenciones.

```bash
# Instalar
brew install tflint

# Inicializar plugins (ej: plugin de AWS)
tflint --init

# Ejecutar en el directorio actual
tflint

# Ejecutar recursivamente
tflint --recursive

# Formato para CI (sin color)
tflint --format compact
```

Configuración `.tflint.hcl`:

```hcl
plugin "aws" {
  enabled = true
  version = "0.27.0"
  source  = "github.com/terraform-linters/tflint-ruleset-aws"
}

rule "terraform_required_version" {
  enabled = true
}

rule "terraform_naming_convention" {
  enabled = true
  format  = "snake_case"
}
```

---

## checkov — análisis de seguridad y compliance

Escanea código IaC buscando configuraciones inseguras (CIS Benchmarks, HIPAA, SOC2, etc.).

```bash
# Instalar
pip install checkov

# Escanear directorio
checkov -d .

# Solo checks de terraform
checkov -d . --framework terraform

# Ignorar checks específicos
checkov -d . --skip-check CKV_AWS_18,CKV_AWS_21

# Output en JSON para CI
checkov -d . -o json

# Fallar solo en CRITICAL y HIGH
checkov -d . --check-threshold HIGH
```

Ignorar un check puntual en el código:

```hcl
resource "aws_s3_bucket" "logs" {
  bucket = "mi-app-logs"

  #checkov:skip=CKV_AWS_18:Los logs no necesitan logging adicional
  #checkov:skip=CKV_AWS_21:Versioning deshabilitado intencionalmente para logs
}
```

---

## tfsec — análisis de seguridad (alternativa a checkov)

```bash
brew install tfsec

tfsec .
tfsec . --severity HIGH
tfsec . --format json --out tfsec-report.json
```

---

## GitHub Actions — pipeline completo

```yaml
# .github/workflows/terraform.yml
name: Terraform

on:
  pull_request:
    paths: ['infra/**']
  push:
    branches: [main]
    paths: ['infra/**']

env:
  TF_VERSION: "1.7.0"
  AWS_REGION: "us-east-1"

jobs:
  validate:
    name: Validate
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: infra/environments/prod

    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TF_VERSION }}

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::${{ secrets.AWS_ACCOUNT_ID }}:role/TerraformCIRole
          aws-region: ${{ env.AWS_REGION }}

      - name: terraform fmt
        run: terraform fmt -check -recursive

      - name: terraform init
        run: terraform init

      - name: terraform validate
        run: terraform validate

      - name: tflint
        uses: terraform-linters/setup-tflint@v4
        with:
          tflint_version: v0.50.0
      - run: tflint --init && tflint

      - name: checkov
        uses: bridgecrewio/checkov-action@v12
        with:
          directory: infra/
          framework: terraform
          skip_check: CKV_AWS_18

  plan:
    name: Plan
    runs-on: ubuntu-latest
    needs: validate
    if: github.event_name == 'pull_request'
    defaults:
      run:
        working-directory: infra/environments/prod

    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TF_VERSION }}

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::${{ secrets.AWS_ACCOUNT_ID }}:role/TerraformCIRole
          aws-region: ${{ env.AWS_REGION }}

      - name: terraform init
        run: terraform init

      - name: terraform plan
        id: plan
        run: terraform plan -no-color -out=tfplan 2>&1 | tee plan_output.txt
        continue-on-error: true

      - name: Post plan en PR
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const plan = fs.readFileSync('infra/environments/prod/plan_output.txt', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Terraform Plan\n\`\`\`\n${plan.slice(0, 65000)}\n\`\`\``
            });

  apply:
    name: Apply
    runs-on: ubuntu-latest
    needs: validate
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment: production    # requiere aprobación manual en GitHub
    defaults:
      run:
        working-directory: infra/environments/prod

    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TF_VERSION }}

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::${{ secrets.AWS_ACCOUNT_ID }}:role/TerraformCIRole
          aws-region: ${{ env.AWS_REGION }}

      - name: terraform init
        run: terraform init

      - name: terraform apply
        run: terraform apply -auto-approve
```

---

## Atlantis — GitOps para Terraform

Atlantis corre como servidor y reacciona a comentarios en Pull Requests para ejecutar plan/apply directamente en el repo.

```yaml
# atlantis.yaml
version: 3
automerge: false
projects:
  - name: prod
    dir: infra/environments/prod
    workspace: default
    autoplan:
      when_modified: ["**/*.tf", "../../modules/**/*.tf"]
      enabled: true
    apply_requirements:
      - approved          # requiere aprobación de PR
      - mergeable         # requiere que el PR pueda mergearse
```

Comandos en comentarios del PR:

```
atlantis plan              → corre terraform plan
atlantis apply             → corre terraform apply (requiere aprobación)
atlantis plan -- -target=aws_instance.web
atlantis unlock            → libera el lock del workspace
```

---

## Permisos IAM para el rol de CI

```hcl
# Política mínima para que el rol de CI pueda asumir roles por entorno
data "aws_iam_policy_document" "ci_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    resources = [
      "arn:aws:iam::${var.dev_account_id}:role/TerraformRole",
      "arn:aws:iam::${var.prod_account_id}:role/TerraformRole",
    ]
  }
}

# En cada cuenta, el TerraformRole permite al CI asumir
data "aws_iam_policy_document" "terraform_role_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [var.github_oidc_provider_arn]
    }
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:mi-org/infra:*"]
    }
  }
}
```
