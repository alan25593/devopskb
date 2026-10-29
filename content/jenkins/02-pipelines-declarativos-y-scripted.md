---
title: "Pipelines Declarativos vs Scripted: Sintaxis, Stages y Control de Flujo"
category: "jenkins"
tags: ["pipeline", "declarative", "scripted", "groovy", "parallel", "stash"]
keywords: ["jenkinsfile declarativo", "jenkinsfile scripted", "diferencia declarative scripted", "pipeline block", "node block", "stage jenkins", "parallel jenkins", "stash unstash", "timeout jenkins", "catchError", "when expression", "options jenkins", "triggers cron jenkins", "disableConcurrentBuilds", "buildDiscarder", "currentBuild description", "returnStdout"]
description: "Comparación práctica entre pipelines declarativos y scripted en Jenkins: estructura, options, triggers, when, parallel, stash/unstash entre nodos, timeouts, manejo de errores y metadatos del build."
---

# Pipelines Declarativos vs Scripted

## Comparación rápida

| | Declarativo | Scripted |
|-|-------------|----------|
| Bloque raíz | `pipeline { }` | `node { }` (o Groovy suelto) |
| Estructura | Rígida, validada antes de ejecutar | Groovy libre |
| `options`, `triggers`, `post`, `when` | Nativos | Se emulan con `properties`, `try/finally`, `if` |
| Lógica compleja | Dentro de `script { }` | Directa |
| Varios nodos en un mismo build | `agent` por stage | Varios bloques `node()` en secuencia |
| Cuándo usarlo | Jobs simples, cron, webhooks | Orquestadores, builds multi-nodo, lógica data-driven |

> En un repo de orquestación grande es normal que la mayoría sea **scripted** (más flexible para mover trabajo entre nodos Windows y Linux) y que los jobs disparados por cron/webhook sean **declarativos**.

---

## Esqueleto declarativo

```groovy
@Library('devops')_

pipeline {
    agent { label 'COMPILER_LINUX' }

    triggers {
        cron('H * * * *')          // H = hash por job, reparte la carga
    }

    options {
        disableConcurrentBuilds()
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    parameters {
        choice(name: 'ENVIRONMENT', choices: ['dev', 'qa', 'staging'])
        string(name: 'BRANCH_NAME', defaultValue: 'develop')
        booleanParam(name: 'SONAR', defaultValue: false)
    }

    environment {
        CREDENTIALS_ID = 'devopsSSH'
    }

    stages {
        stage('Check changes') {
            steps {
                script {
                    env.SHOULD_DEPLOY = 'true'
                }
            }
        }
        stage('Deploy') {
            when { expression { env.SHOULD_DEPLOY == 'true' } }
            steps {
                build job: '/PLS/deploy-core', parameters: [string(name: 'ENVIRONMENT', value: params.ENVIRONMENT)]
            }
        }
    }

    post {
        failure { echo 'Notificar falla' }
        always  { cleanWs() }
    }
}
```

---

## Esqueleto scripted

```groovy
@Library('devops')_

timeout(time: 40, unit: 'MINUTES') {
    def branch = params.BRANCH_NAME.replace('refs/heads/', '')
    currentBuild.displayName = branch

    node('COMPILER_WINDOWS') {
        timestamps {
            ansiColor('xterm') {
                cleanWs()
                stage('Checkout') {
                    checkout scm
                }
                stage('Build') {
                    bat 'dotnet build -c Release'
                }
            }
        }
    }
}
```

`timeout` envolviendo todo el script cubre también el tiempo **en cola** esperando un agente. El timeout puede calcularse en runtime:

```groovy
timeout(time: params.SONAR?.toBoolean() ? 70 : 40, unit: 'MINUTES') { ... }
```

---

## Mover trabajo entre nodos con stash/unstash

Patrón típico: checkout y detección en un nodo, compilación en otro según lo detectado.

```groovy
def isNet10 = false

node('COMPILER_WINDOWS') {
    cleanWs()
    stage('Checkout') { checkout scm }
    stage('Detect framework') {
        def csproj = readFile file: 'src/WebApi/WebApi.csproj', encoding: 'UTF-8'
        isNet10 = (csproj =~ /<TargetFramework>\s*net10\.0\s*<\/TargetFramework>/).find()
    }
    stash name: 'workspace', includes: '**', allowEmpty: false
}

node(isNet10 ? 'COMPILER_LINUX_NET10' : 'COMPILER_WINDOWS') {
    cleanWs()
    unstash 'workspace'
    stage('Build') {
        if (isUnix()) { sh 'dotnet build' } else { bat 'dotnet build' }
    }
}
```

> `stash` viaja a través del controller. Es cómodo pero lento para workspaces de varios GB: excluir `node_modules`, `bin/`, `obj/` con `excludes:`.

---

## Paralelismo

```groovy
stage('Parallel') {
    parallel(
        Backend: {
            stage('Build BE') { sh 'make backend' }
        },
        Frontend: {
            stage('Build UI') { sh 'npm ci && npm run build' }
        },
        failFast: false
    )
}
```

Construir ramas dinámicamente (ojo con capturar la variable del loop en una local):

```groovy
def checks = [:]
repos.each { repo ->
    def r = repo                        // copia local: evita que todas las closures vean el último elemento
    checks[r.name] = {
        echo "Chequeando ${r.name}"
    }
}
parallel checks
```

---

## Manejo de errores

| Paso | Efecto |
|------|--------|
| `error 'msg'` | Falla el build inmediatamente |
| `unstable(message: 'msg')` | Marca UNSTABLE y sigue |
| `catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') { }` | Marca el stage fallido pero **continúa** con los siguientes |
| `warnError('msg') { }` | Igual pero marca UNSTABLE |
| `retry(3) { }` | Reintenta el bloque |
| `try/catch/finally` | Control total (scripted) |

```groovy
stage('Deploy BOWAS') {
    catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
        try {
            build job: '/PLS/deploy-bowas', parameters: [...]
        } catch (Exception ex) {
            log.error message: "Error en BOWAS: ${ex}"
            throw ex                    // re-lanzar para que catchError marque el stage
        }
    }
}
```

---

## Ejecutar comandos y capturar salida

```groovy
// Linux
def commit = sh(returnStdout: true, script: 'git rev-parse HEAD').trim()
def rc     = sh(returnStatus: true, script: 'test -f app.zip')

// Windows: bat devuelve también el eco del comando → tomar la última línea
def tag = bat(returnStdout: true, script: 'git describe --tags --abbrev=0').trim().split('\n').last()

// Windows: @ evita el eco del comando
def out = bat(returnStdout: true, script: '@git rev-parse HEAD').trim()

powershell(returnStdout: true, script: 'Get-Service W3SVC | Select -Expand Status')
```

---

## Metadatos del build

```groovy
currentBuild.displayName = "${params.JIRA}#${params.ENVIRONMENT}"   // reemplaza "#123"
currentBuild.description = "<b>BE:</b> ${params.BACKEND_BRANCH}<br/>" // admite HTML (si el markup formatter lo permite)
currentBuild.result = 'UNSTABLE'

// Variables de un build anterior (para pipelines con estado)
def prev = currentBuild.previousSuccessfulBuild?.buildVariables ?: [:]
```

---

## Versionado desde Git

```groovy
def verMain  = sh(returnStdout: true, script: 'git describe --tags --abbrev=0').trim()
def verPatch = sh(returnStdout: true, script: "git rev-list --count --first-parent ${verMain}..HEAD").trim()
def commitId = sh(returnStdout: true, script: 'git rev-parse HEAD').trim().take(8)

def appVersion = "${verMain}.${verPatch}.${commitId}"   // ej: 4.12.37.a1b2c3d4
currentBuild.description = appVersion
```
