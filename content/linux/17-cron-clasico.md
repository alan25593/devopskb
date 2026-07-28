---
title: "Cron Clásico y Variables de Entorno"
category: "Linux"
tags: ["linux", "cron", "crontab", "automation", "env"]
description: "Domina el viejo confiable cron y evita dolores de cabeza con las env vars."
---

# Cron Clásico y Variables de Entorno

¡Buenas! A pesar de systemd timers y orquestadores, cron sigue vivo y coleando. Pero tiene sus trampas, especialmente con las variables de entorno.

## `/etc/crontab` vs `crontab -e` vs `/etc/cron.d/`

- **`crontab -e`**: Edita el cron del usuario actual. No tenés que especificar el usuario en la línea.
- **`/etc/crontab`**: El archivo del sistema. ACÁ SÍ tenés que poner qué usuario ejecuta el comando.
- **`/etc/cron.d/`**: El mejor lugar para provisionar con Ansible o scripts. Creás un archivo por app (ej. `/etc/cron.d/backup-db`). La sintaxis es igual que `/etc/crontab` (requiere el usuario).

Ejemplo en `/etc/cron.d/mi-app`:
```cron
# m h dom mon dow user  command
*/5 * * * * root /usr/local/bin/limpiar_cache.sh
```

## El problema clásico: Las Variables de Entorno (PATH)

El error número 1 con cron es: "Funciona en mi terminal pero no en cron".
Eso pasa porque cron se ejecuta con un entorno minimalista. Su `$PATH` suele ser solo `/usr/bin:/bin`.

Para arreglarlo, tenés un par de opciones:

1. **Definir el PATH al principio del crontab:**
```cron
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
* * * * * root mi_script.sh
```

2. **Usar rutas absolutas siempre (La más segura):**
```cron
* * * * * root /usr/local/bin/docker-compose -f /opt/app/docker-compose.yml up -d
```

3. **Cargar el profile del usuario:**
```cron
* * * * * devops . /home/devops/.bashrc; /ruta/al/script.sh
```

## Redirigir la salida (Para no spamear mail)

Si cron produce salida por stdout o stderr, intenta mandar un email local (si hay postfix/sendmail). Para evitar eso y loggear bien:

```cron
* * * * * root /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1
```

O si directamente querés descartar todo:
```cron
* * * * * root /usr/local/bin/script_ruidoso.sh > /dev/null 2>&1
```

¡Con eso dejás los crons ordenados y funcionando a la primera!
