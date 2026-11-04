---
title: "Troubleshooting de GitLab CI: Errores Frecuentes y Soluciones"
category: "gitlab"
tags: ["troubleshooting", "debug", "errores", "runners", "permisos", "cache"]
keywords: ["errores gitlab ci", "this job is stuck gitlab", "pipeline filtered out by workflow rules", "yaml invalid gitlab ci", "ci_debug_trace gitlab", "gitlab runner offline", "error masked variable gitlab"]
description: "Guía de diagnóstico y solución para los problemas más comunes en GitLab CI/CD: sintaxis YAML, runners desconectados, cache, permisos y variables."
---

# Troubleshooting de GitLab CI: Errores Frecuentes

Guía de referencia rápida para diagnosticar y solucionar los errores más habituales al ejecutar pipelines y operar runners en GitLab CI/CD.

---

## Errores de Sintaxis y Comportamiento de Pipelines

| Error / Síntoma | Causa Frecuente | Solución |
|---|---|---|
| `jobs config should contain at least one visible job` | Todos los jobs comienzan con punto (`.job`) o fueron descartados por `rules: when: never`. | Revisar condiciones de `rules` para asegurar que al menos un job sea elegible en el evento. |
| `Pipeline filtered out by workflow rules` | El bloque global `workflow:rules` evaluó a falso o a `when: never` para este commit/evento. | Inspeccionar la fuente del evento (`$CI_PIPELINE_SOURCE`) y ajustar las condiciones de `workflow:rules`. |
| `jobs:x:needs config contains unknown keys` | Sintaxis incorrecta en el bloque `needs` (ej: pasar mapa en lugar de array). | Usar formato de lista: `needs: ["job_a", "job_b"]` o `needs: [{ job: "job_a", artifacts: true }]`. |
| El pipeline corre dos veces en el mismo commit | Conflicto entre `branch pipeline` y `merge request pipeline`. | Implementar la plantilla estándar de `workflow:rules` para suprimir ejecuciones en ramas que tienen MR abierto. |

---

## Errores en Runners y Asignación de Jobs

### 1. `This job is stuck because you don't have any active runners online with any of these tags assigned to them`
- **Causa:** El job especifica `tags: [linux, docker]` pero no existe ningún runner registrado con **todos** esos tags exactamente, o los runners existentes están pausados (*paused*) o desconectados.
- **Solución:**
  1. Verificá los tags en **Settings > CI/CD > Runners**.
  2. Si el runner no tiene tags asignados, debe tener habilitada la opción **"Run untagged jobs"**.

### 2. `x509: certificate signed by unknown authority`
- **Causa:** Ocurre comúnmente en instancias Self-Managed que usan certificados SSL corporativos o autofirmados. El runner no confía en la CA de GitLab.
- **Solución:** Copiá el certificado raíz de tu CA en formato `.crt` dentro de `/etc/gitlab-runner/certs/gitlab.example.com.crt` en el host del runner y reiniciá el servicio:
  ```bash
  sudo gitlab-runner restart
  ```

### 3. `ERROR: Job failed: exit code 1` (Genérico)
- **Causa:** Uno de los comandos de la sección `script:` devolvió un código de error distinto de 0.
- **Solución:** Habilitá el trace profundo de ejecución agregando la variable `CI_DEBUG_TRACE: "true"` para ver la salida línea por línea:
  ```yaml
  job_problematico:
    variables:
      CI_DEBUG_TRACE: "true"
    script:
      - ./mi-script.sh
  ```
  > **Ojo:** `CI_DEBUG_TRACE` imprime absolutamente todos los comandos y valores de variables. Puede exponer secretos en texto plano en la consola. Desactivalo inmediatamente tras el diagnóstico.

---

## Errores en Variables y Artefactos

| Error | Causa | Solución |
|---|---|---|
| La variable llega vacía al job | La variable fue marcada como **Protected** pero el job está corriendo en un branch no protegido. | Proteger la rama en **Settings > Repository > Protected branches** o desmarcar la casilla *Protected* en la variable. |
| `This variable cannot be masked` al guardar en la UI | El valor de la variable contiene caracteres no soportados para el enmascarado (saltos de línea o menos de 8 caracteres). | Codificar el secreto en Base64 o almacenarlo como una variable de tipo **File**. |
| `413 Request Entity Too Large` al subir artefactos | El archivo de artefactos supera el límite máximo configurado en la instancia de GitLab. | Aumentar el límite en **Admin > Settings > CI/CD > Maximum artifacts size** o filtrar archivos innecesarios con `exclude:`. |
| El cache no se restaura entre builds | Los jobs se ejecutaron en dos runners físicos distintos sin cache distribuido en S3. | Configurar almacenamiento distribuido S3/MinIO en `[runners.cache]` del `config.toml` de los runners. |

---

## Relacionado

- [/article/gitlab/04-rules-workflow-y-needs/](/article/gitlab/04-rules-workflow-y-needs/) — Configuración correcta de rules para evitar pipelines duplicados.
- [/article/gitlab/06-runners/](/article/gitlab/06-runners/) — Mantenimiento y configuración del `config.toml` en runners.
- [/article/jenkins/12-troubleshooting/](/article/jenkins/12-troubleshooting/) — Guía de troubleshooting y errores frecuentes en Jenkins.
