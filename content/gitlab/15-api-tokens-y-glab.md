---
title: "API, Tokens y glab CLI en GitLab: Automatización Total"
category: "gitlab"
tags: ["api", "glab", "cli", "tokens", "terraform", "automatizacion"]
keywords: ["gitlab api rest", "gitlab tokens tipos", "glab cli comandos", "personal access token gitlab", "project access token gitlab", "terraform provider gitlab", "disparar pipeline curl gitlab"]
description: "Automatización en GitLab: matriz completa de tokens de acceso, API REST con curl, administración desde la terminal con glab CLI y GitLab como código."
---

# API, Tokens y glab CLI en GitLab

Toda acción realizable en la interfaz web de GitLab puede automatizarse a través de su **API REST v4**, su cliente oficial de línea de comandos **`glab`** o mediante infraestructura como código con el proveedor de **Terraform**.

---

## Matriz de Tokens: ¿Cuál Usar en Cada Caso?

| Tipo de Token | Ámbito / Dónde se Crea | Caso de Uso Principal |
|---|---|---|
| **Personal Access Token (PAT)** | Perfil del usuario | Scripts personales, acceso temporal local del desarrollador. |
| **Project Access Token** | Settings del proyecto | Bots de proyecto, pipelines externos que interactúan con un solo repo. |
| **Group Access Token** | Settings del grupo | Gestión centralizada de múltiples proyectos o aprovisionamiento IaC. |
| **`CI_JOB_TOKEN`** | Automático en cada job | Acceso efímero a Container Registry, Package Registry o APIs del mismo repo. |
| **Deploy Token** | Settings > Repository | Clonar código o descargar imágenes desde servidores de staging sin consumir licencias de usuario. |
| **Trigger Token** | Settings > CI/CD > Triggers | Webhooks externos para disparar pipelines parametrizados. |

> **Ojo:** Por normativas de seguridad, todos los tokens personales y de proyecto en GitLab deben crearse obligatoriamente con una fecha límite de expiración.

---

## Automatización con la API REST (curl)

### 1. Disparar un Pipeline Manualmente con Variables:
```bash
curl --request POST      --header "PRIVATE-TOKEN: glpat-xxxxxxxxxxxx"      --form "ref=main"      --form "variables[ENVIRONMENT]=production"      --form "variables[DEPLOY_NOW]=true"      "https://gitlab.example.com/api/v4/projects/123/pipeline"
```

### 2. Descargar el Último Artefacto de un Job:
```bash
curl --location --header "PRIVATE-TOKEN: glpat-xxxxxxxxxxxx"      "https://gitlab.example.com/api/v4/projects/123/jobs/artifacts/main/download?job=compilar_frontend"      --output artifacts.zip
```

---

## Herramienta CLI Oficial: `glab`

`glab` es la herramienta de terminal oficial (análoga a `gh` de GitHub) para operar sin salir de la consola:

```bash
# 1. Autenticarse contra la instancia
glab auth login --hostname gitlab.example.com

# 2. Gestionar Merge Requests
glab mr create --title "feat: integración con auth service" --reviewer @alan-devops
glab mr view 45
glab mr approve 45
glab mr merge 45

# 3. Monitorear pipelines en tiempo real
glab ci status
glab ci view
glab ci trace # Muestra la salida de logs en vivo del job actual
glab ci run --branch main # Dispara un nuevo pipeline
```

---

## GitLab como Código con Terraform

Para gestionar grupos, proyectos, variables protegidas y membresías sin hacer clics en la interfaz:

```hcl
terraform {
  required_providers {
    gitlab = {
      source  = "gitlabhq/gitlab"
      version = "~> 16.0"
    }
  }
}

provider "gitlab" {
  base_url = "https://gitlab.example.com/api/v4/"
  token    = var.gitlab_admin_token
}

resource "gitlab_project" "nuevo_microservicio" {
  name                   = "billing-service"
  namespace_id           = gitlab_group.backend.id
  visibility_level       = "private"
  initialize_with_readme = true
}

resource "gitlab_project_variable" "artifactory_cred" {
  project   = gitlab_project.nuevo_microservicio.id
  key       = "ARTIFACTORY_TOKEN"
  value     = var.artifactory_secret
  protected = true
  masked    = true
}
```

---

## Si Venís de Jenkins

| En Jenkins | En GitLab |
|---|---|
| `jenkins-cli.jar` ejecutando comandos Java | `glab` CLI nativo en Go o llamadas a la API REST. |
| API REST con `curl -X POST http://jenkins/job/build` | `POST /api/v4/projects/:id/pipeline` con cabecera `PRIVATE-TOKEN`. |
| Plugins de configuración como código (*JCasC*) | Aprovisionamiento con el proveedor oficial de Terraform `gitlabhq/gitlab`. |

---

## Relacionado

- [/article/gitlab/05-variables-y-secretos/](/article/gitlab/05-variables-y-secretos/) — Manejo seguro de credenciales y variables.
- [/article/gitlab/11-merge-requests-y-flujo-git/](/article/gitlab/11-merge-requests-y-flujo-git/) — Creación y operación de Merge Requests.
- [/article/terraform/01-fundamentos/](/article/terraform/01-fundamentos/) — Infraestructura como código con Terraform.
