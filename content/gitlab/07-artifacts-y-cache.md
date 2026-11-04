---
title: "Artifacts vs Cache en GitLab CI: Manejo Eficiente"
category: "gitlab"
tags: ["artifacts", "cache", "rendimiento", "dependencias", "optimizacion"]
keywords: ["artifacts vs cache gitlab", "artifacts expire_in gitlab", "cache key gitlab", "dependencies gitlab", "descargar artefactos gitlab", "cache distribuido s3 gitlab", "stash unstash equivalente gitlab"]
description: "Diferencias críticas entre Artifacts y Cache en GitLab CI: passing de archivos entre stages, expiración, cache distribuido S3 y optimización de builds."
---

# Artifacts vs Cache en GitLab CI

Uno de los errores más comunes al migrar de Jenkins a GitLab CI es confundir el propósito de los **Artifacts** y el **Cache**. Ambos almacenan archivos generados por un job, pero sus garantías de persistencia y objetivos son completamente diferentes.

---

## Tabla Comparativa Fundamental

| Característica | Artifacts | Cache |
|---|---|---|
| **Propósito Principal** | Pasar binarios compilados y reportes entre stages o conservar entregables finales. | Acelerar builds almacenando dependencias externas (`node_modules/`, `.m2/`, NuGet). |
| **Garantía de Disponibilidad** | **Garantizada:** Si el job previo los generó con éxito, los stages siguientes siempre los reciben. | **No garantizada:** Si el runner no tiene el cache o falló la descarga, el job debe poder reconstruirlo. |
| **Paso entre Nodos / Runners** | Se suben siempre al servidor GitLab / Object Storage y se bajan en los siguientes jobs. | Se descargan y suben localmente o hacia un almacenamiento S3 distribuido compartido. |
| **Visibilidad en la UI** | Descargables desde la Web UI, APIs o vinculados a Releases de GitLab. | Invisibles para los usuarios finales. No se exponen en la interfaz de usuario. |
| **Equivalente en Jenkins** | `stash` / `unstash` y `archiveArtifacts` | Cache local en el workspace (`~/.npm`, `~/.m2`) de un nodo persistente. |

---

## Uso Detallado de `artifacts`

Los artefactos se definen dentro de cada job:

```yaml
compilar_frontend:
  stage: build
  image: node:20-alpine
  script:
    - npm ci
    - npm run build
  artifacts:
    name: "bundle-app-$CI_COMMIT_SHORT_SHA"
    paths:
      - dist/
      - coverage/
    exclude:
      - dist/**/*.map
    expire_in: 7 days
    when: on_success
    reports:
      junit: junit-report.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
```

### Opciones de Artifacts:
- `paths`: Lista de carpetas o archivos a incluir en el zip de artefactos.
- `expire_in`: Tiempo tras el cual GitLab purga el archivo para no saturar el almacenamiento (ej: `1 hour`, `1 day`, `4 weeks`).
- `when`: `on_success` (default), `on_failure` (útil para guardar capturas o logs cuando falla un test), o `always`.
- `reports`: Formatos estándar que GitLab procesa nativamente para mostrar widgets en los Merge Requests (JUnit, cobertura Cobertura, reportes SAST, etc.).

---

## Optimización y Descarga: `dependencies` vs `needs`

Por defecto, en un pipeline tradicional por stages, **cada job descarga automáticamente todos los artefactos de todos los jobs de los stages anteriores**. Si un job compiló 500 MB en `build`, un job de linting en `test` perderá tiempo bajándolos.

Para evitar descargas innecesarias:

```yaml
# Opción 1: dependencies explícito
test_unitario:
  stage: test
  dependencies: [] # No descarga artefactos de ningún job anterior

desplegar_artefacto:
  stage: deploy
  dependencies:
    - compilar_frontend # Descarga ÚNICAMENTE los artefactos de este job
  script:
    - ./deploy.sh dist/
```

Si usás pipelines DAG con `needs`, los artefactos se bajan solo de los jobs listados en `needs: ["compilar_frontend"]`.

---

## Uso Eficiente de `cache`

El cache almacena dependencias que no cambian entre ejecuciones a menos que cambie el archivo de lock:

```yaml
default:
  cache:
    key:
      files:
        - package-lock.json
    paths:
      - .npm/
    policy: pull-push

job_con_cache:
  stage: build
  script:
    - npm ci --cache .npm --prefer-offline
    - npm run build
```

### Directivas clave de Cache:
- `key: files: [...]`: Genera un hash SHA basado en el contenido del archivo de bloqueo (`package-lock.json`, `pom.xml`, `packages.lock.json`). Si el archivo no cambió, reutiliza el cache existente.
- `policy: pull`: Solo descarga el cache, no gasta tiempo volviéndolo a subir al final del job (ideal para jobs de testing).
- `policy: pull-push`: Comportamiento estándar; descarga al inicio y actualiza al finalizar.

---

## Relacionado

- [/article/gitlab/03-gitlab-ci-yml-basico/](/article/gitlab/03-gitlab-ci-yml-basico/) — Estructura básica de `.gitlab-ci.yml`.
- [/article/gitlab/06-runners/](/article/gitlab/06-runners/) — Configuración de cache distribuido S3 en runners.
- [/article/gitlab/08-include-extends-y-components/](/article/gitlab/08-include-extends-y-components/) — Modularización de plantillas de build.
