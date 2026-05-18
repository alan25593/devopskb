---
title: "Linux: Shell Scripting Bash para DevOps"
category: "linux"
tags: ["bash", "scripting", "automatizacion", "shell"]
keywords: ["como hacer un script bash", "variables bash", "if bash", "for loop bash", "while bash", "funciones bash", "argumentos script", "exit code", "manejo de errores bash", "set -e", "trap bash", "leer archivo bash", "script con parametros", "$1 $2 bash", "comprobar si existe archivo", "bash strict mode", "heredoc"]
description: "Bash scripting para automatización DevOps: variables, argumentos, condicionales, loops, funciones, manejo de errores y patrones de scripting de producción."
---

# Shell scripting con Bash

## Contenido

- [Estructura básica y permisos de ejecución](#estructura-básica-y-permisos-de-ejecución)
- [Variables y tipos de datos](#variables-y-tipos-de-datos)
- [Argumentos y parámetros especiales](#argumentos-y-parámetros-especiales)
- [Condicionales](#condicionales)
- [Loops](#loops)
- [Funciones](#funciones)
- [Manejo de errores](#manejo-de-errores)
- [Patrones de scripting para DevOps](#patrones-de-scripting-para-devops)

---

## Estructura básica y permisos de ejecución

```bash
#!/usr/bin/env bash
# El shebang con env busca bash en el PATH — más portable que #!/bin/bash

echo "Hola mundo"
```

```bash
# Dar permiso de ejecución al script
chmod +x mi-script.sh

# Ejecutar
./mi-script.sh

# Ejecutar pasando variables de entorno
DEBUG=true ./mi-script.sh
```

---

## Variables y tipos de datos

```bash
# Asignar variable (sin espacios alrededor del =)
NOMBRE="deploy"
VERSION=3
RUTA="/opt/mi-app"

# Usar una variable
echo "Desplegando versión $VERSION"
echo "Ruta: ${RUTA}/config"    # Las llaves {} son obligatorias para concatenar

# Variables de entorno del sistema
echo "Usuario: $USER"
echo "Home: $HOME"
echo "Shell: $SHELL"

# Capturar la salida de un comando en una variable
FECHA=$(date +%Y%m%d)
GIT_HASH=$(git rev-parse --short HEAD)

# Variable de solo lectura (constante)
readonly MAX_REINTENTOS=3

# Strings multilínea con heredoc
MENSAJE=$(cat <<EOF
Servidor: $(hostname)
Fecha: $(date)
Versión: $VERSION
EOF
)

# Arrays
HOSTS=("web-01" "web-02" "web-03")
echo "${HOSTS[0]}"              # primer elemento
echo "${HOSTS[@]}"              # todos los elementos
echo "${#HOSTS[@]}"             # cantidad de elementos
```

---

## Argumentos y parámetros especiales

```bash
#!/usr/bin/env bash

# $1, $2... — argumentos posicionales
ENTORNO=$1
VERSION=$2

# $0 — nombre del script
# $# — cantidad de argumentos recibidos
# $@ — todos los argumentos como lista
# $* — todos los argumentos como string
# $? — exit code del último comando
# $$ — PID del proceso actual

# Validar que se pasaron los argumentos necesarios
if [[ $# -lt 2 ]]; then
    echo "Uso: $0 <entorno> <version>"
    echo "Ejemplo: $0 production v2.3.1"
    exit 1
fi

echo "Desplegando $VERSION en $ENTORNO"
```

```bash
# Valores por defecto si el argumento no fue pasado
ENTORNO=${1:-staging}
VERSION=${2:-latest}
```

---

## Condicionales

```bash
# if básico
if [[ $ENTORNO == "production" ]]; then
    echo "Desplegando en producción"
fi

# if / elif / else
if [[ $ENTORNO == "production" ]]; then
    REPLICAS=3
elif [[ $ENTORNO == "staging" ]]; then
    REPLICAS=1
else
    REPLICAS=1
fi

# Operadores de comparación para strings
# ==   igual
# !=   distinto
# -z   string vacío
# -n   string no vacío

# Operadores de comparación numérica
# -eq  igual
# -ne  distinto
# -lt  menor que
# -le  menor o igual
# -gt  mayor que
# -ge  mayor o igual

# Verificar si un archivo o directorio existe
if [[ -f "/etc/app/config.yml" ]]; then
    echo "Config encontrada"
fi

if [[ -d "/opt/backups" ]]; then
    echo "Directorio de backups existe"
fi

# Verificar si un binario está disponible
if ! command -v docker &>/dev/null; then
    echo "ERROR: docker no está instalado"
    exit 1
fi

# case — alternativa más legible para múltiples valores
case $ENTORNO in
    production)
        CLUSTER="prod-k8s"
        ;;
    staging)
        CLUSTER="staging-k8s"
        ;;
    *)
        echo "Entorno desconocido: $ENTORNO"
        exit 1
        ;;
esac
```

---

## Loops

```bash
# for sobre una lista fija
for ENTORNO in staging production; do
    echo "Procesando $ENTORNO"
done

# for sobre un array
HOSTS=("web-01" "web-02" "web-03")
for HOST in "${HOSTS[@]}"; do
    echo "Conectando a $HOST"
    ssh deploy@$HOST 'uptime'
done

# for con rango numérico
for i in {1..5}; do
    echo "Intento $i"
done

# for estilo C (útil para índices)
for ((i=0; i<${#HOSTS[@]}; i++)); do
    echo "Host $i: ${HOSTS[$i]}"
done

# while — ejecutar mientras la condición sea verdadera
CONTADOR=0
while [[ $CONTADOR -lt 3 ]]; do
    echo "Intento $CONTADOR"
    ((CONTADOR++))
done

# while — leer un archivo línea a línea
while IFS= read -r linea; do
    echo "Procesando: $linea"
done < /etc/hosts

# until — ejecutar hasta que la condición sea verdadera
until curl -sf http://localhost:8080/health; do
    echo "Esperando que el servicio levante..."
    sleep 2
done
echo "Servicio listo"
```

---

## Funciones

```bash
# Definir una función
log() {
    echo "[$(date +%H:%M:%S)] $1"
}

# Función con exit code de retorno
check_service() {
    local servicio=$1     # local limita la variable al scope de la función
    if systemctl is-active --quiet "$servicio"; then
        return 0    # éxito
    else
        return 1    # fallo
    fi
}

# Llamar funciones
log "Iniciando despliegue"

if check_service "nginx"; then
    log "Nginx está corriendo"
else
    log "ERROR: Nginx no está activo"
    exit 1
fi

# Función que devuelve un valor (capturando stdout)
get_version() {
    cat /opt/app/VERSION
}

VERSION=$(get_version)
log "Versión actual: $VERSION"
```

---

## Manejo de errores

### Bash strict mode

```bash
#!/usr/bin/env bash
set -euo pipefail
# -e: salir inmediatamente si un comando falla
# -u: tratar variables no definidas como error
# -o pipefail: el exit code de un pipeline es el del primer comando que falle
```

### trap para cleanup al salir

```bash
#!/usr/bin/env bash
set -euo pipefail

TMPDIR=$(mktemp -d)

# Registrar función de cleanup que se ejecuta al salir (exitoso o con error)
cleanup() {
    rm -rf "$TMPDIR"
    echo "Limpieza completada"
}
trap cleanup EXIT

# Si el script muere aquí por cualquier motivo, cleanup() se ejecuta igual
cp /opt/app/config.yml "$TMPDIR/"
```

### Verificar exit codes manualmente

```bash
# Correr un comando y verificar si falló
if ! docker pull mi-imagen:latest; then
    echo "ERROR: No se pudo descargar la imagen"
    exit 1
fi

# Ignorar el exit code de un comando específico (no aborta con set -e)
grep "patron" archivo.txt || true

# Capturar exit code sin abortar el script
set +e
resultado=$(comando-que-puede-fallar)
EXIT_CODE=$?
set -e

if [[ $EXIT_CODE -ne 0 ]]; then
    echo "El comando falló con código $EXIT_CODE"
fi
```

---

## Patrones de scripting para DevOps

### Script de deploy con validaciones

```bash
#!/usr/bin/env bash
set -euo pipefail

ENTORNO=${1:-}
VERSION=${2:-}

if [[ -z $ENTORNO || -z $VERSION ]]; then
    echo "Uso: $0 <entorno> <version>"
    exit 1
fi

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

log "Iniciando deploy de $VERSION en $ENTORNO"

# Validar dependencias
for bin in kubectl helm docker; do
    if ! command -v "$bin" &>/dev/null; then
        log "ERROR: $bin no está instalado"
        exit 1
    fi
done

# Lógica del deploy...
log "Deploy completado"
```

### Retry con backoff exponencial

```bash
retry() {
    local intentos=5
    local espera=1
    local cmd=("$@")

    for i in $(seq 1 $intentos); do
        "${cmd[@]}" && return 0
        echo "Intento $i/$intentos falló. Esperando ${espera}s..."
        sleep $espera
        espera=$((espera * 2))
    done

    echo "ERROR: El comando falló después de $intentos intentos"
    return 1
}

retry curl -sf http://api-interna/health
```

### Leer variables desde un archivo .env

```bash
# Exportar todas las variables de un .env al entorno del script
set -a
source /opt/app/.env
set +a

echo "DB_HOST: $DB_HOST"
```
