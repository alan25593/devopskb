---
title: "Imágenes Personalizadas: Plugins, Entrypoint Wrappers y Runners Multi-Toolchain"
category: "docker"
tags: ["dockerfile", "imagenes", "entrypoint", "plugins", "ci-runners", "patrones"]
keywords: ["extender imagen oficial docker", "agregar plugin imagen docker", "entrypoint wrapper", "exec entrypoint original", "volumen pisa archivos imagen", "archivos de la imagen no aparecen en el volumen", "sonarqube plugin docker", "community branch plugin", "crlf entrypoint", "exec format error", "imagen runner ci", "varias versiones node docker", "update-alternatives docker", "dotnet-install docker", "ssh-keyscan dockerfile", "build arg url"]
description: "Patrones para extender imágenes oficiales sin romperlas: multi-stage para descargar plugins, entrypoint wrapper que hace exec del original, el problema de los volúmenes que ocultan archivos de la imagen, CRLF en scripts, y cómo construir imágenes de runners de CI con varias versiones de toolchains."
---

# Imágenes Personalizadas

Regla: **extender, no reemplazar**. Partir de la imagen oficial, agregar lo mínimo y terminar llamando al entrypoint original para conservar su lógica de inicialización.

---

## 1. Agregar un plugin a una imagen oficial (caso SonarQube)

Requisitos del caso:
- La imagen oficial no trae `unzip` → descargar en una etapa aparte.
- `/opt/sonarqube/extensions` es un **volumen** → lo que la imagen ponga ahí no aparece si el volumen ya existe.
- Plugin y servidor deben ser de la misma versión → un único `ARG` para ambos.

```dockerfile
ARG SONARQUBE_VERSION=10.6.0-community
ARG PLUGIN_VERSION=1.21.0

# Etapa 1: descargar con herramientas que la imagen final no tiene
FROM alpine:3.20 AS downloader
ARG PLUGIN_VERSION
RUN apk add --no-cache curl unzip && mkdir -p /out/webapp && \
    curl -fsSL -o /out/plugin.jar \
      "https://github.com/mc1arke/sonarqube-community-branch-plugin/releases/download/${PLUGIN_VERSION}/sonarqube-community-branch-plugin-${PLUGIN_VERSION}.jar" && \
    curl -fsSL -o /tmp/webapp.zip \
      "https://github.com/mc1arke/sonarqube-community-branch-plugin/releases/download/${PLUGIN_VERSION}/sonarqube-webapp.zip" && \
    unzip -q /tmp/webapp.zip -d /out/webapp

# Etapa 2: imagen final
FROM sonarqube:${SONARQUBE_VERSION}
ARG PLUGIN_VERSION
USER root

# El jar va FUERA de extensions/ (es un volumen): el wrapper lo copia al arrancar
COPY --from=downloader --chown=sonarqube:root /out/plugin.jar /opt/branch-plugin/
COPY --from=downloader --chown=sonarqube:root /out/webapp/ /opt/sonarqube/web/

COPY entrypoint-wrapper.sh /opt/branch-plugin/entrypoint-wrapper.sh
# Por si el archivo llega con CRLF desde Windows
RUN sed -i 's/\r$//' /opt/branch-plugin/entrypoint-wrapper.sh && \
    chmod 555 /opt/branch-plugin/entrypoint-wrapper.sh

ENV PLUGIN_VERSION=${PLUGIN_VERSION}
ENV SONAR_WEB_JAVAADDITIONALOPTS="-javaagent:/opt/sonarqube/extensions/plugins/sonarqube-community-branch-plugin-${PLUGIN_VERSION}.jar=web"
ENV SONAR_CE_JAVAADDITIONALOPTS="-javaagent:/opt/sonarqube/extensions/plugins/sonarqube-community-branch-plugin-${PLUGIN_VERSION}.jar=ce"

USER sonarqube
ENTRYPOINT ["/opt/branch-plugin/entrypoint-wrapper.sh"]
```

### Entrypoint wrapper

```bash
#!/bin/bash
# Instala el plugin en el volumen y delega en el entrypoint original.
set -euo pipefail

PLUGINS_DIR="/opt/sonarqube/extensions/plugins"
TARGET="${PLUGINS_DIR}/sonarqube-community-branch-plugin-${PLUGIN_VERSION}.jar"

mkdir -p "$PLUGINS_DIR"
# Borrar versiones anteriores: SonarQube no arranca con dos versiones del mismo plugin
find "$PLUGINS_DIR" -maxdepth 1 -name 'sonarqube-community-branch-plugin-*.jar' ! -path "$TARGET" -print -delete
cp -f /opt/branch-plugin/plugin.jar "$TARGET"

exec /opt/sonarqube/docker/entrypoint.sh "$@"     # exec: PID 1 recibe las señales
```

| Detalle | Por qué importa |
|---------|-----------------|
| `exec` al final | Sin `exec`, el wrapper queda como PID 1 y `docker stop` no llega al proceso real → kill a los 10 s, posible corrupción |
| `"$@"` | Preserva el `CMD`/`command:` original |
| Limpiar versiones viejas | En upgrades, el volumen conserva el jar anterior |
| `sed 's/\r$//'` | Un script con CRLF falla con `exec format error` o `/bin/bash^M: bad interpreter` |

Compose con dependencia saludable:

```yaml
services:
  sonarqube:
    build: ./server
    image: miorg/sonarqube:10.6.0-branch
    depends_on:
      db: { condition: service_healthy }
    environment:
      - SONAR_JDBC_URL=jdbc:postgresql://db:5432/sonar
    env_file: [./config/.env]               # SONAR_JDBC_PASSWORD
    volumes:
      - sonarqube_data:/opt/sonarqube/data
      - sonarqube_extensions:/opt/sonarqube/extensions
      - sonarqube_logs:/opt/sonarqube/logs
  db:
    image: postgres:16.4
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sonar -d sonar"]
      interval: 10s
      retries: 5
      start_period: 30s
```

> SonarQube (Elasticsearch embebido) necesita en el **host**: `sysctl -w vm.max_map_count=524288` y `fs.file-max=131072`. Persistirlo en `/etc/sysctl.d/99-sonarqube.conf`.

---

## 2. El volumen que "oculta" archivos de la imagen

| Montaje | Comportamiento |
|---------|----------------|
| Volumen nombrado **nuevo/vacío** | Docker copia el contenido de la imagen en ese path al volumen (una sola vez) |
| Volumen nombrado **con datos** | Se ve el volumen; los archivos nuevos de la imagen **no aparecen** |
| Bind mount | Siempre oculta lo que la imagen tenga en ese path |

Por eso, para archivos que la imagen debe "inyectar" en un path persistente: guardarlos fuera (`/opt/<algo>/`) y copiarlos en el entrypoint.

---

## 3. Imágenes de runners de CI multi-toolchain

```dockerfile
FROM ubuntu:22.04
LABEL description="CI runner: build-essential + .NET + Node"

# URL configurable para no depender de un host fijo al buildear
ARG AGENT_JAR_URL=http://jenkins:8080/jnlpJars/agent.jar

RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential cmake curl wget git openssh-client openjdk-17-jre-headless locales ca-certificates && \
    locale-gen en_US.UTF-8 && rm -rf /var/lib/apt/lists/*
ENV LANG=en_US.UTF-8 LANGUAGE=en_US:en LC_ALL=en_US.UTF-8

RUN useradd -m -d /home/ci -s /bin/bash ci

# Varios SDK de .NET lado a lado con dotnet-install
RUN curl -fsSL https://dot.net/v1/dotnet-install.sh -o /tmp/dotnet-install.sh && chmod +x /tmp/dotnet-install.sh && \
    for v in 6.0.425 8.0.403; do /tmp/dotnet-install.sh --install-dir /opt/dotnet --version $v; done && \
    rm /tmp/dotnet-install.sh
ENV DOTNET_ROOT=/opt/dotnet PATH="/opt/dotnet:/opt/dotnet/tools:${PATH}" DOTNET_CLI_TELEMETRY_OPTOUT=1

# Varias versiones de Node: alternativas + alias explícitos
RUN for v in 20.17.0 22.9.0; do \
      mkdir -p /opt/node/$v && \
      curl -fsSL https://nodejs.org/dist/v$v/node-v$v-linux-x64.tar.xz | tar -xJ -C /opt/node/$v --strip-components=1 && \
      ln -s /opt/node/$v/bin/node /usr/local/bin/node${v%%.*}; \
    done && \
    update-alternatives --install /usr/bin/node node /opt/node/20.17.0/bin/node 20 && \
    update-alternatives --install /usr/bin/node node /opt/node/22.9.0/bin/node 22 && \
    update-alternatives --set node /opt/node/20.17.0/bin/node

# known_hosts del proveedor Git (clonar por SSH sin prompt)
RUN mkdir -p /home/ci/.ssh && ssh-keyscan github.com bitbucket.org >> /home/ci/.ssh/known_hosts && \
    chown -R ci:ci /home/ci/.ssh && chmod 700 /home/ci/.ssh && chmod 600 /home/ci/.ssh/known_hosts

RUN curl -fsSL -o /home/ci/agent.jar "${AGENT_JAR_URL}" && chown ci:ci /home/ci/agent.jar

USER ci
WORKDIR /home/ci
CMD ["java", "-jar", "/home/ci/agent.jar"]
```

```bash
docker build --network=host \
  --build-arg AGENT_JAR_URL=http://localhost:8080/jnlpJars/agent.jar \
  -t compiler-linux-agent:2024.10 -f Dockerfile_COMPILER .
```

| Práctica | Motivo |
|----------|--------|
| Una imagen por familia de toolchain (`-node`, `-net10`, `-sqlplus`, `-awscli`) | Imágenes más chicas, upgrades independientes |
| `ARG` para URLs de dependencias internas | Reconstruir en otro entorno (DRP, lab) sin editar el Dockerfile |
| Alias `node20`/`node22` además de `update-alternatives` | Builds legacy pueden fijar versión sin cambiar el default |
| `ssh-keyscan` en build | Evita `Host key verification failed` en el primer clone |
| Tag versionado (`2024.10`) además de `latest` | Rollback posible; algunos orquestadores con *never pull* matchean el **string exacto** del tag |
| Evitar `curl -k` | Desactiva TLS; si hace falta, agregar la CA interna a `/usr/local/share/ca-certificates/` + `update-ca-certificates` |

> **SSH con servidores Git viejos:** OpenSSH ≥ 8.8 deshabilita `ssh-rsa` (SHA-1). Si el clone falla con `no matching host key type found`, la solución temporal es `HostkeyAlgorithms +ssh-rsa` / `PubkeyAcceptedAlgorithms +ssh-rsa` para ese host en `~/.ssh/config`; la definitiva, claves ed25519.

---

## 4. Antipatrones vistos en producción

| Antipatrón | Mejor |
|------------|-------|
| `command: sh -c "apk add logrotate && crond && <app>"` | Imagen propia con lo necesario, o un sidecar de logrotate; o logging del daemon |
| `echo 'IP host' >> /etc/hosts` en `command` | `extra_hosts:` |
| `image: vendor/app:latest` + `--pull always` | Tag fijo; upgrades explícitos en un commit |
| Credenciales en `ARG`/`ENV` | Quedan en `docker history`. Usar `RUN --mount=type=secret` (ver [BuildKit](/article/docker/10-buildkit-cache/)) |
| Secret de agente / token inline en `environment:` | `env_file` fuera del repo o secret manager |
