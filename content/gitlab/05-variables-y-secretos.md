---
title: "Variables y Secretos en GitLab CI: Predefinidas y Vault"
category: "gitlab"
tags: ["gitlab-ci", "variables", "secretos", "vault", "seguridad", "oidc"]
keywords: ["variables gitlab ci", "ci predefinidas gitlab", "masked variables gitlab", "protected variables gitlab", "secrets vault gitlab", "id_tokens oidc gitlab", "variables grupo proyecto gitlab"]
description: "Aprende a gestionar variables de entorno, secretos enmascarados, variables protegidas, integración OIDC con HashiCorp Vault y buenas prácticas de seguridad."
---

# Variables y Secretos en GitLab CI/CD

El manejo de variables y credenciales en GitLab CI/CD difiere notablemente del plugin *Credentials* de Jenkins. En GitLab existen variables predefinidas del sistema, variables jerárquicas definidas en la UI/API y mecanismos nativos para consumir secretos externos mediante **OIDC / JWT** sin almacenar contraseñas estáticas en el repositorio.

---

## Variables Predefinidas Más Utilizadas

GitLab inyecta automáticamente decenas de variables informativas en cada job. Las más frecuentes en tareas de compilación y despliegue son:

| Variable | Descripción / Ejemplo |
|---|---|
| `CI_COMMIT_SHA` | Hash completo de 40 caracteres del commit actual. |
| `CI_COMMIT_SHORT_SHA` | Hash corto (8 caracteres), ideal para etiquetar imágenes Docker (`v1.0.0-$CI_COMMIT_SHORT_SHA`). |
| `CI_COMMIT_BRANCH` | Nombre de la rama en ejecución (ej: `main`, `develop`). Vacío en tags o pipelines de MR. |
| `CI_COMMIT_TAG` | Nombre del tag Git si el pipeline fue disparado por un tag. |
| `CI_DEFAULT_BRANCH` | Rama por defecto del repositorio (generalmente `main`). |
| `CI_PIPELINE_SOURCE` | Origen del evento: `push`, `merge_request_event`, `schedule`, `web`, `trigger`. |
| `CI_PROJECT_NAME` | Nombre del proyecto actual (ej: `api-auth`). |
| `CI_PROJECT_PATH` | Ruta con namespaces (ej: `mi-grupo/backend/api-auth`). |
| `CI_REGISTRY_IMAGE` | Dirección completa del Container Registry para el proyecto (`registry.example.com/grupo/proyecto`). |
| `CI_JOB_TOKEN` | Token temporal efímero con los permisos del usuario que disparó el job. |

---

## Jerarquía y Precedencia de Variables

Cuando una variable tiene el mismo nombre en varios niveles, GitLab aplica este orden de precedencia (la primera sobrescribe a las siguientes):

1. **Variables disparadas manualmente (UI / API)** (`Run pipeline` con variables).
2. **Variables a nivel de Job** (definidas en el bloque `job: variables:` del YAML).
3. **Variables globales en el YAML** (definidas en `variables:` global).
4. **Variables de Proyecto** (definidas en **Settings > CI/CD > Variables** del proyecto).
5. **Variables de Subgrupo** (heredadas del subgrupo padre).
6. **Variables de Grupo Raíz** (heredadas de la organización).
7. **Variables de Instancia** (solo en Self-Managed).

---

## Tipos y Atributos de Seguridad de Variables

Al crear variables en **Settings > CI/CD > Variables**, contás con opciones críticas de seguridad:

### 1. Protect variable (`Protected`)
La variable **solo se inyecta** en pipelines que corren sobre ramas protegidas (como `main` o `release/*`) o tags protegidos. Evita que un desarrollador cree una rama arbitraria en un branch común para imprimir los secretos de producción.

### 2. Mask variable (`Masked`)
GitLab oculta automáticamente el valor de la variable en la consola de logs del job, reemplazándolo por `[MASKED]`.
> **Ojo:** Para poder ser enmascarada, la variable debe cumplir con un formato específico (mínimo 8 caracteres, sin espacios ni caracteres de escape complejos como nuevas líneas).

### 3. File type (`File`)
En lugar de exportar el valor como una variable de texto plana en el shell, GitLab escribe el contenido en un archivo temporal en disco y setea la variable con la ruta absoluta a dicho archivo (ej: `$KUBECONFIG` $ightarrow$ `/builds/grupo/repo.tmp/KUBECONFIG`).

---

## Integración con HashiCorp Vault vía OIDC (`id_tokens`)

El estándar moderno de seguridad en GitLab evita guardar tokens estáticos de larga duración. GitLab puede autenticarse contra Vault usando **JSON Web Tokens (JWT)** respaldados por OIDC:

```yaml
obtener_secreto_vault:
  stage: build
  image: hashicorp/vault:latest
  id_tokens:
    GITLAB_OIDC_TOKEN:
      aud: https://vault.example.com
  secrets:
    DATABASE_PASSWORD:
      vault: secret/data/production/db#password
      file: false
  script:
    - echo "La contraseña fue obtenida de forma segura sin credenciales estáticas"
    - ./deploy.sh --db-pass "$DATABASE_PASSWORD"
```

---

## Si Venís de Jenkins

| En Jenkins | En GitLab |
|---|---|
| `withCredentials([string(credentialsId: '...', variable: 'TOKEN')])` | Definir la variable en Settings > CI/CD y consumirla directo como `$TOKEN`. |
| `withCredentials([file(credentialsId: '...', variable: 'KUBE')])` | Crear la variable con tipo **File**; su valor es la ruta al archivo. |
| Plugin *HashiCorp Vault Plugin* con `vault:<path>#<key>` | Keyword nativa `secrets: { vault: ... }` e `id_tokens`. |

---

## Relacionado

- [/article/gitlab/04-rules-workflow-y-needs/](/article/gitlab/04-rules-workflow-y-needs/) — Uso de variables predefinidas en condiciones rules.
- [/article/gitlab/06-runners/](/article/gitlab/06-runners/) — Aislamiento y ejecución segura en runners.
- [/article/jenkins/05-credenciales-y-secretos/](/article/jenkins/05-credenciales-y-secretos/) — Gestión de credenciales y secretos en Jenkins.
