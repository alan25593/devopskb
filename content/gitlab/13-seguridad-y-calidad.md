---
title: "Seguridad y Calidad en GitLab CI: SAST, Secretos y SonarQube"
category: "gitlab"
tags: ["seguridad", "calidad", "sast", "secret-detection", "sonarqube", "quality-gate"]
keywords: ["sast gitlab ci", "secret detection gitlab", "sonarqube gitlab ci", "quality gate sonarqube gitlab", "dependency scanning gitlab", "cobertura de codigo gitlab", "junit report gitlab"]
description: "Implementación de escaneos de seguridad y calidad en GitLab CI: SAST, detección de secretos, integración SonarQube con Quality Gate y reportes JUnit."
---

# Seguridad y Calidad en GitLab CI/CD

GitLab incorpora de manera nativa herramientas de escaneo estático (**SAST**), detección de credenciales en commits (**Secret Detection**) y análisis de dependencias. Además, permite integrar motores tradicionales como **SonarQube** exigiendo que el *Quality Gate* pase antes de habilitar el merge.

---

## Secret Detection Nativo (Free)

Para evitar que contraseñas, certificados o tokens se suban por error al repositorio:

```yaml
stages:
  - test

include:
  - template: Security/Secret-Detection.gitlab-ci.yml

secret_detection:
  stage: test
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
```

Si el escaneo detecta un token o clave privada, el job genera un reporte visual en el Merge Request alertando sobre el archivo y la línea exacta.

---

## SAST (Static Application Security Testing)

Analiza el código fuente en busca de vulnerabilidades conocidas (OWASP Top 10):

```yaml
include:
  - template: Security/SAST.gitlab-ci.yml

sast:
  stage: test
```

GitLab detecta automáticamente el lenguaje del proyecto (Java, Python, C#, Go, JavaScript) y lanza los analizadores correspondientes (Semgrep, Flawfinder, etc.).

---

## Integración con SonarQube y Quality Gate Obligatorio

En muchas arquitecturas corporativas, SonarQube sigue siendo el estándar para medir deuda técnica, cobertura y reglas de calidad.

### Pipeline con SonarQube en GitLab CI:
```yaml
sonarqube_check:
  stage: test
  image:
    name: sonarsource/sonar-scanner-cli:latest
    entrypoint: [""]
  variables:
    SONAR_USER_HOME: "${CI_PROJECT_DIR}/.sonar" # Cache de plugins de Sonar
    GIT_DEPTH: "0" # Requiere historial completo de git para asignación de autorías (blame)
  cache:
    key: "${CI_JOB_NAME}"
    paths:
      - .sonar/cache
  script:
    - >
      sonar-scanner
      -Dsonar.host.url="${SONAR_HOST_URL}"
      -Dsonar.token="${SONAR_TOKEN}"
      -Dsonar.qualitygate.wait=true
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH == "main"'
```

> **Truco:** El parámetro `-Dsonar.qualitygate.wait=true` pausa el comando hasta que SonarQube computa el análisis. Si el Quality Gate no pasa (por ejemplo, cobertura < 80% o nuevos bugs), el job falla y GitLab bloquea el merge en el MR.

---

## Métricas de Cobertura y Reportes de Tests

### 1. Regex de Cobertura
GitLab puede extraer el porcentaje de cobertura de los logs del comando de test para mostrar un badge en el repositorio:

```yaml
test_backend:
  stage: test
  script:
    - pytest --cov=app tests/
  coverage: '/TOTAL.*\s+(\d+%)$/'
```

### 2. Reporte JUnit de Pruebas Unitarias
Al exportar los tests a formato XML de JUnit, la interfaz del Merge Request muestra qué pruebas fallaron sin necesidad de abrir la consola de logs:

```yaml
test_frontend:
  stage: test
  script:
    - npm test -- --reporters=default --reporters=jest-junit
  artifacts:
    when: always
    reports:
      junit: junit.xml
```

---

## Si Venís de Jenkins

| En Jenkins | En GitLab |
|---|---|
| `withSonarQubeEnv('Server')` + `waitForQualityGate()` | Ejecutar `sonar-scanner -Dsonar.qualitygate.wait=true`. |
| Plugins de escaneo de secretos en Jenkins Controller | Template nativo `Security/Secret-Detection.gitlab-ci.yml`. |
| Plugin *JUnit* para publicar reportes en la UI del build | Bloque nativo `artifacts: reports: junit: [...]`. |

---

## Relacionado

- [/article/gitlab/03-gitlab-ci-yml-basico/](/article/gitlab/03-gitlab-ci-yml-basico/) — Estructura básica de `.gitlab-ci.yml`.
- [/article/gitlab/11-merge-requests-y-flujo-git/](/article/gitlab/11-merge-requests-y-flujo-git/) — Bloqueo de merges si fallan los pipelines de calidad.
- [/article/jenkins/06-artifactory-y-sonarqube/](/article/jenkins/06-artifactory-y-sonarqube/) — Integración de SonarQube en Jenkins.
