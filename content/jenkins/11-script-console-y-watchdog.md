---
title: "Script Console y Automatización con la API Groovy de Jenkins: Watchdog de Nodos y Builds Zombie"
category: "jenkins"
tags: ["script-console", "groovy", "api", "watchdog", "zombie", "nodos", "cola"]
keywords: ["jenkins script console", "Jenkins.instance", "groovy jenkins api", "listar nodos offline", "marcar nodo offline groovy", "failed to launch storm", "build zombie jenkins", "matar build colgado", "abortar build groovy", "vaciar cola jenkins", "cancelar builds en cola", "listar jobs groovy", "dry run watchdog", "NonCPS watchdog"]
description: "Recetas de la API Groovy de Jenkins para la Script Console y pipelines de administración: inventario de nodos, cola y builds; y un watchdog que frena tormentas de 'Failed to launch' y aborta builds zombie, con modo dry-run."
---

# Script Console y API Groovy de Jenkins

**Manage Jenkins → Script Console** (`/script`) ejecuta Groovy en el controller con permisos totales. Lo mismo se puede usar dentro de un pipeline (requiere librería global o script approval).

> Todo lo que corre acá puede leer credenciales, borrar jobs o apagar Jenkins. Probar siempre en modo lectura/dry-run primero.

---

## Nodos

```groovy
import jenkins.model.Jenkins

Jenkins.instance.computers.each { c ->
    println String.format('%-30s online=%-5s temp-offline=%-5s executors=%d busy=%d cause=%s',
        c.displayName, c.isOnline(), c.isTemporarilyOffline(),
        c.numExecutors, c.countBusy(), c.getOfflineCauseReason() ?: '-')
}
```

Poner / sacar un nodo de mantenimiento:

```groovy
import hudson.slaves.OfflineCause
def c = Jenkins.instance.getComputer('COMPILER_WINDOWS')
c.setTemporarilyOffline(true, new OfflineCause.UserCause(null, 'Mantenimiento: actualización de SDK'))
// ...
c.setTemporarilyOffline(false, null)
```

Reconectar todos los agentes offline (no temporales):

```groovy
Jenkins.instance.computers.findAll { it.isOffline() && !it.isTemporarilyOffline() }
       .each { println "Reconectando ${it.displayName}"; it.connect(true) }
```

---

## Cola

```groovy
def q = Jenkins.instance.queue
q.items.each { println "${it.task.fullDisplayName} | ${it.why}" }

// Cancelar los que esperan un label específico
q.items.findAll { it.assignedLabel?.toString() == 'COMPILER_LINUX' }.each { q.cancel(it.task) }

// Vaciar todo
q.clear()
```

---

## Jobs y builds

```groovy
import hudson.model.Job

// Builds en ejecución hace más de 2 horas
long limit = System.currentTimeMillis() - 2 * 3600 * 1000L
Jenkins.instance.getAllItems(Job).each { job ->
    job.builds.findAll { it.isBuilding() && it.getStartTimeInMillis() < limit }
              .each { println "${job.fullName} #${it.number} desde ${new Date(it.getStartTimeInMillis())}" }
}

// Abortar un pipeline colgado (guía completa con escalamiento: /article/jenkins/13-liberar-job-colgado/)
def run = Jenkins.instance.getItemByFullName('Folder/mi-job').getBuildByNumber(123)
run.doStop()                // equivalente al botón X
// run.doTerm()             // más agresivo
// run.doKill()             // último recurso (no ejecuta finally/post)

// Deshabilitar todos los jobs de un folder
Jenkins.instance.getItemByFullName('Automation').getAllJobs().each { it.setDisabled(true) }
```

---

## Watchdog: tormentas de "Failed to launch" y builds zombie

### El problema

1. **Tormenta de provisión:** cuando un host Docker de un *cloud* se cae, Jenkins intenta lanzar agentes una y otra vez. Cada intento falla con `Failed to launch`, la cola crece y los logs se llenan.
2. **Builds zombie:** builds que figuran *building* pero cuya ejecución de pipeline ya no existe (tras un reinicio o un agente perdido). Ocupan el "último build" del job y bloquean `disableConcurrentBuilds`.

### Pipeline

```groovy
import jenkins.model.Jenkins
import hudson.model.Result
import hudson.slaves.OfflineCause
import org.jenkinsci.plugins.workflow.job.WorkflowJob
import org.jenkinsci.plugins.workflow.job.WorkflowRun
import com.cloudbees.groovy.cps.NonCPS

@NonCPS        // recorre objetos no serializables de Jenkins: todo dentro de un método NonCPS
Map runWatchdog(boolean dryRun, long zombieMinAgeMs, String folderName) {
    List<String> lines = []
    int marked = 0, killed = 0, errors = 0

    Jenkins.instance.computers.each { c ->
        try {
            if (c.isOffline() && !c.isTemporarilyOffline() &&
                (c.getOfflineCauseReason() ?: '').toLowerCase().contains('failed to launch')) {
                if (dryRun) {
                    lines << "DRY_RUN -> MARK OFFLINE: ${c.displayName}"
                } else {
                    c.setTemporarilyOffline(true, new OfflineCause.UserCause(null, 'watchdog: host caído, frenando storm'))
                    lines << "MARKED OFFLINE -> ${c.displayName}"
                    marked++
                }
            }
        } catch (Exception e) {
            errors++; lines << "ERROR nodo ${c.displayName}: ${e.message}"
        }
    }

    def folder = Jenkins.instance.getItemByFullName(folderName)
    folder?.getAllJobs()?.each { job ->
        if (!(job instanceof WorkflowJob)) return
        def b = job.getLastBuild()
        if (!(b instanceof WorkflowRun)) return

        long age = System.currentTimeMillis() - b.getStartTimeInMillis()
        boolean zombie = b.isBuilding() && !b.isInProgress() && b.getExecution() == null && age > zombieMinAgeMs
        if (!zombie) return

        if (dryRun) {
            lines << "DRY_RUN -> KILL ZOMBIE: ${job.fullName} #${b.number} (${(age / 60000) as long} min)"
        } else {
            try {
                b.finish(Result.ABORTED, new IOException("watchdog: zombie (${(age / 60000) as long} min)"))
                b.save()
                lines << "KILLED ZOMBIE -> ${job.fullName} #${b.number}"
                killed++
            } catch (Exception e) {
                errors++; lines << "ERROR ${job.fullName} #${b.number}: ${e.message}"
            }
        }
    }
    return [lines: lines, marked: marked, killed: killed, errors: errors]
}

timeout(time: 10, unit: 'MINUTES') {
    stage('Watchdog') {
        boolean dryRun = params.DRY_RUN == null ? true : params.DRY_RUN.toString().toBoolean()   // seguro por defecto
        int minutes = (params.ZOMBIE_MINUTES ?: '30').toString().toInteger()
        if (minutes < 5 || minutes > 240) error "ZOMBIE_MINUTES fuera de rango (5-240): ${minutes}"

        def r = runWatchdog(dryRun, minutes * 60_000L, 'Automation')
        r.lines.each { echo it }
        echo "DRY_RUN=${dryRun} | marcados=${r.marked} | zombies=${r.killed} | errores=${r.errors}"
        if (r.errors > 0) currentBuild.result = 'UNSTABLE'
    }
}
```

| Decisión de diseño | Motivo |
|--------------------|--------|
| `DRY_RUN` por defecto `true` | Si alguien lo dispara sin parámetros, no rompe nada |
| Validar rango de `ZOMBIE_MINUTES` | Evita abortar builds legítimos por un valor mal tipeado |
| Marcar *temporarily offline* (no borrar) | Reversible; un humano lo vuelve a poner online cuando el host vuelve |
| `@NonCPS` y pasar solo tipos simples | Los objetos de Jenkins no son serializables |
| `!isInProgress() && getExecution() == null` | Distingue zombie de un build lento pero vivo |

Programarlo cada 15–30 min con `cron('H/15 * * * *')` en `DRY_RUN=false` una vez validado.

---

## Otras recetas

```groovy
// Plugins instalados (para reproducir en otro Jenkins)
Jenkins.instance.pluginManager.plugins.sort { it.shortName }.each { println "${it.shortName}:${it.version}" }

// Usuarios y último login conocido
hudson.model.User.getAll().each { println "${it.id} - ${it.fullName}" }

// Variables globales (Manage Jenkins → System → Global properties)
def props = Jenkins.instance.globalNodeProperties.get(hudson.slaves.EnvironmentVariablesNodeProperty)
props?.envVars?.each { k, v -> println "${k}=${v}" }

// Reinicio seguro
Jenkins.instance.doSafeRestart(null)
```
