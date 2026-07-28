---
title: "Docker Rootless y User Namespaces"
category: "Docker"
tags: ["docker", "security", "rootless", "namespaces"]
description: "Asegura tu entorno aislando contenedores con rootless y userns-remap."
---

# Docker Rootless y User Namespaces

Una de las reglas de oro en seguridad es no correr procesos como root si no es estrictamente necesario. Por defecto, el daemon de Docker corre como root, y si alguien vulnera un contenedor y logra escapar, es el dueño del host. 

Para mitigar esto, tenemos dos caminos excelentes: **User Namespaces (userns-remap)** y **Docker Rootless**.

## 1. User Namespaces (userns-remap)

Esta técnica mapea el root del contenedor a un usuario sin privilegios en el host. El contenedor "cree" que es root, pero afuera es un simple mortal.

1. Añadimos un usuario en el host para el mapeo (ejemplo: `dockremap`).
2. Configuramos el mapeo de UIDs y GIDs. Los archivos `/etc/subuid` y `/etc/subgid` deberían tener algo así:
   ```text
   dockremap:165536:65536
   ```
3. Modificamos nuestro querido `/etc/docker/daemon.json`:
   ```json
   {
     "userns-remap": "dockremap"
   }
   ```
4. Reiniciamos Docker: `sudo systemctl restart docker`.

*Ojo:* Al habilitar esto, Docker va a crear una estructura de directorios nueva en `/var/lib/docker/165536.165536/`, así que los contenedores viejos no se van a ver. Es como un inicio fresco.

## 2. Docker Rootless

Aún más seguro que lo anterior. Aquí no solo los contenedores corren como usuarios normales, **el propio daemon de Docker corre sin root**.

Para instalarlo, Docker provee un script oficial. Como un usuario regular (no root), corres:

```bash
curl -fsSL https://get.docker.com/rootless | sh
```

El script se encarga de configurar las variables y levantarlo. Luego necesitas exportar un par de variables en tu `.bashrc` o `.zshrc`:

```bash
export XDG_RUNTIME_DIR=/run/user/$(id -u)
export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/docker.sock
```

### Limitaciones de Rootless

Todo es lindo hasta que chocamos con la realidad. Ten en cuenta que en modo Rootless:
- No podés bindear puertos privilegiados (menores al 1024, como 80 o 443). Vas a tener que mapear desde puertos altos (ej. 8080) o configurar capacidades de red extra en el host.
- Algunos drivers de storage (como `overlay2` sobre ciertos filesystems) pueden ser más lentos o requerir ajustes manuales.
- Limitación en el manejo de cgroups, que afecta el limitador de recursos (RAM/CPU) si no activas cgroup v2.

Si tu entorno te permite superar estas limitaciones, usar Rootless es un golazo de media cancha a nivel seguridad.
