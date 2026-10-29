---
title: "Mantenimiento de Jenkins: Limpieza de Workspaces, Builds Viejos y Disco"
category: "jenkins"
tags: ["mantenimiento", "limpieza", "disco", "workspace", "cleanWs", "buildDiscarder"]
keywords: ["jenkins disco lleno", "limpiar workspace jenkins", "cleanWs", "deleteDir", "@tmp jenkins", "@script jenkins", "ws-cleanup windows", "borrar builds viejos jenkins", "buildDiscarder logRotator", "jenkins espacio en disco", "workspace dedicado por build", "attrib -r windows jenkins", "_ws-cleanup_ huerfano"]
description: "Rutinas de mantenimiento para Jenkins: workspaces dedicados que se limpian siempre, particularidades de Windows, borrado de builds viejos, carpetas @script/@tmp y job de control de disco con umbrales."
---

# Mantenimiento de Jenkins

## Dónde se va el disco

| Ruta | Qué crece |
|------|-----------|
| `JENKINS_HOME/jobs/**/builds/` | Logs, artefactos archivados, reportes de cada build |
| `JENKINS_HOME/workspace/` | Workspaces de builds que corrieron en el controller |
| `<agente>/workspace/` | Checkouts, `node_modules`, `bin/obj` |
| `*@tmp`, `*@script`, `*@libs` | Carpetas auxiliares que `cleanWs()` **no** borra |
| `*_ws-cleanup_*` | Renombres del borrado diferido que quedaron huérfanos (Windows) |

```bash
du -sh /var/lib/jenkins/jobs /var/lib/jenkins/workspace
cd /var/lib/jenkins/workspace && du -hs $(ls -A) | sort -h | tail -20
find /var/lib/jenkins/jobs -type d -name builds -prune -exec du -s {} + | sort -n | tail -20
```

---

## Retención en cada job

```groovy
// Declarativo
options { buildDiscarder(logRotator(numToKeepStr: '20', artifactNumToKeepStr: '5')) }

// Scripted
properties([buildDiscarder(logRotator(numToKeepStr: '30', daysToKeepStr: '30'))])
```

> `properties([...])` en scripted **reemplaza** todas las propiedades del job (parámetros incluidos) en la primera ejecución. Si el job tiene parámetros definidos por UI, declararlos también ahí o no usar `properties`.

---

## Workspace dedicado por build

Evita colisiones entre builds concurrentes del mismo job y garantiza limpieza aunque el build falle:

```groovy
// vars/buildWorkspace.groovy
def call(String suffix = '', Closure body) {
    ws("${env.JOB_NAME}-${env.BUILD_NUMBER}${suffix}") {
        try {
            body()
        } finally {
            def wsDir = env.WORKSPACE
            if (!isUnix()) {
                bat(script: 'attrib -r -h -s /s /d . 2>nul', returnStatus: true)
            }
            cleanWs(deleteDirs: true, disableDeferredWipeout: true, notFailBuild: true)
            dir("${wsDir}@tmp") { deleteDir() }
        }
    }
}
```

| Detalle | Por qué |
|---------|---------|
| `ws("...")` con ruta relativa | Se crea bajo la raíz del agente, **fuera** del área que Jenkins limpia sola → hay que borrarla siempre |
| `attrib -r -h -s /s /d` | En Windows, archivos read-only de `.git` o `node_modules` hacen fallar el borrado |
| `disableDeferredWipeout: true` | El borrado diferido renombra a `*_ws-cleanup_*` y en Windows suele quedar huérfano |
| `notFailBuild: true` | Un problema de limpieza no debe marcar como fallido un build correcto |
| `dir("${wsDir}@tmp") { deleteDir() }` | `cleanWs` no toca `@tmp` |

---

## Borrar builds viejos (script en el controller)

```bash
#!/bin/bash
# Elimina builds de más de 30 días en todos los niveles de folders
JOBS_DIR="/var/lib/jenkins/jobs"
LIMIT=$(date --date='-30 days' +%s)

find "$JOBS_DIR" -type d -name builds | while read -r builds_dir; do
  find "$builds_dir" -maxdepth 1 -type d -regex '.*/[0-9]+' | while read -r build; do
    [ -f "$build/build.xml" ] || continue
    if [ "$(stat -c %Y "$build/build.xml")" -lt "$LIMIT" ]; then
      echo "Eliminando $build"
      rm -rf "$build"
    fi
  done
done
```

> Borrar builds por filesystem deja a Jenkins con referencias en memoria hasta que recarga. Preferir `buildDiscarder` como mecanismo principal y este script como red de seguridad. Tras correrlo: **Manage Jenkins → Reload Configuration from Disk** o un `safeRestart` en la próxima ventana.

Equivalente por API (Script Console), sin reinicio:

```groovy
import jenkins.model.Jenkins
long limit = System.currentTimeMillis() - 30L * 24 * 3600 * 1000
Jenkins.instance.getAllItems(hudson.model.Job).each { job ->
    job.builds.findAll { !it.isBuilding() && !it.isKeepLog() && it.getTimeInMillis() < limit }
              .each { println "${job.fullName} #${it.number}"; it.delete() }
}
```

---

## Job de control de disco

Programado (ej. diario) en el nodo `master`: limpia carpetas `@script`, borra builds viejos y marca el resultado según el uso de disco.

```groovy
timeout(time: 40, unit: 'MINUTES') {
    node('master') {
        def wsRoot = "${WORKSPACE}/../.."

        stage('Clean @script') {
            sh """
                cd ${wsRoot}
                for d in *@script; do [ -d "\$d" ] && rm -rf "\$d"; done
            """
        }

        stage('Clean old builds') {
            writeFile file: 'clean.sh', text: libraryResource('scripts/bash/clean-all-builds-30-days.sh')
            sh 'chmod +x clean.sh && ./clean.sh'
        }

        stage('Disk check') {
            def usage = sh(returnStdout: true, script: "df --output=pcent / | tail -1 | tr -dc '0-9'").trim().toInteger()
            currentBuild.displayName = "${usage}%"
            if (usage >= 95) {
                error "Disco al ${usage}%: intervención URGENTE."
            } else if (usage >= 88) {
                unstable "Disco al ${usage}%: planificar intervención."
            }
        }
        cleanWs()
    }
}
```

> Para borrar directorios con millones de archivos (ej. `node_modules`), `rsync -a --delete vacio/ objetivo/` seguido de `rm -rf` suele ser mucho más rápido que `rm -rf` directo.

---

## Agentes Windows

```powershell
# Tamaño de workspaces
Get-ChildItem C:\JenkinsAgent\workspace -Directory |
  ForEach-Object { [pscustomobject]@{ Name=$_.Name; GB=[math]::Round((Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum/1GB,2) } } |
  Sort-Object GB -Descending | Select-Object -First 20

# Borrar huérfanos del borrado diferido y workspaces de más de 7 días
Get-ChildItem C:\JenkinsAgent\workspace -Directory |
  Where-Object { $_.Name -like '*_ws-cleanup_*' -or $_.LastWriteTime -lt (Get-Date).AddDays(-7) } |
  ForEach-Object { cmd /c "attrib -r -h -s /s /d `"$($_.FullName)\*`" & rd /s /q `"$($_.FullName)`"" }
```

Si un directorio no se puede borrar, casi siempre hay un proceso vivo (`dotnet`, `node`, `MSBuild`, `VBCSCompiler`):

```powershell
Get-Process dotnet, node, MSBuild, VBCSCompiler -ErrorAction SilentlyContinue | Stop-Process -Force
```

---

## Rutina recomendada

| Frecuencia | Tarea |
|------------|-------|
| Cada build | `buildWorkspace {}` / `cleanWs()` |
| Diaria | Control de disco del controller y agentes; backup |
| Semanal | Limpieza de workspaces de agentes; watchdog de nodos/builds zombie |
| Mensual | Actualizar plugins en ventana; revisar *Manage Jenkins → System Log* |
| Trimestral | Actualizar LTS; prueba de restore DRP |
