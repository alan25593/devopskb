---
title: "Docker Herramientas, Inspección y Limpieza del Sistema"
category: "docker"
tags: ["troubleshooting", "inspect", "stats", "prune", "limpieza", "debug"]
keywords: ["docker prune", "limpiar docker", "liberar espacio docker", "docker system prune", "docker stats", "uso de recursos", "inspeccionar contenedor", "docker inspect", "debug contenedor", "docker events", "espacio en disco docker", "contenedor no arranca", "ver logs error", "docker top", "procesos contenedor"]
description: "Comandos de inspección, monitoreo de recursos, troubleshooting de contenedores y limpieza completa del sistema Docker para recuperar espacio en disco."
---

# Docker Herramientas, Inspección y Limpieza

## Contenido

- [Inspección y metadata](#inspección-y-metadata)
- [Monitoreo de recursos](#monitoreo-de-recursos)
- [Troubleshooting de contenedores](#troubleshooting-de-contenedores)
- [Limpieza del sistema (prune)](#limpieza-del-sistema-prune)
- [Limitar recursos de contenedores](#limitar-recursos-de-contenedores)
- [Copiar y exportar](#copiar-y-exportar)
- [Construir para múltiples plataformas (buildx)](#construir-para-múltiples-plataformas-buildx)

---

## Inspección y metadata

```bash
# Metadata completa de un contenedor (JSON)
docker inspect mi-contenedor

# Extraer campos específicos con Go templates
docker inspect --format='{{.State.Status}}' mi-contenedor
docker inspect --format='{{.NetworkSettings.IPAddress}}' mi-contenedor
docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' mi-contenedor
docker inspect --format='{{.HostConfig.RestartPolicy.Name}}' mi-contenedor

# Ver variables de entorno
docker inspect --format='{{range .Config.Env}}{{println .}}{{end}}' mi-contenedor

# Ver los mounts de un contenedor
docker inspect --format='{{range .Mounts}}{{.Source}} → {{.Destination}}{{println}}{{end}}' mi-contenedor
```

---

## Monitoreo de recursos

```bash
# Ver uso de CPU, memoria, red y disco en tiempo real (todos los contenedores)
docker stats

# Stats de contenedores específicos
docker stats api postgres redis

# Stats en formato no interactivo (para scripts)
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Ver procesos corriendo dentro de un contenedor
docker top mi-contenedor

# Ver uso de disco por imágenes, contenedores y volúmenes
docker system df

# Vista detallada
docker system df -v
```

---

## Troubleshooting de contenedores

```bash
# Ver por qué falló un contenedor (exit code y logs)
docker ps -a
docker logs mi-contenedor --tail 50
docker inspect --format='{{.State.ExitCode}}' mi-contenedor
docker inspect --format='{{.State.Error}}' mi-contenedor

# Entrar a un contenedor que crashea inmediatamente
# Sobreescribir el entrypoint para abrir una shell
docker run -it --entrypoint sh mi-imagen:latest

# Correr contenedor sin el healthcheck (para debuggear healthchecks)
docker run --no-healthcheck mi-imagen

# Verificar conectividad de red desde dentro del contenedor
docker exec mi-contenedor wget -qO- http://otro-servicio:8080/health
docker exec mi-contenedor nslookup postgres

# Ver eventos del daemon Docker en tiempo real
docker events

# Filtrar eventos por tipo
docker events --filter type=container --filter event=die
docker events --since 30m --filter container=mi-contenedor
```

---

## Limpieza del sistema (prune)

### Limpieza selectiva

```bash
# Borrar contenedores detenidos
docker container prune

# Borrar imágenes sin tag (dangling images — resultado de builds)
docker image prune

# Borrar TODAS las imágenes no usadas por ningún contenedor
docker image prune -a

# Borrar volúmenes no usados por ningún contenedor
docker volume prune

# Borrar redes no usadas por ningún contenedor
docker network prune

# Borrar caché de build
docker builder prune

# Borrar toda la caché de build sin confirmación
docker builder prune -af
```

### Limpieza total — el botón nuclear

```bash
# Borra: contenedores detenidos + redes sin uso + imágenes dangling + caché de build
docker system prune

# Borra TODO lo anterior + volúmenes sin uso
docker system prune --volumes

# Sin confirmación (útil en CI)
docker system prune -af --volumes
```

> **Cuidado con `--volumes`** en producción — borra datos persistentes de contenedores que no estén corriendo.

### Ver cuánto espacio vas a recuperar antes de borrar

```bash
docker system df
```

Salida típica:
```
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          15        3         4.2GB     3.1GB (73%)
Containers      2         2         0B        0B
Local Volumes   8         2         12GB      8.5GB (70%)
Build Cache     47        0         2.3GB     2.3GB
```

### Limpieza programada en cron (servidor CI)

```bash
# Limpiar imágenes dangling todos los días a las 2am
0 2 * * * docker image prune -f

# Limpieza agresiva los domingos
0 3 * * 0 docker system prune -af
```

---

## Limitar recursos de contenedores

```bash
# Limitar CPU y memoria
docker run -d \
  --name api \
  --cpus="0.5" \
  --memory="512m" \
  --memory-swap="512m" \
  mi-api:latest

# Ver límites actuales de un contenedor
docker inspect --format='{{.HostConfig.Memory}} bytes, {{.HostConfig.NanoCpus}} nanocpus' mi-api

# Actualizar límites sin recrear el contenedor
docker update --cpus="1" --memory="1g" mi-api
```

---

## Copiar y exportar

```bash
# Exportar el filesystem de un contenedor como tar (sin metadata de imagen)
docker export mi-contenedor > contenedor.tar

# Guardar una imagen completa con capas (para transportar sin registry)
docker save mi-app:v1.2.0 | gzip > mi-app-v1.2.0.tar.gz

# Cargar imagen desde tar
docker load < mi-app-v1.2.0.tar.gz

# Crear imagen desde un contenedor modificado (no recomendado para prod)
docker commit mi-contenedor mi-app:modificada
```

---

## Construir para múltiples plataformas (buildx)

```bash
# Crear builder con soporte multi-plataforma
docker buildx create --name multiarch --use

# Build para AMD64 y ARM64 (Apple M1/M2) y pushear directo
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t miusuario/mi-app:v1.2.0 \
  --push \
  .

# Ver las plataformas disponibles en tu builder
docker buildx inspect --bootstrap
```
