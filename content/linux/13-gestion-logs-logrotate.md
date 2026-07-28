---
title: "Gestión y Rotación de Logs con logrotate"
category: "Linux"
tags: ["linux", "logs", "logrotate", "sysadmin"]
description: "Aprende a dominar logrotate para que tus logs no llenen el disco."
---

# Gestión y Rotación de Logs con logrotate

¡Qué onda! Si no querés que un log descontrolado te tire el server en plena madrugada por falta de espacio en disco, tenés que amigarte con `logrotate`.

La configuración principal está en `/etc/logrotate.conf`, pero las reglas específicas de cada app (Nginx, Docker, etc.) van en `/etc/logrotate.d/`.

## Ejemplo práctico: Rotar logs de Nginx

Si tenés una app custom o Nginx, creás un archivo `/etc/logrotate.d/nginx`:

```bash
/var/log/nginx/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        [ -s /run/nginx.pid ] && kill -USR1 `cat /run/nginx.pid`
    endscript
}
```

### ¿Qué hace cada cosa?
- **daily**: Rota los logs todos los días. (Podés usar `weekly`, `monthly`).
- **rotate 14**: Guarda 14 archivos viejos antes de borrarlos.
- **compress / delaycompress**: Comprime en `.gz`, pero deja el archivo de ayer sin comprimir para que sea más fácil leerlo hoy.
- **missingok**: Si no encuentra el log, no tira error, sigue de largo.
- **postrotate**: Ejecuta un script después de rotar. En este caso, le avisa a Nginx que recargue los descriptores de archivos, clave para que no siga escribiendo en el log viejo.

## Probar sin romper
Si querés ver qué haría logrotate sin cambiar nada (dry-run), tirale esto:

```bash
logrotate -d /etc/logrotate.d/nginx
```

Para forzar la rotación en el momento (ideal para testear):

```bash
logrotate -f /etc/logrotate.d/nginx
```

¡Implementá esto y dormí tranquilo!
