---
title: "Linux: Procesamiento de Texto, Filtrado de Logs con grep, awk y sed"
category: "linux"
tags: ["grep", "awk", "sed", "logs", "texto", "pipeline"]
keywords: ["buscar en logs", "filtrar logs linux", "grep recursivo", "grep con contexto", "contar errores log", "sed reemplazar", "awk imprimir columna", "extraer campo log", "sort uniq contar", "xargs", "cut campos", "pipeline linux", "grep -v excluir", "buscar patron", "tail grep", "wc -l contar lineas"]
description: "Herramientas de procesamiento de texto para analizar logs en producción: grep avanzado, awk para extraer campos, sed para transformar, y pipelines con cut, sort, uniq y xargs."
---

# Procesamiento de texto y filtrado de logs

## Contenido

- [grep: buscar patrones en archivos y logs](#grep-buscar-patrones-en-archivos-y-logs)
- [sed: transformar y reemplazar texto](#sed-transformar-y-reemplazar-texto)
- [awk: procesar columnas y campos](#awk-procesar-columnas-y-campos)
- [Pipelines: cut, sort, uniq y wc](#pipelines-cut-sort-uniq-y-wc)
- [xargs: construir comandos desde la salida](#xargs-construir-comandos-desde-la-salida)
- [Recetas para logs de producción](#recetas-para-logs-de-producción)

---

## grep: buscar patrones en archivos y logs

```bash
# Buscar un patrón en un archivo
grep "ERROR" /var/log/app/app.log

# Ignorar mayúsculas/minúsculas
grep -i "error" /var/log/app/app.log

# Buscar recursivo en todos los archivos de un directorio
grep -r "connection refused" /var/log/

# Excluir líneas que coincidan (invertir el match)
grep -v "DEBUG" /var/log/app/app.log

# Ver N líneas de contexto antes y después del match
grep -C 3 "NullPointerException" app.log

# Solo antes del match
grep -B 2 "FATAL" app.log

# Solo después del match
grep -A 5 "OutOfMemoryError" app.log

# Mostrar solo el nombre de los archivos que tienen el patrón
grep -rl "DATABASE_URL" /etc/

# Contar cuántas líneas hacen match
grep -c "ERROR" /var/log/app/app.log

# Mostrar el número de línea de cada match
grep -n "timeout" /var/log/nginx/error.log

# Usar expresión regular extendida (ERE)
grep -E "ERROR|FATAL|CRITICAL" app.log

# Buscar una cadena literal (sin interpretar como regex)
grep -F "10.0.0.1:5432" access.log
```

---

## sed: transformar y reemplazar texto

`sed` trabaja línea por línea. El patrón más usado es la sustitución: `s/patrón/reemplazo/flags`.

```bash
# Reemplazar la primera ocurrencia por línea
sed 's/foo/bar/' archivo.txt

# Reemplazar todas las ocurrencias en cada línea (flag g = global)
sed 's/foo/bar/g' archivo.txt

# Reemplazar y guardar el cambio en el archivo original (in-place)
sed -i 's/localhost/10.0.0.5/g' /etc/app/config.ini

# En macOS sed necesita argumento para -i (usar '' para no crear backup)
sed -i '' 's/localhost/10.0.0.5/g' /etc/app/config.ini

# Borrar líneas que coincidan con un patrón
sed '/^#/d' config.txt          # eliminar comentarios
sed '/^$/d' config.txt          # eliminar líneas vacías

# Imprimir solo líneas que coincidan (como grep pero con capacidad de transformar)
sed -n '/ERROR/p' app.log

# Reemplazar solo en un rango de líneas (ej: líneas 10 a 20)
sed '10,20s/old/new/g' archivo.txt
```

---

## awk: procesar columnas y campos

`awk` trata cada línea como un registro con campos separados por un delimitador. Por defecto el separador es el espacio/tab.

```bash
# Imprimir la columna 1 (por defecto separado por espacios)
awk '{ print $1 }' access.log

# Imprimir columnas 1 y 4
awk '{ print $1, $4 }' access.log

# Cambiar el separador de campo (ej: CSV con comas)
awk -F',' '{ print $2 }' datos.csv

# Separador de campo para logs con : (ej: /etc/passwd)
awk -F':' '{ print $1, $6 }' /etc/passwd

# Filtrar e imprimir: solo líneas donde la columna 9 es 500 (HTTP 500)
awk '$9 == 500 { print $0 }' access.log

# Sumar valores de una columna (ej: bytes transferidos en access.log)
awk '{ sum += $10 } END { print sum }' access.log

# Contar ocurrencias por valor (ej: contar hits por código HTTP)
awk '{ count[$9]++ } END { for (code in count) print code, count[code] }' access.log

# Imprimir líneas que contienen un patrón
awk '/ERROR/ { print }' app.log

# Combinar filtro y transformación
awk '/ERROR/ { print $1, $2, $NF }' app.log   # $NF = última columna
```

---

## Pipelines: cut, sort, uniq y wc

### cut — extraer columnas de texto delimitado

```bash
# Extraer el campo 1 de un CSV (separado por comas)
cut -d',' -f1 datos.csv

# Extraer campos 1 y 3
cut -d',' -f1,3 datos.csv

# Extraer los primeros 10 caracteres de cada línea
cut -c1-10 archivo.txt

# Extraer el username de /etc/passwd
cut -d':' -f1 /etc/passwd
```

### sort — ordenar líneas

```bash
# Orden alfabético
sort archivo.txt

# Orden numérico
sort -n numeros.txt

# Orden inverso
sort -r archivo.txt

# Orden numérico inverso (útil para top N)
sort -nr archivo.txt | head -10

# Ordenar por columna específica (columna 3, numérico)
sort -k3 -n access.log

# Eliminar duplicados al ordenar
sort -u archivo.txt
```

### uniq — eliminar o contar duplicados

`uniq` solo detecta duplicados **consecutivos** — siempre usalo después de `sort`.

```bash
# Eliminar líneas duplicadas
sort archivo.txt | uniq

# Contar cuántas veces aparece cada línea
sort archivo.txt | uniq -c

# Ordenar por frecuencia descendente (patrón clásico de análisis)
sort archivo.txt | uniq -c | sort -nr

# Mostrar solo las líneas que aparecen más de una vez
sort archivo.txt | uniq -d
```

### wc — contar

```bash
# Contar líneas de un archivo
wc -l access.log

# Contar líneas que hacen match (alternativa a grep -c)
grep "ERROR" app.log | wc -l
```

---

## xargs: construir comandos desde la salida

`xargs` toma la salida de un comando y la pasa como argumentos a otro.

```bash
# Borrar todos los archivos .log encontrados por find
find /tmp -name "*.log" | xargs rm

# Ejecutar grep en una lista de archivos
grep -rl "password" /etc/ | xargs grep -n "password"

# Limitar la cantidad de argumentos por ejecución (útil para lotes grandes)
cat lista-de-ips.txt | xargs -n 1 ping -c 1

# Ejecutar en paralelo (ej: 4 procesos simultáneos)
cat hosts.txt | xargs -P 4 -I {} ssh {} 'uptime'

# Usar un placeholder para insertar el argumento en posición específica
find . -name "*.conf" | xargs -I {} cp {} {}.bak
```

---

## Recetas para logs de producción

### Top 10 IPs que más hits generaron en Nginx

```bash
awk '{ print $1 }' /var/log/nginx/access.log | sort | uniq -c | sort -nr | head -10
```

### Contar errores HTTP 500 por hora

```bash
grep " 500 " /var/log/nginx/access.log | awk '{ print $4 }' | cut -d: -f1,2 | sort | uniq -c
```

### Extraer todos los stack traces de Java de un log

```bash
grep -A 20 "Exception" /var/log/app/app.log | grep -v "^--$"
```

### Ver los últimos errores en tiempo real filtrando DEBUG

```bash
tail -f /var/log/app/app.log | grep -v "DEBUG"
```

### Buscar qué proceso escribió en un log en los últimos 5 minutos

```bash
find /var/log -newer /tmp/marca-tiempo -type f 2>/dev/null
# Primero crear la marca: touch /tmp/marca-tiempo
```

### Contar líneas de error por tipo en un log estructurado

```bash
grep -oE '"level":"[^"]*"' app.log | sort | uniq -c | sort -nr
```
