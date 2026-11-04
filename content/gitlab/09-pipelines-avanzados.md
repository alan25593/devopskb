---
title: "Pipelines Avanzados: Parent-Child, Triggers y Schedules"
category: "gitlab"
tags: ["pipelines-avanzados", "parent-child", "triggers", "cron", "matrix", "orquestacion"]
keywords: ["parent child pipelines gitlab", "multi project pipelines gitlab", "pipeline schedules cron gitlab", "parallel matrix gitlab", "resource_group gitlab", "trigger include gitlab", "orquestador deploys gitlab"]
description: "Patrones avanzados en GitLab CI: pipelines parent-child en monorepos, multi-proyecto, matrices de ejecución, serialización con resource_group y cron schedules."
---

# Pipelines Avanzados: Parent-Child, Triggers y Schedules

En entornos corporativos complejos, un único archivo monolítico `.gitlab-ci.yml` resulta difícil de mantener. GitLab ofrece patrones avanzados para desacoplar monorepos, coordinar microservicios y serializar despliegues críticos.

---

## Parent-Child Pipelines (Monorepos y Sub-Proyectos)

Un pipeline padre puede generar o disparar pipelines hijos independientes. Ideal para **monorepos** donde solo querés disparar el pipeline de la carpeta que cambió:

```yaml
# .gitlab-ci.yml (Raíz)
stages:
  - triggers

trigger_billing:
  stage: triggers
  rules:
    - changes:
        - services/billing/**/*
  trigger:
    include: services/billing/.gitlab-ci.yml
    strategy: depend # El pipeline padre espera que el hijo termine y refleja su resultado

trigger_auth:
  stage: triggers
  rules:
    - changes:
        - services/auth/**/*
  trigger:
    include: services/auth/.gitlab-ci.yml
    strategy: depend
```

---

## Multi-Project Pipelines (Coordinación entre Repositorios)

Permite disparar un pipeline en un repositorio completamente diferente (por ejemplo, desde un repositorio de backend disparar el pipeline de despliegue en el repositorio de infraestructura IaC):

```yaml
disparar_deploy_iac:
  stage: deploy
  trigger:
    project: infraestructura/iac-environments
    branch: main
    forward:
      pipeline_variables: true # Traspasa las variables del commit actual al repo destino
```

---

## Ejecución Paralela: `parallel` y `parallel:matrix`

Para compilar o testear contra múltiples versiones de runtime sin duplicar código:

```yaml
test_multi_version:
  stage: test
  image: node:${NODE_VERSION}-alpine
  parallel:
    matrix:
      - NODE_VERSION: ['18', '20', '22']
        OS_TYPE: ['alpine']
  script:
    - node -v
    - npm test
```

---

## Control de Concurrencia: `resource_group`

Para evitar colisiones en despliegues concurrentes sobre un mismo ambiente físico o base de datos (equivalente al plugin *Lockable Resources* o `disableConcurrentBuilds()` de Jenkins):

```yaml
deploy_produccion:
  stage: deploy
  resource_group: env_production # Solo un job con este resource_group puede correr a la vez
  script:
    - ./aplicar-migraciones-oracle.sh
    - ./deploy-iis.ps1
```

---

## Automatización Temporal: Pipeline Schedules

Los **Pipeline Schedules** reemplazan los cron triggers de Jenkins (`triggers { cron('H * * * *') }`).
- Se configuran en **Build > Pipeline Schedules** o vía API.
- Podés asignar variables específicas para esa corrida (ej: `NIGHTLY_BACKUP = true`).
- En el `.gitlab-ci.yml` se controlan con:
  ```yaml
  tarea_nocturna:
    stage: test
    rules:
      - if: '$CI_PIPELINE_SOURCE == "schedule"'
    script:
      - ./run-full-system-e2e.sh
  ```

---

## Si Venís de Jenkins

| En Jenkins | En GitLab |
|---|---|
| `build job: '/Deploys/core', parameters: [...]` | `trigger: { project: '...', forward: ... }` |
| Monorepo con plugin *Pathignore* / sub-jobs | Parent-Child pipelines con `trigger:include` y `rules:changes`. |
| `disableConcurrentBuilds()` o Lockable Resources | Directiva `resource_group: nombre_recurso`. |
| `matrix { axes { axis { ... } } }` | `parallel: matrix: [...]` |

---

## Relacionado

- [/article/gitlab/04-rules-workflow-y-needs/](/article/gitlab/04-rules-workflow-y-needs/) — Condiciones de rules y pipelines DAG.
- [/article/gitlab/10-environments-y-deploys/](/article/gitlab/10-environments-y-deploys/) — Gestión de environments protegidos y rollbacks.
- [/article/jenkins/07-orquestacion-de-despliegues/](/article/jenkins/07-orquestacion-de-despliegues/) — Orquestación de despliegues en Jenkins.
