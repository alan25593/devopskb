---
title: "Linux: Comandos de Emergencia para Diagnóstico, Redes y Performance"
category: "linux"
tags: ["troubleshooting", "networking", "processes", "performance", "bombero"]
keywords: ["ver puertos abiertos", "quien usa el puerto", "como matar un proceso", "ver consumo de memoria", "kill -9", "df -h", "ver logs en tiempo real", "lsof puerto", "probar conexion tcp", "disco lleno", "load average", "free -h", "ss puertos", "netcat", "pkill", "du -h", "vaciar log", "proceso zombie", "pgrep", "socket escuchando"]
description: "Navaja suiza de comandos Linux para troubleshooting de infraestructura: análisis de sockets, consumo de recursos, caza y muerte de procesos rebeldes, y crisis de disco en producción."
---

# Linux para DevOps: Diagnóstico de emergencia y performance

## Contenido

- [Sockets y redes: el salvador de puertos](#sockets-y-redes-el-salvador-de-puertos)
- [Caza y muerte de procesos](#caza-y-muerte-de-procesos)
- [Diagnóstico de memoria, CPU y carga](#diagnóstico-de-memoria-cpu-y-carga)
- [Crisis de almacenamiento (discos al 100%)](#crisis-de-almacenamiento-discos-al-100)

---

## Sockets y redes: el salvador de puertos

Problema clásico: *"El proceso no levanta porque el puerto ya está ocupado"*.

### Averiguar qué proceso usa un puerto específico (ej: 8080)

```bash
# lsof (List Open Files) — muestra PID, usuario y nombre del proceso
lsof -i :8080

# ss (Socket Statistics) — más rápido y moderno que netstat
ss -tulpn | grep :8080
```

Flags de `ss`: `-t` TCP, `-u` UDP, `-l` Listening, `-p` muestra proceso, `-n` puertos numéricos.

### Ver todos los puertos TCP escuchando en el servidor

```bash
ss -ntlp
```

### Probar conectividad TCP a un puerto remoto sin telnet

Ideal para verificar desde dentro de un contenedor si llega a una base de datos o API externa.

```bash
# Usando Netcat (nc) — prueba con timeout de 2 segundos
nc -zv 192.168.1.50 5432

# Usando Bash nativo — funciona en imágenes Docker sin herramientas de red
cat < /dev/tcp/192.168.1.50/5432
```

### Ver conexiones establecidas

```bash
# Todas las conexiones ESTABLISHED activas
ss -tnp state established

# Filtrar por IP remota
ss -tnp dst 10.0.0.5
```

---

## Caza y muerte de procesos

Cuando un proceso consume el 100% de CPU y no responde.

### Encontrar el PID de un proceso por nombre

```bash
# Solo devuelve el PID
pgrep nginx

# Con contexto completo: usuario, CPU, MEM, comando
ps aux | grep nginx

# Ver árbol padre/hijo (útil para workers con múltiples procesos)
ps auxf | grep -A5 nginx
```

### Matar un proceso

```bash
# Intento educado: SIGTERM — el proceso puede cerrar conexiones antes de bajarse
kill -15 <PID>

# Muerte violenta: SIGKILL — el Kernel destruye el proceso al instante, sin cleanup
kill -9 <PID>

# Matar todos los procesos que coincidan con un nombre (ej: workers PHP)
pkill -9 php-fpm

# Matar con confirmación en pantalla (más seguro)
pkill -e nginx
```

> **Regla de oro:** Siempre intentá `-15` primero. El `-9` no le da al proceso tiempo de cerrar conexiones ni liberar locks de base de datos. Usalo solo cuando `-15` no responde.

### Detectar procesos zombies

Un zombie (estado `Z`) ya terminó pero su proceso padre no recogió el exit code. No consume CPU pero acumula PIDs hasta agotar el límite del sistema.

```bash
# Listar procesos zombie
ps aux | awk '$8 == "Z"'

# Ver cuántos hay
ps aux | awk '$8 == "Z"' | wc -l
```

---

## Diagnóstico de memoria, CPU y carga

### Entender el load average

Al correr `top`, `htop` o `uptime` aparecen tres números: `1.05, 0.70, 5.20`.

Representan la carga promedio en los últimos **1, 5 y 15 minutos**.

```
Load Average 4.0 en un servidor de 4 vCPUs = 100% de capacidad
Load Average 8.0 en un servidor de 4 vCPUs = procesos esperando en fila (saturación)
```

```bash
# Ver load average, uptime y cantidad de usuarios logueados
uptime

# Ver cantidad de CPUs disponibles para interpretar el load
nproc

# Ver detalle de uso por núcleo en tiempo real (sysstat)
mpstat -P ALL 1
```

### Ver RAM real disponible

```bash
free -h
```

| Columna | Qué significa |
|---|---|
| `total` | RAM física instalada |
| `used` | RAM usada por procesos |
| `free` | RAM completamente sin usar |
| `buff/cache` | Caché de disco del kernel — se libera cuando hace falta |
| `available` | **La que importa**: RAM disponible para nuevos procesos |

No te asustes si `free` es casi 0. Linux usa la RAM libre para caché de disco. El OOM Killer se activa cuando `available` llega a 0.

### Ver qué proceso está quemando CPU o RAM

```bash
# Top clásico — presioná M para ordenar por memoria, P para CPU
top

# htop: versión interactiva con colores (puede no estar instalado)
htop

# Snapshot: top 10 por CPU
ps aux --sort=-%cpu | head -10

# Snapshot: top 10 por RAM
ps aux --sort=-%mem | head -10
```

---

## Crisis de almacenamiento (discos al 100%)

Clásico de producción: los logs llenaron el disco y la base de datos entró en modo read-only.

### Ver qué partición está llena

```bash
df -h
```

### Encontrar qué directorio está comiendo el espacio

Corré esto parado en `/` o en `/var` para rastrear al culpable de forma descendente.

```bash
# Top 10 directorios más pesados en el nivel actual
du -h --max-depth=1 | sort -hr | head -n 10

# Alternativa interactiva con ncdu (si está instalado)
ncdu /var/log
```

### Vaciar un archivo de log en vivo sin borrarlo

```bash
# ✗ Mal — si el proceso tiene el archivo abierto, el espacio NO se libera hasta reiniciarlo
rm /var/log/nginx/access.log

# ✓ Bien — trunca el archivo a 0 bytes sin borrar el inode
> /var/log/nginx/access.log

# Alternativa explícita
truncate -s 0 /var/log/nginx/access.log
```

### Ver logs en tiempo real

```bash
# Seguir el final de un archivo
tail -f /var/log/nginx/error.log

# Seguir múltiples archivos a la vez
tail -f /var/log/nginx/error.log /var/log/app/app.log

# Con journalctl para servicios systemd
journalctl -u nginx -f

# Últimas 100 líneas y seguir
journalctl -u nginx -n 100 -f
```

### Verificar si un archivo está siendo usado antes de borrarlo

```bash
lsof /var/log/nginx/access.log
```
