---
title: "Kernel Tuning y Debugging Avanzado"
category: "Linux"
tags: ["linux", "kernel", "sysctl", "strace", "sysstat", "performance"]
description: "Cómo meterle mano al kernel con sysctl y debuggear como un pro."
---

# Kernel Tuning y Debugging Avanzado

¡Hola! A veces el hardware está sobrado pero el server no rinde. Ahí es cuando toca afinar el kernel y usar las herramientas pesadas de debugging.

## Sysctl: Ajustando el Kernel en vivo

Podés cambiar parámetros del kernel al vuelo y hacerlos persistentes.

Para ver todo lo configurable:
```bash
sysctl -a
```

### Tuning para servidores web de alto tráfico

Agregá esto en `/etc/sysctl.d/99-custom.conf`:

```ini
# Amplía el rango de puertos locales (útil para muchas conexiones de salida)
net.ipv4.ip_local_port_range = 1024 65535

# Permite reusar sockets TIME_WAIT rápido
net.ipv4.tcp_tw_reuse = 1

# Aumenta el backlog para que las conexiones no se caigan en picos
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
```

Aplicá los cambios sin reiniciar:
```bash
sysctl --system
```

## Strace: ¿Qué está haciendo ese proceso?

Si un proceso se queda colgado y no tenés idea por qué, `strace` es tu mejor amigo. Intercepta llamadas al sistema.

Para ver qué archivos está intentando abrir un proceso (reemplazá PID):
```bash
strace -p 1234 -e trace=open,openat,read,write
```

Para seguir a los procesos hijos también, agregá `-f`:
```bash
strace -f -p 1234
```

## Sysstat (iostat, mpstat, pidstat)

Para métricas rápidas de dónde está el cuello de botella:

- **iostat -xz 1**: Muestra el uso de I/O de los discos por segundo. Si `%util` está al 100%, tu disco es el problema.
- **mpstat -P ALL 1**: Te da uso de CPU por cada core.
- **pidstat 1**: Como el top pero enfocado en estadísticas de procesos por segundo, genial para ver quién está comiendo recursos de forma sostenida.

¡Meté mano con cuidado y medí siempre antes y después!
