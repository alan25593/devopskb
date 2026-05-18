---
title: "Linux: tmux, Sesiones Persistentes y Procesos en Background"
category: "linux"
tags: ["tmux", "screen", "background", "sesiones", "nohup"]
keywords: ["tmux tutorial", "tmux comandos basicos", "como usar tmux", "sesion persistente ssh", "proceso en background linux", "nohup", "disown", "jobs fg bg", "tmux split pane", "tmux nueva ventana", "tmux attach detach", "no perder proceso al cerrar ssh", "correr proceso segundo plano", "tmux cheat sheet", "screen linux", "tmux sessions"]
description: "tmux para sesiones persistentes en servidores: crear y gestionar sesiones, ventanas y paneles. Manejo de procesos en background con nohup, jobs, fg y bg para no perder trabajo al cerrar SSH."
---

# tmux, sesiones persistentes y procesos en background

## Contenido

- [Por qué tmux en servidores](#por-qué-tmux-en-servidores)
- [Sesiones: crear, adjuntar y desconectar](#sesiones-crear-adjuntar-y-desconectar)
- [Ventanas y paneles](#ventanas-y-paneles)
- [Atajos esenciales de tmux](#atajos-esenciales-de-tmux)
- [Configuración básica de tmux](#configuración-básica-de-tmux)
- [Procesos en background: nohup, jobs y disown](#procesos-en-background-nohup-jobs-y-disown)

---

## Por qué tmux en servidores

Cuando trabajás en un servidor remoto por SSH, si la conexión se corta — por timeout, red inestable o cierre accidental del terminal — todos los procesos que corrías mueren.

`tmux` crea sesiones que viven en el servidor independientemente de tu conexión SSH. Podés desconectarte, reconectarte desde otro equipo y encontrar todo exactamente como lo dejaste.

Además permite dividir la pantalla en paneles para tener logs, un editor y una shell al mismo tiempo en la misma conexión SSH.

---

## Sesiones: crear, adjuntar y desconectar

```bash
# Crear una nueva sesión sin nombre
tmux

# Crear una sesión con nombre descriptivo (recomendado)
tmux new-session -s deploy
tmux new -s monitoring

# Listar todas las sesiones activas
tmux list-sessions
tmux ls

# Adjuntarse a una sesión existente
tmux attach -t deploy
tmux a -t deploy

# Adjuntarse a la última sesión (si solo hay una)
tmux attach
tmux a

# Desconectarse de la sesión sin matarla (el proceso sigue corriendo)
# Atajo: Ctrl+b  d

# Renombrar una sesión
tmux rename-session -t deploy deploy-prod

# Matar una sesión específica
tmux kill-session -t deploy

# Matar todas las sesiones
tmux kill-server
```

---

## Ventanas y paneles

tmux tiene tres niveles de organización:

```
Sesión (deploy)
  └── Ventana 0: logs
  └── Ventana 1: editor
  └── Ventana 2: shell
        ├── Panel izquierdo: app
        └── Panel derecho: db
```

Todos los atajos requieren el **prefijo**: `Ctrl+b` (presioná ambas teclas, soltá, y luego la tecla del comando).

### Ventanas

| Atajo | Acción |
|---|---|
| `Ctrl+b  c` | Crear nueva ventana |
| `Ctrl+b  n` | Ir a la ventana siguiente |
| `Ctrl+b  p` | Ir a la ventana anterior |
| `Ctrl+b  0`...`9` | Ir a ventana por número |
| `Ctrl+b  ,` | Renombrar la ventana actual |
| `Ctrl+b  &` | Cerrar la ventana actual (pide confirmación) |
| `Ctrl+b  w` | Ver lista de ventanas para elegir |

### Paneles (split)

| Atajo | Acción |
|---|---|
| `Ctrl+b  %` | Dividir el panel horizontalmente (lado a lado) |
| `Ctrl+b  "` | Dividir el panel verticalmente (arriba/abajo) |
| `Ctrl+b  ←↑↓→` | Moverse entre paneles con las flechas |
| `Ctrl+b  z` | Maximizar/restaurar el panel actual (zoom) |
| `Ctrl+b  x` | Cerrar el panel actual |
| `Ctrl+b  Espacio` | Rotar entre layouts predefinidos |

---

## Atajos esenciales de tmux

### Sesiones

| Atajo | Acción |
|---|---|
| `Ctrl+b  d` | Desconectarse de la sesión (detach) |
| `Ctrl+b  $` | Renombrar la sesión actual |
| `Ctrl+b  s` | Ver lista de sesiones |

### Misceláneos

| Atajo | Acción |
|---|---|
| `Ctrl+b  [` | Entrar en modo scroll (navegar con flechas, q para salir) |
| `Ctrl+b  ?` | Ver todos los atajos disponibles |
| `Ctrl+b  :` | Abrir la línea de comandos de tmux |
| `Ctrl+b  t` | Mostrar reloj en el panel actual |

---

## Configuración básica de tmux

El archivo de configuración es `~/.tmux.conf`.

```bash
# ~/.tmux.conf

# Cambiar el prefijo de Ctrl+b a Ctrl+a (más cómodo para muchos)
unbind C-b
set -g prefix C-a
bind C-a send-prefix

# Dividir paneles con teclas más intuitivas
bind | split-window -h
bind - split-window -v

# Navegar entre paneles con Alt+flechas (sin prefijo)
bind -n M-Left select-pane -L
bind -n M-Right select-pane -R
bind -n M-Up select-pane -U
bind -n M-Down select-pane -D

# Numeración de ventanas desde 1 (más intuitivo con el teclado)
set -g base-index 1

# Scrollback buffer más grande
set -g history-limit 10000

# Habilitar soporte de mouse
set -g mouse on

# Barra de estado con más info
set -g status-right '%Y-%m-%d %H:%M'
```

```bash
# Aplicar cambios sin reiniciar tmux
# Dentro de tmux:
Ctrl+b  :  source-file ~/.tmux.conf
```

---

## Procesos en background: nohup, jobs y disown

Para cuando no usás tmux pero necesitás que un proceso sobreviva al cierre de la sesión.

### Correr un proceso en background desde el inicio

```bash
# El & al final manda el proceso al background
./script-largo.sh &

# Ver los procesos en background de la shell actual
jobs

# Traer el proceso al foreground
fg %1     # %1 = job número 1

# Mandar un proceso al background (si ya está corriendo en foreground)
# Presioná Ctrl+Z para suspenderlo, luego:
bg %1
```

### nohup — ignorar la señal de cierre de sesión

`nohup` hace que el proceso ignore el SIGHUP que se envía cuando cerrás la sesión SSH. La salida se guarda en `nohup.out` si no se redirige.

```bash
# Correr un script que sobreviva al cierre de sesión
nohup ./deploy.sh &

# Redirigir la salida a un archivo específico
nohup ./deploy.sh > /var/log/deploy.log 2>&1 &

# Ver el PID del proceso que quedó corriendo
echo $!    # PID del último proceso en background
```

### disown — desvincular un proceso que ya está corriendo

Si olvidaste usar `nohup` y ya tenés el proceso corriendo, `disown` lo desvincula de la shell para que sobreviva al cierre.

```bash
# Proceso ya corriendo en background
./proceso-largo.sh &
# [1] 12345

# Desvincularlo de la shell
disown %1      # por número de job
disown 12345   # por PID

# Ahora podés cerrar la sesión y el proceso sigue corriendo
```

### Comparación de enfoques

| Herramienta | Cuándo usarla |
|---|---|
| `tmux` | Trabajo interactivo en servidores — podés volver y ver la sesión completa |
| `nohup ... &` | Proceso desatendido simple, no necesitás volver a interactuar |
| `disown` | Olvidaste usar nohup y el proceso ya está corriendo |
| `systemd service` | Proceso de larga duración que debe reiniciarse automáticamente |
