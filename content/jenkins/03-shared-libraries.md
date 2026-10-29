---
title: "Jenkins Shared Libraries: vars, src, resources y Pipelines Data-Driven"
category: "jenkins"
tags: ["shared-library", "groovy", "vars", "libraryResource", "data-driven", "noncps"]
keywords: ["jenkins shared library", "@Library", "vars groovy", "src groovy", "libraryResource", "readJSON", "def call", "custom step jenkins", "NonCPS", "CPS jenkins", "global pipeline library", "reutilizar codigo jenkins", "pipeline data driven", "environments.json", "app_paths.json"]
description: "Cómo estructurar una Jenkins Shared Library (vars/, src/, resources/), escribir steps reutilizables con call() y closures, cargar configuración con libraryResource y diseñar pipelines data-driven."
---

# Jenkins Shared Libraries

## Estructura

```text
devops/                          # repo configurado como Global Pipeline Library "devops"
├── vars/                        # Steps globales: cada archivo = un step
│   ├── log.groovy               # log.info message: '...'
│   ├── buildWorkspace.groovy    # buildWorkspace { ... }
│   ├── jfrog.groovy             # jfrog.uploadArtifacts(...)
│   ├── vault.groovy
│   └── notification.groovy
├── src/com/miorg/               # Clases Groovy (paquetes normales)
│   ├── helpers/JsonHelpers.groovy
│   ├── models/DeploymentNotificationHandler.groovy
│   └── shared/Constants.groovy
├── resources/                   # Archivos estáticos leídos con libraryResource
│   ├── lotteries/specs/lotteries-app_paths.json
│   ├── lotteries/specs/lotteries-environments.json
│   ├── shared/jfrog/basefile-spec.json
│   └── scripts/bash/clean-all-builds-30-days.sh
└── lotteries/                   # Jenkinsfiles (entrypoints de los jobs)
    ├── Backend/build-core.jenkinsfile
    └── Orchestrator/simplemultienvironment.jenkinsfile
```

Registro: **Manage Jenkins → System → Global Trusted Pipeline Libraries** → nombre `devops`, SCM Git, versión por defecto `master`.

> Las librerías **globales** corren sin sandbox (pueden usar cualquier API de Jenkins). Las de folder corren con sandbox y requieren script approval.

---

## Cargar la librería

```groovy
@Library('devops')_                     // versión por defecto
@Library('devops@feature/x')_           // rama específica (útil para probar cambios de la lib)
@Library(['devops', 'otra-lib@v2'])_

import com.miorg.models.*               // clases de src/
```

El `_` final es necesario cuando no hay un `import` inmediatamente después.

---

## Steps en `vars/`

### Varias funciones en un archivo → `archivo.funcion()`

```groovy
// vars/log.groovy
def info(Map config = [:])    { echo "INFO: ${config.message}" }
def warning(Map config = [:]) { echo "WARN: ${config.message}" }
def error(Map config = [:])   { echo "ERROR: ${config.message}" }
```

```groovy
log.info message: "Deploying ${appName}"
```

### Step con `call()` → se invoca como un paso nativo

```groovy
// vars/cleanWorkspace.groovy
def call() {
    log.info message: 'Preparing workspace...'
    if (!isUnix()) {
        // archivos read-only (git, node_modules) rompen el borrado en Windows
        bat(script: 'attrib -r -h -s /s /d . 2>nul', returnStatus: true)
    }
    cleanWs()
}
```

```groovy
cleanWorkspace()
```

### Step que recibe un closure (wrapper)

```groovy
// vars/buildWorkspace.groovy
def call(Closure body) { call('', body) }

def call(String suffix, Closure body) {
    ws("${env.JOB_NAME}-${env.BUILD_NUMBER}${suffix}") {
        try {
            body()
        } finally {
            def wsDir = env.WORKSPACE
            try {
                if (!isUnix()) {
                    bat(script: 'attrib -r -h -s /s /d . 2>nul', returnStatus: true)
                }
                cleanWs(deleteDirs: true, disableDeferredWipeout: true, notFailBuild: true)
                dir("${wsDir}@tmp") { deleteDir() }
            } catch (Exception e) {
                log.warning message: "Could not fully clean workspace ${wsDir}: ${e.message}"
            }
        }
    }
}
```

```groovy
node('COMPILER_WINDOWS') {
    buildWorkspace {
        stage('Build') { bat 'msbuild App.sln' }
    }
}
```

### Parámetros con Map y defaults

Patrón usado en toda la librería: un único `Map config` con valores por defecto, para poder sumar parámetros sin romper llamadas existentes.

```groovy
// vars/sonarGate.groovy
def call(Map config = [:]) {
    if (!config.scan) {
        throw new IllegalArgumentException("sonarGate requires a 'scan' closure")
    }
    def sonarEnv           = config.sonarEnv ?: 'SonarQube'
    def gateTimeoutMinutes = config.gateTimeoutMinutes ?: 10
    ...
}
```

---

## Clases en `src/`

```groovy
// src/com/miorg/models/DeploymentNotificationHandler.groovy
package com.miorg.models

class DeploymentNotificationHandler implements Serializable {
    def script            // referencia al pipeline para usar steps (echo, sh, emailext)
    String appName
    String buildVersion

    void notifyStarted() {
        script.echo "Deploy de ${appName} ${buildVersion} iniciado"
    }
}
```

```groovy
// vars/pipelineBehaviors.groovy
import com.miorg.models.*

def createDeploymentNotificationHandler(Map config = [:]) {
    return new DeploymentNotificationHandler(script: this, appName: config.appName, buildVersion: config.buildVersion)
}
```

> Las clases deben ser `Serializable`: el estado del pipeline se persiste a disco entre pasos (CPS). Dentro de una clase, los steps se llaman vía `script.sh(...)`, no `sh(...)`.

---

## `resources/` y `libraryResource`

```groovy
def uploadSpecTemplate = libraryResource 'lotteries/specs/lotteries-uploadSpec.json'   // String
def appPaths           = readJSON text: libraryResource('lotteries/specs/lotteries-app_paths.json')
def appData            = appPaths.services[params.SERVICE.toLowerCase()]

// Llevar un script de la librería al workspace y ejecutarlo
writeFile file: 'cleanup.sh', text: libraryResource('scripts/bash/cleanup.sh')
sh 'chmod +x cleanup.sh && ./cleanup.sh'
```

---

## Pipelines data-driven

Los pipelines no conocen IPs, rutas ni bindings: los leen de JSON en runtime.

**`<dominio>-app_paths.json`** — defaults por servicio:

```json
{
  "services": {
    "core": {
      "hostname": "APP-SERVER",
      "install": {
        "sourceFile": "Core_{0}.zip",
        "path": "C:\\Apps\\Core",
        "buildTimeout": "30"
      },
      "port": 8443
    }
  }
}
```

**`<dominio>-environments.json`** — overrides por entorno:

```json
{
  "qa": {
    "displayName": "QA",
    "secretVaultPath": "/v1/kv/data/application/qa",
    "core": {
      "nodeName": "QA-APP-01",
      "port": 9443
    }
  }
}
```

**Precedencia:** `environmentData[component][key]` > `appPathsData[component][key]` > valor hardcodeado.

```groovy
def resolve(String component, String key, def fallback = null) {
    return envData?."${component}"?."${key}" ?: appPaths?."${component}"?."${key}" ?: fallback
}

def targetNode = resolve('core', 'nodeName', 'COMPILER_WINDOWS')
node(targetNode) { ... }
```

> **Trailing commas:** `readJSON` falla (a veces sin un mensaje claro) con JSON inválido. Validar con `jq . archivo.json` antes de commitear.

---

## CPS y `@NonCPS`

Jenkins ejecuta el pipeline con CPS (Continuation Passing Style) para poder pausar/reanudar. Consecuencias:

- Algunos métodos de colecciones (`sort` con closure, `toSorted`, iteradores) fallan o se comportan raro dentro de código CPS.
- Objetos no serializables (`Matcher`, `JsonSlurper` result, iteradores) no pueden quedar vivos entre steps → `NotSerializableException`.

Solución: aislar lógica pura en métodos `@NonCPS` (que **no** pueden llamar steps como `sh` o `echo` de forma confiable):

```groovy
import com.cloudbees.groovy.cps.NonCPS

@NonCPS
def extractVersion(String text) {
    def m = (text =~ /Version:\s*(\S+)/)
    return m.find() ? m.group(1) : null
}
```

---

## Buenas prácticas

- **Antes de escribir un `sh`/`bat` nuevo**, buscar en `vars/` si ya existe un helper (IIS, SQL, reemplazo de contenido, Artifactory).
- Respetar el SO del nodo: label Linux → `sh`; label Windows → `bat`/`powershell`. Usar `isUnix()` en helpers multiplataforma.
- Nada de rutas hardcodeadas (`C:\inetpub\...`): leerlas de `app_paths.json`.
- Nada de secretos en `resources/`: usar credenciales de Jenkins o referencias a Vault (ver [Credenciales y secretos](/article/jenkins/05-credenciales-y-secretos/)).
- Probar cambios de la librería con `@Library('devops@mi-rama')_` en un job de prueba antes de mergear.
