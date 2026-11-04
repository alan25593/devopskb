---
title: "Environments y Despliegues en GitLab CI: Deploys y Aprobaciones"
category: "gitlab"
tags: ["environments", "deploys", "cd", "aprobaciones", "rollbacks", "produccion"]
keywords: ["environments gitlab", "despliegues gitlab", "protected environments gitlab", "manual approval gitlab", "rollback gitlab", "review apps gitlab", "deploy windows iis gitlab"]
description: "Gestión de Environments en GitLab CI/CD: tracking de versiones en vivo, aprobaciones manuales, review apps, despliegues a IIS/Linux y rollbacks con un clic."
---

# Environments y Despliegues en GitLab CI/CD

El bloque **`environment`** en GitLab eleva un simple script de ejecución al nivel de gobernanza de infraestructura: registra qué versión de código está corriendo en cada ambiente, quién la desplegó, permite hacer **rollbacks inmediatos con un clic** y restringir aprobaciones mediante *Protected Environments*.

---

## Definición Básica de un Environment

```yaml
deploy_staging:
  stage: deploy
  environment:
    name: staging
    url: https://staging.example.com
  script:
    - ./deploy-service.sh --env staging
```

Al incluir `environment:`, GitLab habilita en el menú lateral (**Operate > Environments**) un panel centralizado donde podés ver:
- El hash del commit desplegado.
- El autor del despliegue y la hora exacta.
- El botón **Re-deploy** o **Rollback** a versiones históricas previas.

---

## Ambientes Protegidos y Aprobaciones Manuales

En Jenkins era habitual pausar un pipeline con un step `input message: '¿Autorizar deploy a Producción?'`.

En GitLab se implementa combinando `when: manual` y **Protected Environments**:

```yaml
deploy_production:
  stage: deploy
  environment:
    name: production
    url: https://prod.example.com
  resource_group: production_deploy
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
      when: manual # Requiere que un operador haga clic manual en Play
  script:
    - ./deploy-production.sh
```

### Configuración de Seguridad en la UI:
En **Settings > CI/CD > Protected Environments**:
- Podés restringir qué roles (ej: solo `Maintainers` o miembros del grupo `DevOps Leads`) pueden presionar el botón de ejecución.
- En versiones Enterprise/Premium, podés exigir **múltiples aprobaciones obligatorias** antes de que el job se desbloquee.

---

## Review Apps y Ambientes Dinámicos

GitLab permite levantar ambientes efímeros por cada Merge Request abierto y destruirlos automáticamente cuando el MR se cierra o se aprueba:

```yaml
start_review_app:
  stage: deploy
  environment:
    name: review/$CI_COMMIT_REF_SLUG
    url: https://$CI_COMMIT_REF_SLUG.dev.example.com
    on_stop: stop_review_app
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
  script:
    - ./deploy-k8s-preview.sh --namespace "$CI_COMMIT_REF_SLUG"

stop_review_app:
  stage: deploy
  environment:
    name: review/$CI_COMMIT_REF_SLUG
    action: stop
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
      when: manual
  script:
    - ./destroy-k8s-preview.sh --namespace "$CI_COMMIT_REF_SLUG"
```

---

## Despliegue sobre Servidores Windows / IIS

Para desplegar servicios en Windows Server (como los pools de IIS de Backoffice o Windows Services):

```yaml
deploy_iis_backend:
  stage: deploy
  tags:
    - windows-runner # Runner ejecutándose en Windows Server
  environment:
    name: production
  script:
    - Write-Output "Deteniendo Application Pool en IIS..."
    - Stop-WebAppPool -Name "BackofficePool"
    - Write-Output "Copiando binarios actualizados..."
    - Copy-Item -Path "dist\*" -Destination "C:\inetpub\wwwroot\backoffice" -Recurse -Force
    - Write-Output "Iniciando Application Pool..."
    - Start-WebAppPool -Name "BackofficePool"
```

---

## Si Venís de Jenkins

| En Jenkins | En GitLab |
|---|---|
| `input message: 'Aprobar paso a Prod?'` | `rules: [ when: manual ]` sobre un Protected Environment. |
| Seguimiento manual de qué commit corre en qué servidor | Panel visual en **Operate > Environments** con historial y estado. |
| Re-ejecutar build histórico para hacer rollback | Botón **Rollback** nativo en la pantalla de Environments. |

---

## Relacionado

- [/article/gitlab/04-rules-workflow-y-needs/](/article/gitlab/04-rules-workflow-y-needs/) — Condiciones de rules para deploys manuales.
- [/article/gitlab/06-runners/](/article/gitlab/06-runners/) — Configuración de runners en Linux y Windows Server.
- [/article/gitlab/09-pipelines-avanzados/](/article/gitlab/09-pipelines-avanzados/) — Serialización de despliegues con `resource_group`.
