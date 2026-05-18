---
title: "Linux: Systemd, Servicios y Gestión con systemctl"
category: "linux"
tags: ["systemd", "servicios", "systemctl", "journalctl", "units"]
keywords: ["iniciar servicio linux", "parar servicio", "reiniciar servicio", "habilitar servicio al arranque", "systemctl start", "systemctl enable", "ver logs servicio", "journalctl", "crear servicio systemd", "unit file", "service file", "ver estado servicio", "systemd timer", "cron alternativa", "journalctl fecha", "ver logs boot"]
description: "Gestión completa de servicios con systemd: ciclo de vida, troubleshooting con journalctl, creación de units propios y timers como alternativa moderna a cron."
---

# Systemd y gestión de servicios

## Contenido

- [Gestión de servicios con systemctl](#gestión-de-servicios-con-systemctl)
- [Troubleshooting con journalctl](#troubleshooting-con-journalctl)
- [Crear un service unit personalizado](#crear-un-service-unit-personalizado)
- [Systemd timers: alternativa a cron](#systemd-timers-alternativa-a-cron)
- [Targets y dependencias](#targets-y-dependencias)

---

## Gestión de servicios con systemctl

```bash
# Ver el estado de un servicio (incluye últimas líneas de log)
systemctl status nginx

# Iniciar / parar / reiniciar
systemctl start nginx
systemctl stop nginx
systemctl restart nginx

# Recargar configuración sin reiniciar el proceso principal
systemctl reload nginx

# Habilitar para que arranque con el sistema
systemctl enable nginx

# Deshabilitar el arranque automático
systemctl disable nginx

# Combinar enable + start en un solo comando
systemctl enable --now nginx

# Combinar disable + stop
systemctl disable --now nginx

# Forzar la parada inmediata (equivalente a kill -9)
systemctl kill -s SIGKILL nginx

# Verificar si un servicio está activo (útil en scripts)
systemctl is-active nginx
systemctl is-enabled nginx

# Recargar la configuración de systemd después de modificar un unit file
systemctl daemon-reload
```

### Ver todos los servicios del sistema

```bash
# Todos los units activos
systemctl list-units --type=service

# Todos los units (activos e inactivos)
systemctl list-units --type=service --all

# Ver units que fallaron
systemctl --failed

# Ver dependencias de un servicio
systemctl list-dependencies nginx
```

---

## Troubleshooting con journalctl

`journalctl` es el visor del log centralizado de systemd. Todos los servicios que usen systemd escriben aquí.

```bash
# Logs de un servicio específico
journalctl -u nginx

# Seguir en tiempo real
journalctl -u nginx -f

# Últimas N líneas
journalctl -u nginx -n 100

# Combinar: últimas 50 líneas y seguir
journalctl -u nginx -n 50 -f

# Logs desde una fecha y hora específica
journalctl -u nginx --since "2024-05-10 14:00:00"

# Logs en un rango de tiempo
journalctl -u nginx --since "1 hour ago" --until "30 min ago"

# Logs del boot actual
journalctl -b

# Logs del boot anterior (útil cuando el sistema se cayó)
journalctl -b -1

# Ver por qué falló el boot
journalctl -b -p err

# Logs de múltiples servicios a la vez
journalctl -u nginx -u php-fpm -f

# Filtrar por prioridad (0=emerg a 7=debug)
journalctl -u app -p err        # error y más crítico
journalctl -u app -p warning    # warning y más crítico

# Output en formato JSON (útil para parsear con jq)
journalctl -u nginx -o json | jq '.MESSAGE'

# Ver cuánto espacio ocupa el journal
journalctl --disk-usage

# Limpiar journals viejos (dejar solo los últimos 7 días)
journalctl --vacuum-time=7d
```

---

## Crear un service unit personalizado

Los unit files van en `/etc/systemd/system/` para servicios del administrador.

### Ejemplo: servicio para una aplicación Node.js

```ini
# /etc/systemd/system/mi-app.service

[Unit]
Description=Mi aplicación Node.js
After=network.target

[Service]
Type=simple
User=deploy
Group=deploy
WorkingDirectory=/opt/mi-app
ExecStart=/usr/bin/node /opt/mi-app/server.js
Restart=on-failure
RestartSec=5s

# Variables de entorno
Environment=NODE_ENV=production
Environment=PORT=3000

# O cargar desde un archivo
EnvironmentFile=/opt/mi-app/.env

# Límites de recursos
LimitNOFILE=65536

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=mi-app

[Install]
WantedBy=multi-user.target
```

```bash
# Activar el nuevo servicio
systemctl daemon-reload
systemctl enable --now mi-app

# Verificar que levantó correctamente
systemctl status mi-app
journalctl -u mi-app -n 20
```

### Directivas clave de [Service]

| Directiva | Valores | Qué hace |
|---|---|---|
| `Type` | `simple`, `forking`, `oneshot`, `notify` | Cómo el proceso señala que está listo |
| `Restart` | `no`, `on-failure`, `always` | Cuándo reiniciar el proceso |
| `RestartSec` | `5s`, `10s` | Tiempo de espera entre reinicios |
| `ExecStartPre` | comando | Comando a ejecutar antes del inicio |
| `ExecStopPost` | comando | Comando a ejecutar después de la parada |
| `TimeoutStopSec` | `30s` | Tiempo antes de forzar SIGKILL al parar |

---

## Systemd timers: alternativa a cron

Los timers son más robables que cron: loguean en journald, soportan dependencias y manejan el caso de que el sistema esté apagado cuando debía correr la tarea.

Un timer siempre necesita un `.service` asociado con el mismo nombre base.

### Ejemplo: backup diario a las 2am

```ini
# /etc/systemd/system/backup.service

[Unit]
Description=Backup diario de base de datos

[Service]
Type=oneshot
User=deploy
ExecStart=/opt/scripts/backup-db.sh
```

```ini
# /etc/systemd/system/backup.timer

[Unit]
Description=Timer para backup diario
Requires=backup.service

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true    # Si el sistema estaba apagado, corre al volver a encender

[Install]
WantedBy=timers.target
```

```bash
# Activar el timer (no el .service directamente)
systemctl enable --now backup.timer

# Ver todos los timers activos y cuándo corren
systemctl list-timers

# Ver cuándo corrió por última vez
journalctl -u backup.service
```

### Sintaxis de OnCalendar

| Expresión | Cuándo corre |
|---|---|
| `daily` | Todos los días a las 00:00 |
| `hourly` | Cada hora en el minuto :00 |
| `weekly` | Los lunes a las 00:00 |
| `*-*-* 02:00:00` | Todos los días a las 2am |
| `Mon *-*-* 09:00:00` | Lunes a las 9am |
| `*:0/15` | Cada 15 minutos |

```bash
# Verificar que la sintaxis de OnCalendar es correcta
systemd-analyze calendar "*-*-* 02:00:00"
```

---

## Targets y dependencias

Los targets son el equivalente de los runlevels en SysV init.

| Target | Equivalente SysV | Descripción |
|---|---|---|
| `poweroff.target` | runlevel 0 | Apagado |
| `rescue.target` | runlevel 1 | Modo de rescate (single user) |
| `multi-user.target` | runlevel 3 | Modo multiusuario sin GUI |
| `graphical.target` | runlevel 5 | Modo multiusuario con GUI |
| `reboot.target` | runlevel 6 | Reinicio |

```bash
# Ver el target activo actualmente
systemctl get-default

# Cambiar el target por defecto (ej: servidor sin GUI)
systemctl set-default multi-user.target

# Ir a modo rescate sin reiniciar (requiere root)
systemctl isolate rescue.target
```
