---
title: "Reutilización en GitLab CI: Include, Extends y Components"
category: "gitlab"
tags: ["templates", "components", "include", "extends", "shared-library", "modularidad"]
keywords: ["include gitlab ci", "extends gitlab ci", "ci cd components gitlab", "ci cd catalog gitlab", "shared library equivalente gitlab", "reference tag yaml gitlab", "templates gitlab ci"]
description: "Reutilización avanzada de código en GitLab CI: directiva include, herencia con extends, etiquetas !reference y el moderno CI/CD Catalog de componentes."
---

# Reutilización en GitLab CI: Include, Extends y Components

En Jenkins, la modularización y estandarización corporativa se resolvía centralizando lógica Groovy en **Shared Libraries** (`@Library('devops')_`).

En GitLab, la reutilización evolucionó a través de tres niveles:
1. **`extends`** y **`!reference`** (herencia local dentro del mismo proyecto).
2. **`include`** (importación de archivos YAML locales, remotos o de otros repositorios).
3. **CI/CD Components & Catalog** (el reemplazo moderno estándar de las Shared Libraries).

---

## Herencia Local: `extends` y `!reference`

### 1. `extends` (Herencia de Jobs)
Permite que un job herede la configuración de un job base (oculto con punto `.`):

```yaml
.base_deploy:
  image: alpine:latest
  tags: [linux]
  before_script:
    - apk add --no-cache curl jq
  environment:
    action: start

deploy_staging:
  extends: .base_deploy
  stage: deploy
  script:
    - ./deploy.sh staging

deploy_production:
  extends: .base_deploy
  stage: deploy
  script:
    - ./deploy.sh production
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
      when: manual
```

### 2. `!reference` (Reutilización de Bloques Específicos)
Permite reutilizar fragmentos de scripts o listas sin heredar todo el job:

```yaml
.scripts_comunes:
  login_docker:
    - echo "$CI_REGISTRY_PASSWORD" | docker login -u "$CI_REGISTRY_USER" --password-stdin "$CI_REGISTRY"

build_app:
  stage: build
  script:
    - !reference [.scripts_comunes, login_docker]
    - docker build -t mi-app:v1 .
```

---

## Importación Externa con `include`

`include` permite traer configuración desde otros archivos o repositorios:

```yaml
include:
  # 1. Archivo local en el mismo repo
  - local: '/ci/deploy-templates.yml'

  # 2. Archivo en otro proyecto de la misma instancia de GitLab
  - project: 'devops/ci-templates'
    ref: 'v2.1.0'
    file: '/templates/sonarqube.yml'

  # 3. Template oficial provisto por GitLab
  - template: 'Security/Secret-Detection.gitlab-ci.yml'
```

---

## El Reemplazo Moderno de Shared Library: CI/CD Components

A partir de GitLab 16+, el mecanismo oficial y recomendado para compartir pipelines corporativos es el **CI/CD Catalog** y los **CI/CD Components**.

### Estructura de un Proyecto de Componentes:
```text
mi-grupo/ci-components/
├── .gitlab-ci.yml              # Pipeline que valida los componentes del repo
├── README.md                   # Documentación mostrada en el Catálogo
└── templates/
    ├── sonar.yml               # Componente individual
    └── deploy-k8s.yml
```

### Definición del Componente con Parámetros Tipados (`spec:inputs`):

En `templates/sonar.yml`:
```yaml
spec:
  inputs:
    sonar_host:
      type: string
      description: "URL del servidor SonarQube"
    quality_gate:
      type: boolean
      default: true
      description: "Si debe abortar el pipeline al fallar el Quality Gate"

---
sonarqube_analysis:
  image: sonarsource/sonar-scanner-cli:latest
  script:
    - sonar-scanner -Dsonar.host.url="$[[ inputs.sonar_host ]]" -Dsonar.qualitygate.wait=$[[ inputs.quality_gate ]]
```

### Consumo en el Repositorio de la Aplicación:
```yaml
include:
  - component: 'gitlab.example.com/mi-grupo/ci-components/sonar@1.0.0'
    inputs:
      sonar_host: "https://sonar.corp.internal"
      quality_gate: true
```

---

## Si Venís de Jenkins

| En Jenkins | En GitLab |
|---|---|
| `@Library('devops')_` | `include: - component: 'mi-grupo/ci-components/...'` |
| `vars/notificarSlack.groovy` con parámetros | Componente con `spec:inputs` y llamada modular. |
| Versionado de librerías por rama o tag | Componentes fijados por tag semántico (`@1.2.0`) o `@~latest`. |

---

## Relacionado

- [/article/gitlab/03-gitlab-ci-yml-basico/](/article/gitlab/03-gitlab-ci-yml-basico/) — Estructura del YAML de GitLab CI.
- [/article/gitlab/09-pipelines-avanzados/](/article/gitlab/09-pipelines-avanzados/) — Orquestación parent-child y multi-proyecto.
- [/article/jenkins/03-shared-libraries/](/article/jenkins/03-shared-libraries/) — Shared Libraries en Jenkins.
