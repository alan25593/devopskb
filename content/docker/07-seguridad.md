---
title: "Docker Seguridad: Hardening, Secrets y Superfice de Ataque"
category: "docker"
tags: ["seguridad", "hardening", "secrets", "usuario-no-root", "scan"]
keywords: ["docker seguridad", "contenedor root", "usuario no root", "docker secrets", "escanear vulnerabilidades imagen", "trivy docker", "readonly container", "capabilities linux", "seccomp docker", "hardening contenedor", "secret en docker compose", "no correr como root", "imagen segura"]
description: "Hardening de contenedores Docker: usuario no-root, secrets, capabilities, filesystem read-only, escaneo de vulnerabilidades y configuraciones seguras para producción."
---

# Docker Seguridad

## Contenido

- [El problema de correr como root](#el-problema-de-correr-como-root)
- [Filesystem read-only](#filesystem-read-only)
- [Limitar capabilities de Linux](#limitar-capabilities-de-linux)
- [Secrets — no hardcodees credenciales](#secrets-—-no-hardcodees-credenciales)
- [Escaneo de vulnerabilidades](#escaneo-de-vulnerabilidades)
- [No-new-privileges y seccomp](#no-new-privileges-y-seccomp)
- [Checklist de seguridad para producción](#checklist-de-seguridad-para-producción)

---

## El problema de correr como root

Por defecto, los procesos dentro de un contenedor corren como `root` (UID 0). Si hay una vulnerabilidad en tu app y el atacante escapa el contenedor, tiene acceso root al host.

```dockerfile
# ✗ Mal — proceso corre como root
FROM node:20-alpine
COPY . .
RUN npm ci
CMD ["node", "server.js"]

# ✓ Bien — usuario no privilegiado
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY --chown=node:node . .
USER node
CMD ["node", "server.js"]
```

```bash
# Verificar con qué usuario corre un contenedor
docker exec mi-contenedor whoami
docker inspect --format='{{.Config.User}}' mi-contenedor
```

---

## Filesystem read-only

Monta el sistema de archivos del contenedor como solo lectura. Si el proceso es comprometido, no puede escribir en el disco.

```bash
docker run -d \
  --read-only \
  --tmpfs /tmp \
  --tmpfs /var/run \
  mi-app:latest
```

En Compose:

```yaml
services:
  api:
    image: mi-app:latest
    read_only: true
    tmpfs:
      - /tmp
      - /var/run
```

---

## Limitar capabilities de Linux

Los contenedores heredan un set de capabilities de Linux. El principio de mínimo privilegio: quitar todo y agregar solo lo necesario.

```bash
# Quitar todas las capabilities y agregar solo las necesarias
docker run -d \
  --cap-drop ALL \
  --cap-add NET_BIND_SERVICE \
  --cap-add CHOWN \
  mi-app:latest
```

Capabilities comunes:
| Capability | Para qué sirve |
|---|---|
| `NET_BIND_SERVICE` | Bindear a puertos < 1024 |
| `CHOWN` | Cambiar owner de archivos |
| `SETUID` / `SETGID` | Cambiar UID/GID del proceso |
| `SYS_PTRACE` | Depuración (NUNCA en prod) |

```yaml
# compose.yml
services:
  api:
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
```

---

## Secrets — no hardcodees credenciales

### Docker Secrets (Docker Swarm)

```bash
# Crear un secret desde archivo
echo "mi-password-seguro" | docker secret create db_password -

# Usar en el servicio
docker service create \
  --name api \
  --secret db_password \
  mi-app:latest
# El secret queda disponible en /run/secrets/db_password
```

### Secrets en Compose (desarrollo)

```yaml
services:
  api:
    image: mi-app:latest
    secrets:
      - db_password
      - api_key
    environment:
      DB_PASSWORD_FILE: /run/secrets/db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt   # ¡agregar al .gitignore!
  api_key:
    external: true                     # secret externo (Swarm)
```

```bash
# En la app, leer el secret desde el archivo
const password = fs.readFileSync('/run/secrets/db_password', 'utf8').trim()
```

### Build-time secrets (sin dejar rastro en capas)

```dockerfile
# syntax=docker/dockerfile:1
FROM python:3.12-slim

# El secret NO queda en ninguna capa de la imagen
RUN --mount=type=secret,id=pip_token \
    PIP_INDEX_URL=$(cat /run/secrets/pip_token) \
    pip install --no-cache-dir -r requirements.txt
```

```bash
docker build --secret id=pip_token,src=./pip_token.txt .
```

---

## Escaneo de vulnerabilidades

### Trivy (el más usado en CI/CD)

```bash
# Instalar
brew install trivy

# Escanear imagen local
trivy image mi-app:latest

# Solo vulnerabilidades críticas y altas
trivy image --severity CRITICAL,HIGH mi-app:latest

# Escanear y fallar el build si hay CRITICAL
trivy image --exit-code 1 --severity CRITICAL mi-app:latest

# Escanear un Dockerfile
trivy config ./Dockerfile

# Escanear el filesystem del proyecto
trivy fs .
```

### Docker Scout (integrado en Docker Desktop)

```bash
# Escanear imagen
docker scout cves mi-app:latest

# Ver recomendaciones de imagen base más segura
docker scout recommendations mi-app:latest

# Comparar dos versiones
docker scout compare mi-app:v1.1 mi-app:v1.2
```

### En GitHub Actions

```yaml
- name: Scan image for vulnerabilities
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.REGISTRY }}/mi-app:${{ github.sha }}
    format: sarif
    output: trivy-results.sarif
    severity: CRITICAL,HIGH
    exit-code: 1
```

---

## No-new-privileges y seccomp

```bash
# Prevenir que el proceso escale privilegios con setuid
docker run -d \
  --security-opt no-new-privileges:true \
  mi-app:latest

# Aplicar perfil seccomp personalizado
docker run -d \
  --security-opt seccomp=./seccomp-profile.json \
  mi-app:latest

# Desactivar seccomp (solo para debug)
docker run --security-opt seccomp=unconfined mi-app:latest
```

---

## Checklist de seguridad para producción

```
✓ Imagen base con tag fijo (no :latest)
✓ Multi-stage build — imagen final sin herramientas de build
✓ Usuario no-root (USER appuser en Dockerfile)
✓ --read-only filesystem + tmpfs para /tmp
✓ --cap-drop ALL + solo caps necesarias
✓ --security-opt no-new-privileges:true
✓ Sin secrets en variables de entorno hardcodeadas
✓ .dockerignore excluye .env, *.pem, node_modules
✓ Trivy / Docker Scout en el pipeline de CI
✓ Lifecycle policy en el registry (borrar imágenes viejas)
✓ Límites de CPU y memoria definidos
```
