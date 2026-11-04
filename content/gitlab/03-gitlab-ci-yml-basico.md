---
title: "GitLab CI YAML: Anatomía, Stages, Scripts y Jobs"
category: "gitlab"
tags: ["gitlab-ci", "yaml", "stages", "jobs", "script", "artifacts"]
keywords: ["gitlab ci yml basico", "estructura gitlab ci", "stages gitlab", "before_script after_script", "image services gitlab", "default keywords gitlab", "jobs ocultos gitlab", "ci lint gitlab"]
description: "Aprende la anatomía completa del archivo .gitlab-ci.yml: stages, jobs, scripts, servicios, jobs ocultos, directivas globales y validación con CI Lint."
---

# GitLab CI YAML: Anatomía y Estructura Básica

El archivo `.gitlab-ci.yml` debe ubicarse en la raíz de tu repositorio Git. Es el punto de entrada que el motor de GitLab evalúa ante cada evento (`push`, `merge_request`, `tag`, etc.).

---

## Anatomía General de un Pipeline

```yaml
# 1. Definición global de etapas en orden de ejecución
stages:
  - build
  - test
  - package
  - deploy

# 2. Configuración por defecto para todos los jobs (opcional)
default:
  image: node:20-alpine
  tags:
    - docker
  before_script:
    - echo "Iniciando ejecución de job en $(date)"

# 3. Variables de entorno globales
variables:
  APP_ENV: "testing"

# 4. Jobs individuales
compilar_app:
  stage: build
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/

ejecutar_tests:
  stage: test
  script:
    - npm test
  after_script:
    - echo "Finalizó ejecución de tests"
```

---

## Bloques y Palabras Clave Fundamentales

### `stages`
Define la secuencia ordenada de ejecución. Por defecto, si no se declara, GitLab asume `build`, `test` y `deploy`.
- Los jobs pertenecientes al mismo `stage` se ejecutan **en paralelo** (siempre que existan runners disponibles).
- Si cualquier job de un stage falla, el pipeline se detiene y no avanza al siguiente stage (a menos que tenga configurado `allow_failure: true`).

### `script`
El corazón de cada job. Es una lista de comandos shell (Bash, sh o PowerShell según el runner) ejecutados secuencialmente. Si algún comando devuelve un código de salida distinto de `0`, el job falla de inmediato.

### `before_script` y `after_script`
- `before_script`: Comandos que corren antes del `script` principal (por ejemplo: instalar paquetes del sistema, iniciar sesión en una base de datos o setear variables dinámicas).
- `after_script`: Comandos que corren **siempre**, incluso si el `script` principal falló (ideal para recolectar logs de debug o limpiar recursos temporales).

> **Ojo:** `after_script` se ejecuta en un subshell separado. Las variables exportadas en `before_script` o `script` no persisten en él.

### `image` y `services`
- `image`: Define la imagen Docker donde se ejecuta el contenedor del job.
- `services`: Contenedores secundarios vinculados por red al job (por ejemplo, una base de datos PostgreSQL, Redis o un demonio Docker-in-Docker `docker:dind`). Se comunican usando el hostname del servicio (ej: `postgres`).

---

## Jobs Ocultos y Reutilización Básica

Cualquier job cuyo nombre comience con un punto (`.`) es ignorado por el motor de ejecución de GitLab. Sirve como plantilla base para heredar propiedades con la directiva `extends`:

```yaml
.plantilla_node:
  image: node:20-alpine
  before_script:
    - npm ci
  tags:
    - linux-docker

build_frontend:
  extends: .plantilla_node
  stage: build
  script:
    - npm run build:front

build_backend:
  extends: .plantilla_node
  stage: build
  script:
    - npm run build:back
```

---

## Validación: CI Lint y Pipeline Editor

Nunca hagas push de un pipeline a ciegas:
1. **Pipeline Editor (Web UI):** Accesible desde **Build > Pipeline Editor**. Brinda autocompletado, detección visual de sintaxis y renderizado del árbol DAG en vivo.
2. **CI Lint:** Valida la estructura del archivo contra la API de GitLab antes de confirmar cambios, verificando dependencias, nombres de stages y sintaxis YAML.

---

## Si Venís de Jenkins

| En Jenkins (`Jenkinsfile`) | En GitLab (`.gitlab-ci.yml`) |
|---|---|
| `stage('Build') { steps { sh 'npm run build' } }` | `build_job: stage: build script: [ 'npm run build' ]` |
| `agent { docker { image 'node:20' } }` | `image: node:20` a nivel de job o `default:` |
| `cleanWs()` en `post { always }` | No hace falta: los contenedores se destruyen al finalizar el job. |

---

## Relacionado

- [/article/gitlab/02-jenkins-vs-gitlab/](/article/gitlab/02-jenkins-vs-gitlab/) — Comparativa y equivalencias Jenkins vs GitLab.
- [/article/gitlab/04-rules-workflow-y-needs/](/article/gitlab/04-rules-workflow-y-needs/) — Condiciones lógicas con rules y optimización con needs.
- [/article/gitlab/07-artifacts-y-cache/](/article/gitlab/07-artifacts-y-cache/) — Manejo de artefactos y aceleración con cache.
