---
title: "Caché persistente de npm y NuGet en agentes Docker efímeros de Jenkins"
category: "jenkins"
tags: ["docker", "docker-cloud", "npm", "nuget", "performance", "agentes", "builds"]
keywords: ["jenkins docker agent npm cache", "npm ci lento jenkins", "cache npm entre builds docker", "nuget packages cache docker jenkins", "volumen docker permission denied npm", "docker named volume root owner", "npm_config_prefer_offline", "NUGET_PACKAGES jenkins", "acelerar builds angular jenkins", "docker cloud plugin mounts"]
description: "Cómo dejar de reinstalar todas las dependencias en cada build cuando los agentes son contenedores efímeros: volúmenes Docker por host para npm y NuGet, el problema de permisos (root) y cómo medir la ganancia."
---

# Caché persistente de npm y NuGet en agentes Docker efímeros de Jenkins

Con el plugin Docker Cloud cada build corre en un contenedor nuevo que se borra al terminar. Tiene ventajas (builds limpios, nada se pisa), pero `npm ci` / `npm install` vuelve a bajar **todos** los paquetes en cada build: 2 a 8 minutos según el proyecto. Con `dotnet restore` pasa lo mismo.

## La idea

Un **volumen Docker con nombre por host**, montado en las plantillas de Docker Cloud. El contenedor sigue siendo efímero, pero la caché sobrevive:

```
Host Docker
 └─ volumen "jenkins-npm-cache"   (persiste)
       ▲ montado en /home/jenkins/.npm de cada contenedor de build
```

- No se comparte `node_modules`: cada build instala limpio, pero desde la caché local.
- La caché de npm (cacache) y la carpeta global de NuGet verifican integridad y soportan builds concurrentes.
- Cada host tiene su propia caché: el primer build de cada proyecto en ese host la llena.

## Configuración en la plantilla (Docker Cloud → Template → Container settings)

**Mounts:**
```
type=volume,source=jenkins-npm-cache,destination=/home/jenkins/.npm
type=volume,source=jenkins-nuget-cache,destination=/opt/cache/nuget
```
**Environment:**
```
npm_config_prefer_offline=true
NUGET_PACKAGES=/opt/cache/nuget
```

- `npm_config_prefer_offline=true` hace que npm use la caché sin revalidar cada paquete contra el registry. Al ponerlo como variable de la plantilla aplica a todos los `npm install`/`npm ci` sin tocar los Jenkinsfiles.
- Para NuGet conviene **no** montar sobre `~/.nuget`: si la carpeta no existe en la imagen, Docker la crea como root y después falla escribir `~/.nuget/NuGet/NuGet.Config`. Mejor una ruta aparte y `NUGET_PACKAGES`.
- Revisá los Jenkinsfiles que fuerzan otra ruta (`export npm_config_cache=$HOME/.npm-cache-algo`): esa carpeta queda dentro del contenedor y se pierde.

## La trampa: el volumen se crea a nombre de root

Si la ruta de destino no existe en la imagen, Docker crea el volumen nuevo con dueño `root`. El agente corre como `jenkins` (por ejemplo, uid 1000) y npm no puede escribir: o falla con `EACCES`, o (peor) instala igual sin cachear nada. Para verificarlo desde el agente:

```sh
ls -ld /home/jenkins/.npm          # drwxr-xr-x root root  -> mal
touch /home/jenkins/.npm/.w        # Permission denied
```

Se arregla **una sola vez por host**, creando el volumen y cambiándole el dueño con un contenedor efímero (por ejemplo, por la API de Docker):

```sh
docker volume create jenkins-npm-cache
docker volume create jenkins-nuget-cache
docker run --rm --user root -v jenkins-npm-cache:/v/npm -v jenkins-nuget-cache:/v/nuget \
    <imagen-de-build-ya-presente> sh -c 'chown 1000:1000 /v/npm /v/nuget'
```

## Medir antes y después

Comparar el tiempo entre `+ npm ci` y `added N packages` en el log, en **dos corridas en el mismo host**: la primera llena la caché y la segunda la usa. Ojo: si la plantilla con la caché está en un solo host, el build puede caer en otro y la medición no sirve.

Resultado real (proyecto Angular, 1.116 paquetes):

| | npm install | Build total |
|---|---|---|
| Sin caché | 125 s | 6,1 min |
| Con caché llena | **41 s** | **3,9 min** |

## Mantenimiento

- La caché crece: una tarea periódica que borre lo que no se usa hace más de 30 días (o `npm cache verify`) la mantiene acotada.
- Complemento: un proxy de npm/NuGet en la red local (Nexus, Artifactory) para lo que no está en caché, que además protege si el registry público se cae.
