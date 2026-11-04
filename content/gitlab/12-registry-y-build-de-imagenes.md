---
title: "Container y Package Registry en GitLab: Build y Publicación"
category: "gitlab"
tags: ["docker", "container-registry", "package-registry", "artifactory", "dind", "buildah"]
keywords: ["gitlab container registry", "gitlab package registry", "docker login ci_job_token", "docker in docker dind gitlab", "buildah gitlab ci", "publicar imagenes docker gitlab", "artifactory vs gitlab registry"]
description: "Aprende a compilar y publicar imágenes Docker y artefactos en GitLab Container/Package Registry usando Docker-in-Docker, Buildah y autenticación efímera."
---

# Container y Package Registry en GitLab CI/CD

GitLab incluye de manera nativa dos registros integrados:
1. **Container Registry:** Para imágenes Docker / OCI.
2. **Package Registry:** Para paquetes de lenguajes (npm, Maven, NuGet, PyPI, paquetes genéricos vía curl).

Esto permite prescindir de servidores externos como JFrog Artifactory o Nexus para muchos flujos, o bien utilizarlos en conjunto manteniendo compatibilidad.

---

## Autenticación Efímera con `CI_JOB_TOKEN`

No necesitás crear usuarios ni contraseñas dedicadas para subir imágenes al registro del mismo proyecto. GitLab expone variables predefinidas en cada job:

```bash
echo "$CI_REGISTRY_PASSWORD" | docker login -u "$CI_REGISTRY_USER" --password-stdin "$CI_REGISTRY"
```
*(Donde `$CI_REGISTRY_PASSWORD` equivale al `$CI_JOB_TOKEN` temporal del job actual).*

---

## Compilación con Docker-in-Docker (DinD)

El método más habitual en runners con executor Docker requiere vincular el servicio `docker:dind`:

```yaml
build_docker_image:
  stage: package
  image: docker:24.0.5
  services:
    - docker:24.0.5-dind
  variables:
    DOCKER_TLS_CERTDIR: "/certs"
    IMAGE_NAME: "$CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA"
  before_script:
    - echo "$CI_REGISTRY_PASSWORD" | docker login -u "$CI_REGISTRY_USER" --password-stdin "$CI_REGISTRY"
  script:
    - docker build --pull -t "$IMAGE_NAME" .
    - docker push "$IMAGE_NAME"
    - |
      if [ "$CI_COMMIT_BRANCH" == "$CI_DEFAULT_BRANCH" ]; then
        docker tag "$IMAGE_NAME" "$CI_REGISTRY_IMAGE:latest"
        docker push "$CI_REGISTRY_IMAGE:latest"
      fi
```

> **Ojo:** Docker-in-Docker requiere que el runner tenga configurado `privileged = true` en su `/etc/gitlab-runner/config.toml`.

---

## Alternativa Segura Rootless: Buildah

Si no deseás otorgar permisos privilegiados (`privileged`) a los runners, la herramienta recomendada por la industria es **Buildah**:

```yaml
build_buildah:
  stage: package
  image: quay.io/buildah/stable:latest
  variables:
    STORAGE_DRIVER: vfs
    BUILDAH_ISOLATION: chroot
  before_script:
    - buildah login -u "$CI_REGISTRY_USER" -p "$CI_REGISTRY_PASSWORD" "$CI_REGISTRY"
  script:
    - buildah bud -t "$CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA" .
    - buildah push "$CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA"
```

---

## GitLab Package Registry (Genérico / Binarios)

Para subir archivos `.zip`, binarios compilados o instaladores sin requerir Artifactory:

```yaml
upload_generic_package:
  stage: package
  image: curlimages/curl:latest
  script:
    - |
      curl --header "JOB-TOKEN: $CI_JOB_TOKEN"            --upload-file dist/app.zip            "${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/packages/generic/backoffice/1.0.0/app.zip"
```

---

## Si Venís de Jenkins y JFrog Artifactory

Si tu infraestructura actual publica artefactos a un Artifactory corporativo, podés mantener exactamente el mismo flujo en GitLab CI usando credenciales del proyecto:

```yaml
upload_to_artifactory:
  stage: package
  image: releases-docker.jfrog.io/jfrog/jfrog-cli-v2-jf:latest
  variables:
    JF_URL: "https://artifactory.example.com"
    JF_USER: "$ARTIFACTORY_USER"
    JF_PASSWORD: "$ARTIFACTORY_PASSWORD"
  script:
    - jf c add corp-artifactory --url "$JF_URL" --user "$JF_USER" --password "$JF_PASSWORD"
    - jf rt upload "dist/*.zip" "generic-local/backoffice/$CI_COMMIT_SHORT_SHA/"
```

---

## Relacionado

- [/article/gitlab/05-variables-y-secretos/](/article/gitlab/05-variables-y-secretos/) — Manejo de credenciales de registros externos.
- [/article/gitlab/06-runners/](/article/gitlab/06-runners/) — Configuración del runner Docker y modo privilegiado.
- [/article/docker/01-fundamentos/](/article/docker/01-fundamentos/) — Creación eficiente de imágenes con Dockerfile.
