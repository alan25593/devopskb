---
title: "Jenkins vs GitLab CI: Guía Definitiva y Equivalencias"
category: "gitlab"
tags: ["jenkins", "gitlab-ci", "migracion", "comparativa", "pipelines"]
keywords: ["jenkins vs gitlab", "diferencias jenkins gitlab", "tabla equivalencias jenkins gitlab", "jenkinsfile a gitlab-ci", "migrar jenkins a gitlab", "declarative pipeline gitlab", "shared library equivalente gitlab"]
description: "Guía y tabla de equivalencias completas entre Jenkins y GitLab CI: conceptos, sintaxis de pipelines, agentes, variables, librerías y ciclo de vida."
---

# Jenkins vs GitLab CI: Guía Definitiva de Equivalencias

Para un equipo o ingeniero habituado a operar con **Jenkins** (Jenkinsfiles declarativos/scripted, Shared Libraries `@Library('devops')`, nodos `COMPILER_LINUX` / `COMPILER_WINDOWS` y plugins dedicados), dar el salto a **GitLab CI/CD** requiere entender un cambio fundamental de paradigma:

1. **En Jenkins:** Todo gira alrededor de plugins, un Controller monolítico con estado (`JENKINS_HOME`), y pipelines que orquestan llamadas a agentes mediante Groovy.
2. **En GitLab:** El pipeline es declarativo en YAML (`.gitlab-ci.yml`), no requiere plugins, corre en contenedores o runners efímeros, y está integrado nativamente al repositorio y a los Merge Requests.

---

## Tabla Maestra de Conceptos y Equivalencias

| Concepto Jenkins | Equivalente en GitLab CI/CD | Notas de Transición |
|---|---|---|
| **`Jenkinsfile`** | `.gitlab-ci.yml` | Ubicado en la raíz del repositorio. Declarativo en formato YAML. |
| **Jenkins Controller (Master)** | GitLab Server / Rails Engine | Centraliza la UI, API, base de datos y orquestación de la cola. |
| **Agente / Nodo / Slave** | **GitLab Runner** | Proceso autónomo en Linux o Windows que ejecuta jobs asignados. |
| **Label del Agente (`label 'LINUX'`)** | **`tags: [linux, docker]`** | Filtra qué runner toma el job en función de sus tags configurados. |
| **Executor** | `concurrent` en `config.toml` del Runner | Cantidad de jobs simultáneos que un runner puede procesar. |
| **`pipeline { stages { ... } }`** | `stages:` + lista de jobs en el YAML | En GitLab los stages se definen globalmente y cada job declara su `stage`. |
| **`steps { sh '...' }`** | `script: [ '...' ]` | Lista de comandos shell/PowerShell que se ejecutan secuencialmente. |
| **`steps { bat '...' }` / `powershell`** | `script:` sobre un Runner Windows | El runner ejecuta `powershell` o `pwsh` según su configuración. |
| **`parallel { branchA { ... } }`** | Varios jobs en el mismo `stage` o `parallel:matrix` | Jobs en el mismo stage corren en paralelo si hay runners disponibles. |
| **`stash` / `unstash`** | **`artifacts`** y **`dependencies`** / **`needs`** | GitLab pasa archivos entre stages mediante artefactos temporales en el server. |
| **`archiveArtifacts`** | **`artifacts: paths: [...]`** | Conserva binarios, instaladores o reportes descargables desde la UI/API. |
| **`credentials('id')` / `withCredentials`** | **CI/CD Variables** (Project / Group) | Variables inyectadas en el entorno. Pueden ser *Masked* y *Protected*. |
| **File credentials** | CI/CD Variable de tipo **File** | GitLab crea un archivo temporal y expone la ruta en la variable `$VAR_NAME`. |
| **Shared Libraries (`@Library('...')`)** | **`include:`** y **CI/CD Components** | Reutilización de plantillas modulares versionadas en Git. |
| **`build job: 'sub-job', parameters: [...]`** | **`trigger:project`** / **`trigger:include`** | Dispara pipelines multi-proyecto o pipelines hijos (parent-child). |
| **`input message: 'Aprobar deploy?'`** | **`when: manual`** / Protected Environments | Pausa el job hasta que un usuario autorizado hace clic en el botón de Play. |
| **`parameters { choice(...) }`** | Variables en **Run Pipeline** con `options` | Formulario en la UI de GitLab al ejecutar un pipeline manualmente. |
| **`post { failure { ... } always { ... } }`** | **`after_script:`** y jobs con **`when: on_failure`** | Ejecución de tareas de limpieza, notificación o métricas post-ejecución. |
| **`when { branch 'main' }`** | **`rules: [if: '$CI_COMMIT_BRANCH == "main"']`** | Motor de reglas para decidir si un job se incluye en el pipeline. |
| **Multibranch Pipeline** | Nativo en GitLab | Todo push o Merge Request evalúa automáticamente el `.gitlab-ci.yml`. |
| **Cron Trigger (`triggers { cron(...) }`)** | **Pipeline Schedules** | Configurado en la UI o API con sintaxis estándar de crontab. |
| **Blue Ocean / Stage View** | **Pipeline Graph** nativo | Visualización visual de etapas, dependencias y estados en tiempo real. |
| **Script Console (`/script`)** | `gitlab-rails console` | Consola interactiva en el servidor (solo en Self-Managed con acceso root). |
| **Plugins del ecosistema** | Funcionalidades nativas de GitLab | Registry, SAST, DAST, Sonar, K8s vienen integrados sin instalar plugins. |
| **Artifactory / Nexus** | **GitLab Package & Container Registry** | Opcional: podés usar el registry nativo o seguir enviando a Artifactory externo. |
| **SonarQube Quality Gate** | Job con `sonar-scanner` | Se ejecuta vía script validando `sonar.qualitygate.wait=true`. |
| **Lockable Resources** | **`resource_group`** | Garantiza que un solo job acceda a un ambiente o recurso a la vez. |
| **`timeout(time: 30, unit: 'MINUTES')`** | **`timeout: 30m`** | Límite máximo de duración para un job individual o para el proyecto. |
| **`buildDiscarder(logRotator(...))`** | **`artifacts:expire_in`** | Expiración automática de artefactos y políticas de limpieza del servidor. |

---

## Comparativa Práctica: El Mismo Pipeline en Ambos Sistemas

### 1. El Pipeline en Jenkins (`Jenkinsfile` Declarativo)

```groovy
@Library('devops')_

pipeline {
    agent { label 'COMPILER_LINUX' }

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    environment {
        ARTIFACTORY_CRED = credentials('artifactory-deploy-token')
    }

    stages {
        stage('Build') {
            steps {
                sh 'npm ci'
                sh 'npm run build'
                stash name: 'dist-files', includes: 'dist/**'
            }
        }
        stage('Test & Sonar') {
            steps {
                sh 'npm test'
                withSonarQubeEnv('SonarQube-Prod') {
                    sh 'sonar-scanner -Dsonar.qualitygate.wait=true'
                }
            }
        }
        stage('Deploy') {
            when { branch 'main' }
            steps {
                input message: '¿Desplegar a Producción?'
                unstash 'dist-files'
                sh 'curl -u $ARTIFACTORY_CRED -T dist/app.zip https://artifactory.example.com/artifactory/generic/app.zip'
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}
```

---

### 2. El Pipeline Equivalente en GitLab (`.gitlab-ci.yml`)

```yaml
stages:
  - build
  - test
  - deploy

default:
  image: node:20-alpine
  tags:
    - linux-docker

build_job:
  stage: build
  script:
    - npm ci
    - npm run build
  artifacts:
    name: "dist-$CI_COMMIT_SHORT_SHA"
    paths:
      - dist/
    expire_in: 1 day

test_job:
  stage: test
  script:
    - npm test

sonar_job:
  stage: test
  image: sonarsource/sonar-scanner-cli:latest
  variables:
    SONAR_TOKEN: "$SONARQUBE_TOKEN"
    SONAR_HOST_URL: "https://sonar.example.com"
  script:
    - sonar-scanner -Dsonar.qualitygate.wait=true
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH == "main"'

deploy_prod:
  stage: deploy
  image: curlimages/curl:latest
  environment:
    name: production
    url: https://app.example.com
  resource_group: production_lock
  dependencies:
    - build_job
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
      when: manual
  script:
    - curl -u "${ARTIFACTORY_USER}:${ARTIFACTORY_PASSWORD}" -T dist/app.zip https://artifactory.example.com/artifactory/generic/app.zip
```

---

## Qué se Gana y Qué se Extraña

### Lo que ganás al migrar a GitLab CI:
- **Cero mantenimiento de plugins:** No más caídas por incompatibilidades de plugins Java al actualizar el core.
- **Entornos aislados y limpios:** Cada job corre por defecto en su propio contenedor Docker limpio (chau dependencias cruzadas en nodos compartidos).
- **Control de flujo integrado al Git:** Los Merge Requests bloquean el merge si el pipeline falla o si la cobertura cae, sin requerir webhooks manuales.
- **Gobernanza centralizada:** Variables, secrets y plantillas compartidas a nivel de Grupo sin copiar configuraciones job por job.

### Lo que podés extrañar de Jenkins:
- **Lógica Groovy arbitraria:** En Jenkins podías instanciar clases Java, manipular mapas y ejecutar bucles complejos libremente. En GitLab el YAML es estático; cualquier lógica algorítmica compleja debe residir en scripts Bash/Python o contenedores auxiliares.
- **Script Console de emergencia:** Si un job se cuelga en Jenkins, la consola Groovy permitía intervenir hilos en caliente. En GitLab la consola Rails existe únicamente en versiones Self-Managed con acceso root al servidor.

---

## Relacionado

- [/article/gitlab/01-fundamentos/](/article/gitlab/01-fundamentos/) — Fundamentos y arquitectura de GitLab.
- [/article/gitlab/03-gitlab-ci-yml-basico/](/article/gitlab/03-gitlab-ci-yml-basico/) — Estructura y sintaxis de `.gitlab-ci.yml`.
- [/article/gitlab/04-rules-workflow-y-needs/](/article/gitlab/04-rules-workflow-y-needs/) — Control de ejecución con rules y pipelines DAG.
- [/article/jenkins/02-pipelines-declarativos-y-scripted/](/article/jenkins/02-pipelines-declarativos-y-scripted/) — Referencia declarativa y scripted en Jenkins.
