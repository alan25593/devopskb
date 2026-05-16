---
title: "Docker Registry: Hub, ECR, GCR y Gestión de Imágenes"
category: "docker"
tags: ["registry", "ecr", "dockerhub", "push", "pull", "tags"]
keywords: ["subir imagen docker", "docker push", "docker pull", "login registry", "amazon ecr", "google gcr", "registry privado", "taggear imagen", "docker hub", "autenticacion registry", "imagen privada", "registry local", "harbor"]
description: "Login, push y pull de imágenes en Docker Hub, Amazon ECR, Google GCR y registries privados. Gestión de tags y buenas prácticas de versionado."
---

# Docker Registry

## Contenido

- [Docker Hub](#docker-hub)
- [Amazon ECR (Elastic Container Registry)](#amazon-ecr-elastic-container-registry)
- [Google Container Registry / Artifact Registry](#google-container-registry-/-artifact-registry)
- [Registry privado local (para desarrollo o on-premise)](#registry-privado-local-para-desarrollo-o-on-premise)
- [Estrategia de tagging](#estrategia-de-tagging)
- [Inspeccionar imágenes remotas sin bajarlas](#inspeccionar-imágenes-remotas-sin-bajarlas)
- [Política de lifecycle en ECR (limpiar imágenes viejas)](#política-de-lifecycle-en-ecr-limpiar-imágenes-viejas)

---

## Docker Hub

```bash
# Login
docker login

# Login con credenciales (útil en CI)
echo $DOCKER_PASSWORD | docker login -u $DOCKER_USERNAME --password-stdin

# Taggear imagen para Docker Hub (usuario/repo:tag)
docker tag mi-app:latest miusuario/mi-app:v1.2.0
docker tag mi-app:latest miusuario/mi-app:latest

# Push
docker push miusuario/mi-app:v1.2.0
docker push miusuario/mi-app:latest

# Pull
docker pull miusuario/mi-app:v1.2.0

# Logout
docker logout
```

---

## Amazon ECR (Elastic Container Registry)

```bash
# Autenticación (token dura 12hs)
aws ecr get-login-password --region us-east-1 \
  | docker login --username AWS --password-stdin \
    123456789012.dkr.ecr.us-east-1.amazonaws.com

# Crear repositorio (si no existe)
aws ecr create-repository \
  --repository-name mi-app \
  --region us-east-1

# Taggear para ECR
docker tag mi-app:latest \
  123456789012.dkr.ecr.us-east-1.amazonaws.com/mi-app:v1.2.0

# Push
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/mi-app:v1.2.0

# Pull
docker pull 123456789012.dkr.ecr.us-east-1.amazonaws.com/mi-app:v1.2.0

# Listar imágenes en el repositorio
aws ecr list-images --repository-name mi-app --region us-east-1

# Borrar imagen del repositorio
aws ecr batch-delete-image \
  --repository-name mi-app \
  --image-ids imageTag=v1.0.0 \
  --region us-east-1
```

---

## Google Container Registry / Artifact Registry

```bash
# Autenticar con gcloud
gcloud auth configure-docker us-central1-docker.pkg.dev

# Artifact Registry (recomendado sobre GCR)
docker tag mi-app:latest \
  us-central1-docker.pkg.dev/mi-proyecto/mi-repo/mi-app:v1.2.0

docker push us-central1-docker.pkg.dev/mi-proyecto/mi-repo/mi-app:v1.2.0
```

---

## Registry privado local (para desarrollo o on-premise)

```bash
# Levantar un registry local en el puerto 5000
docker run -d \
  --name registry \
  --restart always \
  -p 5000:5000 \
  -v registry_data:/var/lib/registry \
  registry:2

# Taggear y pushear al registry local
docker tag mi-app:latest localhost:5000/mi-app:v1.2.0
docker push localhost:5000/mi-app:v1.2.0

# Listar imágenes en el registry local
curl http://localhost:5000/v2/_catalog
curl http://localhost:5000/v2/mi-app/tags/list
```

---

## Estrategia de tagging

```bash
# En CI/CD — tag con commit SHA (inmutable y trazable)
docker build -t mi-app:${GIT_SHA} .

# Tag semántico adicional
docker tag mi-app:${GIT_SHA} mi-app:v1.2.0

# Tag de rama (mutable, para ambientes de staging)
docker tag mi-app:${GIT_SHA} mi-app:main
docker tag mi-app:${GIT_SHA} mi-app:develop

# Nunca en producción:
docker tag mi-app:latest   # ✗ no sabés qué versión es
```

### Ejemplo completo en GitHub Actions

```yaml
- name: Build and push
  env:
    REGISTRY: 123456789012.dkr.ecr.us-east-1.amazonaws.com
    IMAGE: mi-app
    SHA: ${{ github.sha }}
    TAG: ${{ github.ref_name }}
  run: |
    docker build -t $REGISTRY/$IMAGE:$SHA .
    docker tag $REGISTRY/$IMAGE:$SHA $REGISTRY/$IMAGE:$TAG
    docker push $REGISTRY/$IMAGE:$SHA
    docker push $REGISTRY/$IMAGE:$TAG
```

---

## Inspeccionar imágenes remotas sin bajarlas

```bash
# Ver el digest (hash SHA256 de la imagen)
docker manifest inspect nginx:1.25-alpine

# Ver plataformas disponibles (multi-arch)
docker buildx imagetools inspect nginx:1.25-alpine
```

---

## Política de lifecycle en ECR (limpiar imágenes viejas)

```json
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Mantener últimas 10 imágenes tagged",
      "selection": {
        "tagStatus": "tagged",
        "tagPrefixList": ["v"],
        "countType": "imageCountMoreThan",
        "countNumber": 10
      },
      "action": { "type": "expire" }
    },
    {
      "rulePriority": 2,
      "description": "Borrar imágenes untagged después de 7 días",
      "selection": {
        "tagStatus": "untagged",
        "countType": "sinceImagePushed",
        "countUnit": "days",
        "countNumber": 7
      },
      "action": { "type": "expire" }
    }
  ]
}
```

```bash
aws ecr put-lifecycle-policy \
  --repository-name mi-app \
  --lifecycle-policy-text file://lifecycle.json
```
