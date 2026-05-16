---
title: "Docker Fundamentos: Imágenes, Contenedores y Ciclo de Vida"
category: "docker"
tags: ["basics", "contenedores", "imagenes", "ciclo-de-vida"]
keywords: ["que es docker", "diferencia imagen contenedor", "correr contenedor", "listar contenedores", "parar contenedor", "borrar contenedor", "docker run", "docker ps", "docker stop", "docker rm", "contenedor en background", "modo interactivo", "docker pull"]
description: "Conceptos base de Docker: diferencia entre imagen y contenedor, ciclo de vida completo y los comandos más usados en el día a día."
---

# Docker Fundamentos

## Contenido

- [Imagen vs Contenedor](#imagen-vs-contenedor)
- [Ciclo de vida de un contenedor](#ciclo-de-vida-de-un-contenedor)
- [Gestión de contenedores](#gestión-de-contenedores)
- [Ejecutar comandos en un contenedor en ejecución](#ejecutar-comandos-en-un-contenedor-en-ejecución)
- [Variables de entorno y configuración en runtime](#variables-de-entorno-y-configuración-en-runtime)
- [Logs](#logs)
- [Copiar archivos entre host y contenedor](#copiar-archivos-entre-host-y-contenedor)
- [Gestión de imágenes](#gestión-de-imágenes)

---

## Imagen vs Contenedor

| Concepto | Qué es | Analogía |
|---|---|---|
| **Imagen** | Plantilla inmutable de solo lectura. Sistema de archivos en capas. | Clase en OOP |
| **Contenedor** | Instancia en ejecución de una imagen. Tiene su propio proceso y red. | Objeto instanciado |

Una imagen puede generar N contenedores. El contenedor agrega una capa de escritura encima de la imagen (copy-on-write).

---

## Ciclo de vida de un contenedor

```
created → running → paused → running → stopped → removed
                                    ↑
                               (restarted)
```

```bash
# Descargar una imagen del registry
docker pull nginx:1.25-alpine

# Ver imágenes locales
docker images
docker image ls

# Correr un contenedor (descarga la imagen si no existe)
docker run nginx:1.25-alpine

# Correr en background (detached)
docker run -d nginx:1.25-alpine

# Correr con nombre, puerto mapeado y auto-remove al parar
docker run -d --name mi-nginx -p 8080:80 --rm nginx:1.25-alpine

# Modo interactivo (útil para debug)
docker run -it ubuntu:22.04 bash

# Ver contenedores corriendo
docker ps

# Ver todos (incluye detenidos)
docker ps -a

# Ver solo los IDs
docker ps -q
```

---

## Gestión de contenedores

```bash
# Parar un contenedor (SIGTERM, espera 10s, luego SIGKILL)
docker stop mi-nginx

# Parar de forma inmediata (SIGKILL directo)
docker kill mi-nginx

# Reiniciar
docker restart mi-nginx

# Pausar / reanudar (congela el proceso en memoria)
docker pause mi-nginx
docker unpause mi-nginx

# Borrar un contenedor detenido
docker rm mi-nginx

# Borrar un contenedor en ejecución a la fuerza
docker rm -f mi-nginx

# Borrar todos los contenedores detenidos
docker container prune
```

---

## Ejecutar comandos en un contenedor en ejecución

```bash
# Abrir una shell interactiva
docker exec -it mi-nginx bash
docker exec -it mi-nginx sh          # si no tiene bash

# Ejecutar un comando puntual
docker exec mi-nginx nginx -t        # verificar config de nginx
docker exec mi-nginx env             # ver variables de entorno

# Ejecutar como usuario root (aunque el contenedor corra como otro user)
docker exec -it -u root mi-nginx bash
```

---

## Variables de entorno y configuración en runtime

```bash
# Pasar variables individuales
docker run -d -e DB_HOST=postgres -e DB_PORT=5432 mi-app:latest

# Pasar desde un archivo .env
docker run -d --env-file .env mi-app:latest

# Ver las variables de entorno de un contenedor corriendo
docker exec mi-contenedor env
docker inspect --format='{{range .Config.Env}}{{println .}}{{end}}' mi-contenedor
```

---

## Logs

```bash
# Ver todos los logs
docker logs mi-nginx

# Ver logs en tiempo real (follow)
docker logs -f mi-nginx

# Últimas N líneas
docker logs --tail 100 mi-nginx

# Con timestamps
docker logs -t mi-nginx

# Logs desde hace X tiempo
docker logs --since 30m mi-nginx
docker logs --since 2024-01-15T10:00:00 mi-nginx
```

---

## Copiar archivos entre host y contenedor

```bash
# Del host al contenedor
docker cp ./nginx.conf mi-nginx:/etc/nginx/nginx.conf

# Del contenedor al host
docker cp mi-nginx:/var/log/nginx/error.log ./error.log
```

---

## Gestión de imágenes

```bash
# Buscar en Docker Hub
docker search nginx

# Ver capas e historia de una imagen
docker history nginx:1.25-alpine

# Inspeccionar metadata completa
docker inspect nginx:1.25-alpine

# Eliminar una imagen
docker rmi nginx:1.25-alpine

# Eliminar imágenes sin tag (dangling)
docker image prune

# Eliminar todas las imágenes no usadas por ningún contenedor
docker image prune -a

# Renombrar/retaggear una imagen
docker tag mi-app:latest mi-app:v1.2.0
```
