---
title: "Despliegues Standalone con systemd y Traefik"
category: "Docker"
tags: ["docker", "deployment", "systemd", "traefik"]
description: "Guía para desplegar apps standalone con Docker Compose, systemd y Traefik."
---

# Despliegues Standalone: systemd + Traefik

No todos los proyectos necesitan un clúster de Kubernetes de entrada. Muchas veces, un servidor con un par de Docker Compose es la solución más sensata y barata (despliegue standalone). Para que esto sea robusto y parezca "Enterprise", necesitamos que los servicios sobrevivan a reinicios del sistema y que tengamos HTTPS automático.

## 1. El Reverse Proxy: Traefik

Traefik lee directamente de los sockets de Docker y rutea el tráfico según los *labels* del contenedor. Además, saca los certificados SSL automáticamente con Let's Encrypt.

Un `docker-compose.yml` base para Traefik:

```yaml
services:
  traefik:
    image: traefik:v2.10
    command:
      - "--api.insecure=false"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.myresolver.acme.tlschallenge=true"
      - "--certificatesresolvers.myresolver.acme.email=tu-email@dominio.com"
      - "--certificatesresolvers.myresolver.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
      - "./letsencrypt:/letsencrypt"
    networks:
      - web

networks:
  web:
    external: true
```
*(Asegúrate de crear la red antes: `docker network create web`)*

Y para desplegar tu app, simplemente la conectas a la red `web` y le pones labels:

```yaml
services:
  mi-app:
    image: nginx:alpine
    networks:
      - web
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.miapp.rule=Host(`miapp.dominio.com`)"
      - "traefik.http.routers.miapp.entrypoints=websecure"
      - "traefik.http.routers.miapp.tls.certresolver=myresolver"
```

## 2. Persistencia con systemd

Aunque pases `--restart always`, gestionar Compose de forma nativa con systemd te da control real sobre el inicio de la máquina.

Crea un archivo en `/etc/systemd/system/mi-app.service`:

```ini
[Unit]
Description=Mi Aplicacion Docker
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/mi-app
ExecStart=/usr/local/bin/docker-compose up -d --remove-orphans
ExecStop=/usr/local/bin/docker-compose down

[Install]
WantedBy=multi-user.target
```

Lo habilitas para que corra al bootear:
```bash
sudo systemctl enable mi-app.service
sudo systemctl start mi-app.service
```

Con esto tenés un setup limpio, reinicios garantizados y HTTPS automático. Nada mal para un solo nodo, ¿no?
