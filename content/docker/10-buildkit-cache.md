---
title: "BuildKit Avanzado y Caché en CI/CD"
category: "Docker"
tags: ["docker", "buildkit", "cache", "ci-cd"]
description: "Optimiza tus tiempos de build con BuildKit y cachés de montaje."
---

# BuildKit Avanzado y Caché en CI/CD

Si tus builds de Docker tardan una vida cada vez que subís un cambio, es hora de exprimir BuildKit. Esta herramienta viene a reemplazar el builder tradicional de Docker y te permite paralelizar etapas, usar secrets sin dejarlos en la imagen y, lo más jugoso: **Caché avanzado**.

## Habilitar BuildKit

En las versiones modernas de Docker ya viene por defecto, pero si estás en algo legacy o querés forzarlo por consola en tu CI/CD:

```bash
export DOCKER_BUILDKIT=1
```

## El comodín: `mount=type=cache`

Esto es magia pura para lenguajes como Node, Go o Python. En vez de bajar las dependencias desde cero cada vez que cambia el `package.json` o `go.mod`, montás un volumen de caché exclusivo durante el build.

Mira este `Dockerfile` de ejemplo para Node.js:

```dockerfile
# syntax=docker/dockerfile:1
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Acá ocurre la magia: guardamos el caché de npm
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .

CMD ["npm", "start"]
```
Esa línea `# syntax=docker/dockerfile:1` al inicio es obligatoria para decirle a Docker que use las features nuevas del parser.

## Caché Distribuido en CI/CD (GitHub Actions / GitLab CI)

Cuando construís en un runner de CI/CD (que suele ser efímero), la caché local desaparece. La solución es exportar la caché a un registry (como Docker Hub o AWS ECR) e importarla en la siguiente corrida.

### Ejemplo con Docker CLI (Inline/Registry cache)

Usamos `buildx` (el CLI de BuildKit):

```bash
# Habilitar el builder
docker buildx create --use --name mi-builder

# Build y push usando caché desde el registry
docker buildx build \
  --push \
  -t midominio/app:latest \
  --cache-from type=registry,ref=midominio/app:buildcache \
  --cache-to type=registry,ref=midominio/app:buildcache,mode=max \
  .
```

- `--cache-from`: De dónde baja la caché para este build.
- `--cache-to`: Dónde sube la caché nueva (el `mode=max` guarda todas las capas, no solo la resultante, súper útil para multi-stage).

Implementá esto y vas a ver cómo los tiempos de despliegue se desploman. ¡Tus devs te lo van a agradecer!
