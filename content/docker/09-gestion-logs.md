---
title: "Gestión de Logs y Rotación"
category: "Docker"
tags: ["docker", "logs", "loki", "json-file", "monitoring"]
description: "Cómo evitar que los logs de Docker te llenen el disco y cómo enviarlos a Loki."
---

# Gestión de Logs y Rotación en Docker

Si alguna vez te quedaste sin espacio en disco en un servidor a las 3 AM por culpa de un contenedor que escupía errores sin parar, este post es para vos. Por defecto, Docker guarda los logs en formato JSON para siempre. ¡Un peligro!

Vamos a ver cómo limitarlo a nivel global y cómo mandar los logs directo a Loki (Grafana) si tenés un stack de monitoreo.

## 1. Rotación nativa con `json-file`

Para atajar el problema de raíz en todos los contenedores nuevos, abrí tu `/etc/docker/daemon.json` y agregá esta configuración de log-driver:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "3"
  }
}
```

**¿Qué logramos con esto?** 
Cada contenedor guardará como máximo 3 archivos de logs de 50MB cada uno (150MB total por contenedor). Cuando se llena uno, lo rota y borra el más viejo. 

Aplicás con:
```bash
sudo systemctl restart docker
```
*(Nota: Esto aplica a contenedores creados DESPUÉS del reinicio. A los viejos hay que recrearlos).*

## 2. Centralizando Logs con el Driver de Loki

Si usás Grafana y Loki, lo mejor es olvidarse de los logs locales y mandarlos directo al indexador.

Primero instalá el plugin de Loki en el servidor Docker:
```bash
docker plugin install grafana/loki-docker-driver:latest --alias loki --grant-all-permissions
```

Y ahora podés usarlo por contenedor (en tu `docker-compose.yml`) o a nivel global en el `daemon.json`:

### Ejemplo en docker-compose.yml

```yaml
services:
  mi-api:
    image: mi-api:v1
    logging:
      driver: loki
      options:
        loki-url: "http://loki.mi-dominio.com:3100/loki/api/v1/push"
        mode: non-blocking
        max-buffer-size: 4m
        loki-retries: "3"
```

El `mode: non-blocking` es importantísimo. Si Loki se cae o la red falla, el contenedor sigue funcionando y no se bloquea esperando escribir el log. 

¡Listo! Ya tenés logs controlados y centralizados.
