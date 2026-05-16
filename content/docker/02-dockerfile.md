---
title: "Dockerfile: Instrucciones, Multi-Stage y Optimización"
category: "docker"
tags: ["dockerfile", "build", "multi-stage", "optimizacion", "capas"]
keywords: ["escribir dockerfile", "instrucciones dockerfile", "from run copy add", "multi stage build", "optimizar imagen", "reducir tamaño imagen", "imagen liviana", "alpine", "build arg", "entrypoint vs cmd", "cache de capas", "dockerignore", "imagen produccion"]
description: "Instrucciones clave del Dockerfile, estrategias de multi-stage build para producción y técnicas para reducir el tamaño y superficie de ataque de tus imágenes."
---

# Dockerfile

## Contenido

- [Instrucciones esenciales](#instrucciones-esenciales)
- [ENTRYPOINT vs CMD](#entrypoint-vs-cmd)
- [Orden de instrucciones y caché de capas](#orden-de-instrucciones-y-caché-de-capas)
- [Multi-Stage Build](#multi-stage-build)
- [.dockerignore](#dockerignore)
- [Optimización de imágenes](#optimización-de-imágenes)
- [Build arguments y targets](#build-arguments-y-targets)
- [Buenas prácticas de seguridad](#buenas-prácticas-de-seguridad)

---

## Instrucciones esenciales

```dockerfile
# Imagen base — siempre con tag explícito, nunca :latest en producción
FROM node:20-alpine

# Metadata de la imagen
LABEL maintainer="infra@empresa.com" version="1.0"

# Variables en tiempo de BUILD (no persisten en runtime)
ARG NODE_ENV=production

# Variables de entorno en runtime
ENV APP_PORT=3000

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar archivos del host al contenedor
# COPY <src-host> <dest-container>
COPY package*.json ./

# Ejecutar comandos durante el build (cada RUN = nueva capa)
RUN npm ci --only=production

# Copiar el resto del código
COPY . .

# Documentar el puerto (no lo publica, es solo informativo)
EXPOSE 3000

# Usuario no-root para seguridad
USER node

# Proceso principal del contenedor — forma exec (recomendada)
ENTRYPOINT ["node"]
CMD ["server.js"]
```

---

## ENTRYPOINT vs CMD

| | `ENTRYPOINT` | `CMD` |
|---|---|---|
| Propósito | Proceso principal fijo | Argumentos por defecto |
| Se puede sobreescribir | Solo con `--entrypoint` | Sí, al final del `docker run` |
| Forma recomendada | `["ejecutable", "arg"]` | `["arg1", "arg2"]` |

```dockerfile
# Combinación típica: entrypoint fijo + args sobreescribibles
ENTRYPOINT ["python", "app.py"]
CMD ["--port", "8080"]

# docker run mi-imagen --port 9090  → sobreescribe CMD
# docker run mi-imagen              → usa CMD default
```

---

## Orden de instrucciones y caché de capas

Docker cachea cada capa. Si una capa cambia, todas las siguientes se reconstruyen. **Poné lo que cambia menos frecuentemente arriba.**

```dockerfile
# ✗ Mal orden — cualquier cambio de código invalida la capa de dependencias
FROM node:20-alpine
COPY . .
RUN npm ci

# ✓ Buen orden — las dependencias se cachean mientras package.json no cambie
FROM node:20-alpine
COPY package*.json ./
RUN npm ci
COPY . .
```

---

## Multi-Stage Build

Separa el entorno de build del de runtime. La imagen final solo lleva lo necesario para correr.

```dockerfile
# ── Stage 1: Builder ──────────────────────────────────
FROM golang:1.22-alpine AS builder

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server ./cmd/server

# ── Stage 2: Runtime ──────────────────────────────────
FROM scratch AS runtime
# "scratch" = imagen vacía, ideal para binarios estáticos de Go

COPY --from=builder /app/server /server
EXPOSE 8080
ENTRYPOINT ["/server"]
```

Para Python/Node con dependencias:

```dockerfile
FROM python:3.12-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.12-slim AS runtime
COPY --from=builder /install /usr/local
COPY . .
USER nobody
CMD ["python", "main.py"]
```

Construir un stage específico:
```bash
docker build --target builder -t mi-app:debug .
docker build --target runtime -t mi-app:prod .
```

---

## .dockerignore

Excluir archivos del contexto de build — reduce el tamaño enviado al daemon y evita filtrar secrets:

```dockerignore
# Control de versiones
.git
.gitignore

# Dependencias locales
node_modules
vendor/

# Entornos y secrets
.env
.env.*
*.pem
*.key
secrets/

# Artefactos de build locales
dist/
build/
*.log

# IDE
.vscode/
.idea/

# Docker
Dockerfile*
docker-compose*.yml
```

---

## Optimización de imágenes

### Elegir la imagen base correcta

| Base | Tamaño aprox. | Cuándo usarla |
|---|---|---|
| `ubuntu:22.04` | ~80MB | Necesitás apt y herramientas de sistema |
| `debian:bookworm-slim` | ~75MB | Debian sin extras |
| `alpine:3.19` | ~7MB | Imagen mínima, musl libc |
| `distroless` | ~2-20MB | Solo runtime, sin shell (máxima seguridad) |
| `scratch` | 0MB | Binarios estáticos (Go, Rust) |

### Agrupar RUN para reducir capas

```dockerfile
# ✗ Cada RUN es una capa separada
RUN apt-get update
RUN apt-get install -y curl
RUN rm -rf /var/lib/apt/lists/*

# ✓ Una sola capa, más limpio
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*
```

### Verificar el tamaño final

```bash
# Ver tamaño de todas las capas
docker history mi-app:prod

# Comparar imágenes
docker images mi-app
```

---

## Build arguments y targets

```bash
# Pasar ARG en tiempo de build
docker build --build-arg NODE_ENV=production -t mi-app:prod .

# Build con Dockerfile alternativo
docker build -f Dockerfile.prod -t mi-app:prod .

# Build desde un directorio diferente
docker build -f ./docker/Dockerfile.api -t mi-api:latest ./api

# Ver el contexto que se envía al daemon (útil para debuggear .dockerignore)
docker build --no-cache . 2>&1 | head -5
```

---

## Buenas prácticas de seguridad

```dockerfile
# 1. Nunca corras como root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# 2. Copiá solo lo necesario
COPY --chown=appuser:appgroup ./dist /app/dist

# 3. No hardcodees secrets — usá ARG para build-time o secrets en runtime
# ✗ Mal
ENV DB_PASSWORD=supersecret123

# ✓ Bien: inyectá en runtime vía --env o docker secrets
ENV DB_PASSWORD=""

# 4. Usá versiones fijas de la imagen base
FROM node:20.11.0-alpine3.19   # no: node:20-alpine, no: node:latest
```
