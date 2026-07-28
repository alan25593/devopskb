---
title: "Configuración del Daemon daemon.json"
category: "Docker"
tags: ["docker", "daemon", "config", "sysadmin"]
description: "Ajustes esenciales en daemon.json para dejar tu Docker listo para producción."
---

# Configuración del Daemon daemon.json

¡Qué onda! Cuando instalas Docker, la configuración por defecto está bien para jugar un rato en local, pero si vas a llevar esto a un servidor de staging o producción, necesitas meter mano en el archivo `daemon.json`. Este archivo es el cerebro del servicio de Docker.

Por lo general, en Linux lo vas a encontrar en `/etc/docker/daemon.json`. Si no existe, lo creás.

## Un daemon.json listo para la batalla

Acá te dejo un template clásico que suelo usar. Habilita métricas para Prometheus, ajusta los pools de IPs por defecto (para evitar conflictos de red) y activa funcionalidades experimentales que ya son bastante estables y necesarias.

```json
{
  "metrics-addr": "0.0.0.0:9323",
  "experimental": true,
  "default-address-pools": [
    {
      "base": "172.17.0.0/16",
      "size": 24
    },
    {
      "base": "172.18.0.0/16",
      "size": 24
    }
  ],
  "max-concurrent-downloads": 10,
  "max-concurrent-uploads": 10,
  "live-restore": true
}
```

### ¿Qué hace cada cosa?

- **`metrics-addr`**: Expone las métricas internas de Docker en el puerto 9323 para que tu Prometheus las pueda scrapear de una.
- **`default-address-pools`**: Te salva de que Docker Compose empiece a pisar IPs de tu red local o VPN. Limita los rangos.
- **`max-concurrent-downloads/uploads`**: Agiliza los `docker pull` y `push` permitiendo más capas en paralelo.
- **`live-restore`**: **¡Clave!** Permite reiniciar el demonio de Docker sin que se mueran los contenedores que están corriendo. Ideal para parches.

### Aplicar los cambios

Una vez que guardas el archivo, recargá la configuración sin matar los contenedores (si tenés `live-restore` configurado antes, genial; si es la primera vez, se van a reiniciar):

```bash
sudo systemctl reload docker
```

¡Con esto ya tenés una base sólida para que el daemon no te deje a gamba!
