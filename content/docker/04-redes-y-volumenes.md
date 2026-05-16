---
title: "Docker Redes y Volúmenes: Networking y Persistencia"
category: "docker"
tags: ["networking", "redes", "volumenes", "persistencia", "bridge", "host"]
keywords: ["redes docker", "network docker", "comunicacion entre contenedores", "bridge network", "host network", "overlay network", "volumen docker", "persistir datos", "bind mount", "named volume", "crear red", "conectar contenedor red", "dns interno docker", "puerto contenedor", "exponer puerto"]
description: "Tipos de redes en Docker, comunicación entre contenedores, DNS interno y gestión de volúmenes para persistencia de datos."
---

# Docker Redes y Volúmenes

## Contenido

- [Tipos de red](#tipos-de-red)
- [Red Bridge (la más usada)](#red-bridge-la-más-usada)
- [Red por defecto vs red custom](#red-por-defecto-vs-red-custom)
- [Red Host](#red-host)
- [Mapeo de puertos](#mapeo-de-puertos)
- [Volúmenes](#volúmenes)
- [Backup y restore de volúmenes](#backup-y-restore-de-volúmenes)
- [Limpieza de redes y volúmenes](#limpieza-de-redes-y-volúmenes)

---

## Tipos de red

| Driver | Cuándo usarlo |
|---|---|
| `bridge` | Default para contenedores en el mismo host. Los contenedores se ven entre sí por nombre. |
| `host` | El contenedor comparte la red del host directamente. Sin aislamiento, máximo performance. |
| `none` | Sin red. Contenedor completamente aislado. |
| `overlay` | Comunicación entre hosts diferentes (Docker Swarm). |
| `macvlan` | El contenedor aparece como un dispositivo físico en la red. |

---

## Red Bridge (la más usada)

```bash
# Crear una red bridge custom
docker network create mi-red

# Crear con subnet y gateway específicos
docker network create \
  --driver bridge \
  --subnet 172.20.0.0/16 \
  --gateway 172.20.0.1 \
  mi-red-custom

# Listar redes
docker network ls

# Inspeccionar una red (ver contenedores conectados, IPs)
docker network inspect mi-red

# Conectar un contenedor a una red
docker run -d --name api --network mi-red mi-api:latest

# Conectar un contenedor ya existente a una red adicional
docker network connect mi-red otro-contenedor

# Desconectar un contenedor de una red
docker network disconnect mi-red otro-contenedor
```

Los contenedores en la misma red bridge custom se comunican **por nombre de contenedor** — Docker hace de DNS interno:

```bash
# Desde dentro del contenedor "api", podés hacer:
curl http://postgres:5432
ping redis
```

---

## Red por defecto vs red custom

La red `bridge` por defecto (sin especificar) **no tiene DNS interno** — los contenedores no se comunican por nombre, solo por IP.

```bash
# ✗ Esto no funciona con la red bridge por defecto
docker run -d --name api mi-api
docker run -d --name db postgres
# api no puede hacer `curl db:5432`

# ✓ Con red custom sí funciona
docker network create backend
docker run -d --name api --network backend mi-api
docker run -d --name db --network backend postgres
# api puede hacer `curl db:5432`
```

---

## Red Host

El contenedor usa directamente la red del host. Sin NAT, sin mapeo de puertos.

```bash
docker run -d --network host nginx
# nginx escucha en el puerto 80 del host directamente
# No usás -p porque no hay NAT
```

Útil para: monitoreo (prometheus, node-exporter), aplicaciones con alto throughput de red.

---

## Mapeo de puertos

```bash
# Puerto específico del host → puerto del contenedor
docker run -p 8080:80 nginx

# Bindear a una IP específica del host (no exponer a todas las interfaces)
docker run -p 127.0.0.1:8080:80 nginx

# Puerto aleatorio del host
docker run -p 80 nginx

# Ver qué puertos están mapeados
docker port mi-contenedor

# Ver todos los puertos de todos los contenedores
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

---

## Volúmenes

### Named Volumes (recomendados para datos persistentes)

Gestionados por Docker. El dato vive aunque borres y recreés el contenedor.

```bash
# Crear un volumen
docker volume create postgres_data

# Usar un volumen
docker run -d \
  --name postgres \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:16-alpine

# Listar volúmenes
docker volume ls

# Inspeccionar (ver ubicación real en el host)
docker volume inspect postgres_data

# Borrar un volumen (solo si ningún contenedor lo usa)
docker volume rm postgres_data

# Borrar todos los volúmenes no usados
docker volume prune
```

### Bind Mounts (mapeo de directorio del host)

El contenedor ve directamente un directorio del host. Cambios en el host se reflejan al instante.

```bash
# Montar directorio actual en /app del contenedor
docker run -v $(pwd):/app mi-app

# Solo lectura
docker run -v $(pwd)/config:/app/config:ro mi-app

# Forma larga (--mount) — más explícita
docker run \
  --mount type=bind,source=$(pwd)/config,target=/app/config,readonly \
  mi-app
```

### Tmpfs (en memoria)

```bash
# Datos en RAM — desaparecen al parar el contenedor
docker run --tmpfs /tmp:size=100m,mode=1777 mi-app
```

---

## Backup y restore de volúmenes

```bash
# Backup de un volumen a un tar.gz en el directorio actual
docker run --rm \
  -v mi_volumen:/data \
  -v $(pwd):/backup \
  alpine \
  tar czf /backup/backup.tar.gz -C /data .

# Restore
docker run --rm \
  -v mi_volumen:/data \
  -v $(pwd):/backup \
  alpine \
  tar xzf /backup/backup.tar.gz -C /data

# Copiar datos de un volumen a otro
docker run --rm \
  -v volumen_origen:/from \
  -v volumen_destino:/to \
  alpine \
  cp -av /from/. /to/
```

---

## Limpieza de redes y volúmenes

```bash
# Borrar redes no usadas por ningún contenedor
docker network prune

# Borrar volúmenes no usados
docker volume prune

# Borrar volúmenes no usados incluyendo los anónimos
docker volume prune -a
```
