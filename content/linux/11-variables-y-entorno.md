---
title: "Linux: Variables de Entorno, Profile y Configuración del Shell"
category: "linux"
tags: ["variables", "entorno", "bash", "profile", "PATH"]
keywords: ["variable de entorno linux", "bashrc vs bash_profile", "cuando se ejecuta bashrc", "agregar al PATH", "export variable", "ver variables de entorno", "env printenv", "etc environment", "profile.d", "variable persistente linux", "PATH linux agregar directorio", "source bashrc", "bash_profile vs profile", "variables globales sistema", "shell interactivo vs login"]
description: "Variables de entorno en Linux: diferencias entre .bashrc, .bash_profile y .profile, manipulación del PATH, variables globales del sistema y cuándo se ejecuta cada archivo de configuración."
---

# Variables de entorno y configuración del shell

## Contenido

- [Ver y manipular variables de entorno](#ver-y-manipular-variables-de-entorno)
- [export y el scope de las variables](#export-y-el-scope-de-las-variables)
- [.bashrc vs .bash_profile vs .profile](#bashrc-vs-bash_profile-vs-profile)
- [Manipulación del PATH](#manipulación-del-path)
- [Variables globales del sistema](#variables-globales-del-sistema)

---

## Ver y manipular variables de entorno

```bash
# Ver todas las variables de entorno del proceso actual
env
printenv

# Ver el valor de una variable específica
echo $HOME
echo $PATH
printenv HOME

# Ver variables definidas en la shell actual (incluye variables locales sin export)
set | head -30

# Ver variables que contienen cierto string
env | grep JAVA
printenv | grep -i proxy
```

Variables de entorno más relevantes en servidores:

| Variable | Qué contiene |
|---|---|
| `PATH` | Directorios donde la shell busca ejecutables |
| `HOME` | Directorio home del usuario actual |
| `USER` / `LOGNAME` | Nombre del usuario actual |
| `SHELL` | Shell por defecto del usuario |
| `PWD` | Directorio de trabajo actual |
| `LANG` / `LC_ALL` | Configuración regional y codificación |
| `JAVA_HOME` | Directorio raíz de la instalación de Java |
| `KUBECONFIG` | Ruta al archivo de configuración de kubectl |
| `AWS_PROFILE` | Perfil de AWS CLI activo |

---

## export y el scope de las variables

```bash
# Variable local: solo existe en el proceso actual (la shell)
MI_VAR="valor"
echo $MI_VAR          # funciona
bash -c 'echo $MI_VAR'  # vacío — no se heredó al subproceso

# Variable exportada: se hereda a todos los subprocesos
export MI_VAR="valor"
bash -c 'echo $MI_VAR'  # "valor" — el subproceso la heredó

# Definir y exportar en un solo paso
export DATABASE_URL="postgres://user:pass@localhost:5432/mydb"

# Exportar una variable ya definida
MI_VAR="valor"
export MI_VAR

# Ver solo las variables exportadas
export -p

# Remover una variable del entorno
unset MI_VAR

# Pasar una variable solo para un comando específico (sin exportar permanentemente)
NODE_ENV=production node server.js
DEBUG=true ./mi-script.sh
```

---

## .bashrc vs .bash_profile vs .profile

Este es uno de los puntos más confusos de Linux. La clave está en entender qué tipo de shell se está iniciando.

| Tipo de shell | Cuándo ocurre | Archivos que lee |
|---|---|---|
| **Login shell** | SSH, login en consola, `sudo -i`, `su -` | `/etc/profile` → `~/.bash_profile` → `~/.profile` |
| **Interactive non-login** | Abrir terminal en desktop, nueva pestaña, `bash` | `~/.bashrc` |
| **Non-interactive** | Scripts, cron jobs, `bash script.sh` | Solo variables de entorno heredadas |

```bash
# Verificar si la shell actual es de login
echo $0
# Si empieza con "-" (ej: -bash) es una login shell
# Si no (ej: bash) es una non-login shell
```

### Regla práctica para DevOps

```bash
# ~/.bashrc — configuración interactiva del usuario
# Aliases, funciones, prompt, etc.
alias ll='ls -lah'
alias k='kubectl'

export EDITOR=vim

# ~/.bash_profile — punto de entrada para login shells
# Solo debe cargar .bashrc y .profile para no duplicar lógica
if [ -f ~/.bashrc ]; then
    source ~/.bashrc
fi
```

> Poné las variables de entorno que necesitás en todas tus sesiones en `~/.bashrc`. Poné el `source ~/.bashrc` en `~/.bash_profile`. Así funciona igual en login y en non-login shells.

```bash
# Aplicar cambios sin cerrar la sesión
source ~/.bashrc
# o equivalente:
. ~/.bashrc
```

---

## Manipulación del PATH

`PATH` es una lista de directorios separados por `:`. La shell busca los ejecutables en orden de izquierda a derecha.

```bash
# Ver el PATH actual
echo $PATH
# /usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# Agregar un directorio al PATH (para la sesión actual)
export PATH="$PATH:/opt/mi-herramienta/bin"

# Agregar al inicio (tiene prioridad sobre los otros)
export PATH="/opt/mi-herramienta/bin:$PATH"

# Ver qué ejecutable se está usando para un comando
which python3
which kubectl

# Ver todos los ejecutables con ese nombre en el PATH
type -a python3

# Verificar que un binario recién agregado al PATH es visible
hash -r    # vacía la caché de comandos de bash
which mi-herramienta
```

### Hacer el cambio de PATH persistente

```bash
# En ~/.bashrc (recomendado para herramientas de usuario)
echo 'export PATH="$PATH:/opt/mi-herramienta/bin"' >> ~/.bashrc
source ~/.bashrc

# Para todos los usuarios del sistema
echo 'export PATH="$PATH:/opt/mi-herramienta/bin"' > /etc/profile.d/mi-herramienta.sh
chmod +x /etc/profile.d/mi-herramienta.sh
```

---

## Variables globales del sistema

Para variables que deben estar disponibles para todos los usuarios y servicios del sistema.

### /etc/environment

El método más simple y portable. No es un script bash — solo pares `CLAVE=valor`.

```bash
# /etc/environment
JAVA_HOME="/usr/lib/jvm/java-17-openjdk-amd64"
LANG="es_AR.UTF-8"
TZ="America/Argentina/Buenos_Aires"
```

```bash
# Verificar que se leyó correctamente (en nueva sesión)
printenv JAVA_HOME
```

### /etc/profile.d/

Directorio con scripts que se ejecutan para todos los usuarios en login shells. Cada herramienta puede poner su propio archivo.

```bash
# Crear un script para configurar variables de una herramienta
cat > /etc/profile.d/mi-app.sh << 'EOF'
export APP_HOME="/opt/mi-app"
export PATH="$PATH:$APP_HOME/bin"
EOF

chmod +x /etc/profile.d/mi-app.sh
```

### Variables para servicios de systemd

Los servicios systemd no leen `.bashrc` ni `/etc/environment` automáticamente. Las variables se configuran en el unit file.

```ini
# /etc/systemd/system/mi-app.service
[Service]
Environment=NODE_ENV=production
Environment=PORT=3000
EnvironmentFile=/opt/mi-app/.env    # cargar desde archivo
```

```bash
# Verificar qué variables ve un servicio systemd
systemctl show mi-app --property=Environment
```
