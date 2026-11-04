---
title: "GitLab Runners: Tipos, Executors, Registro y config.toml"
category: "gitlab"
tags: ["runners", "agentes", "docker", "config-toml", "infraestructura", "windows"]
keywords: ["gitlab runner", "instalar gitlab runner", "config toml gitlab runner", "executors docker shell kubernetes", "glrt token gitlab runner", "runner windows gitlab", "runners compartidos vs especificos", "troubleshooting gitlab runner"]
description: "Guía completa de GitLab Runner: arquitectura de agentes, executors (Docker, Shell, K8s), registro moderno con tokens glrt-, config.toml y runners Windows."
---

# GitLab Runners: Tipos, Executors y Configuración

El **GitLab Runner** es el motor de ejecución desacoplado de GitLab. A diferencia de Jenkins, donde el controller comúnmente abre conexiones SSH o mantiene sockets remoting pesados hacia los agentes, el GitLab Runner es una aplicación ligera escrita en Go que realiza **polling constante por HTTPS** contra la API de GitLab.

---

## Tipos de Runners según su Ámbito

1. **Shared Runners (Instancia):** Disponibles para todos los proyectos y grupos de la instancia o en GitLab.com. Ideales para tareas genéricas de build o linting.
2. **Group Runners:** Configurados a nivel de Grupo. Todos los proyectos y subgrupos dentro de ese árbol pueden utilizarlos automáticamente.
3. **Project Runners:** Dedicados exclusivamente a un proyecto específico (por ejemplo, para builds que requieren hardware especializado, GPUs o acceso a una VPN sensible).

---

## Tipos de Executors: ¿Cuál Elegir?

El *executor* define el entorno donde el runner procesa los comandos del bloque `script`:

| Executor | Caso de Uso Recomendado | Ventajas / Desventajas |
|---|---|---|
| **`docker`** (Más popular) | Builds estándar, microservicios, compilación Node/Go/Java. | **Ventaja:** Entorno limpio y reproducible por job. Cada job usa su propia `image:`. |
| **`shell`** | Nodos donde se requiere interactuar directamente con el sistema operativo anfitrión. | **Desventaja:** Falta de aislamiento. Los jobs comparten filesystem y dependencias del host. |
| **`kubernetes`** | Infraestructura dinámica y elástica en clusters K8s. | **Ventaja:** Levanta Pods efímeros por job y escala a cero cuando no hay demanda. |
| **`docker-windows`** | Compilación de artefactos nativos de Windows en contenedores. | Requiere Windows Server anfitrión con soporte de contenedores de Windows. |
| **`ssh` / `virtualbox`** | Casos legacy de máquinas virtuales dedicadas. | Mayor sobrecarga operativa de aprovisionamiento. |

---

## Registro Moderno de Runners (Tokens `glrt-`)

A partir de GitLab 16.0 y consolidado en versiones recientes, los antiguos *registration tokens* están deprecados por razones de seguridad.

### Proceso de Registro Actual:
1. En la UI de GitLab (**Settings > CI/CD > Runners** a nivel de proyecto o grupo), hacé clic en **New project/group runner**.
2. Asigná los **tags** (ej: `linux`, `docker`, `compiler`) y guardá.
3. GitLab te proporcionará un token de autenticación que comienza con el prefijo **`glrt-...`**.
4. En el servidor del Runner, ejecutá el comando de registro:

```bash
gitlab-runner register   --non-interactive   --url "https://gitlab.example.com"   --token "glrt-t1_xxxxxxxxxxxx"   --executor "docker"   --docker-image "alpine:latest"   --description "runner-docker-node01"
```

---

## Archivo de Configuración Clave: `config.toml`

La configuración del runner reside en `/etc/gitlab-runner/config.toml` (o en la carpeta de instalación en Windows):

```toml
concurrent = 4               # Cantidad total de jobs simultáneos en este runner host
check_interval = 5           # Intervalo en segundos para consultar la API de GitLab

[session_server]
  session_timeout = 1800

[[runners]]
  name = "runner-docker-node01"
  url = "https://gitlab.example.com"
  id = 12
  token = "glrt-t1_xxxxxxxxxxxx"
  token_obtained_at = 2026-10-01T12:00:00Z
  token_expires_at = 0001-01-01T00:00:00Z
  executor = "docker"

  [runners.docker]
    tls_verify = false
    image = "alpine:latest"
    privileged = false       # Ojo: habilitar solo si se usa Docker-in-Docker real
    disable_entrypoint_overwrite = false
    oom_kill_disable = false
    disable_cache = false
    volumes = ["/cache", "/var/run/docker.sock:/var/run/docker.sock"]
    pull_policy = ["if-not-present"]  # Acelera builds evitando descargar imágenes si ya existen
```

---

## GitLab Runner en Windows (Servicio del Sistema)

Para proyectos .NET Framework, IIS o builds de Windows:

1. Descargá el binario `gitlab-runner-windows-amd64.exe` y renombralo a `gitlab-runner.exe`.
2. Registralo con executor `shell`:
   ```powershell
   .\gitlab-runner.exe register --url "https://gitlab.example.com" --token "glrt-..." --executor "shell" --shell "powershell"
   ```
3. Instalar e iniciar como servicio de Windows:
   ```powershell
   .\gitlab-runner.exe install --user ".\wsiadmin" --password "SecretoPassword"
   .\gitlab-runner.exe start
   ```

> **Truco:** Al correr como servicio con una cuenta de servicio específica (`wsiadmin`), el runner tiene acceso a recursos de red y certificados instalados en el perfil de dicho usuario.

---

## Si Venís de Jenkins

| En Jenkins | En GitLab |
|---|---|
| Nodos con labels (`label 'COMPILER_WINDOWS'`) | Runners con tags (`tags: [windows, powershell]`) |
| Número de *Executors* por nodo | Directiva `concurrent` en `config.toml` |
| Agente conectado por JNLP / WebSocket | GitLab Runner polling por HTTPS |
| Docker Cloud Plugin con `pull_policy: PULL_NEVER` | Runner Docker con `pull_policy = ["if-not-present"]` |

---

## Relacionado

- [/article/gitlab/01-fundamentos/](/article/gitlab/01-fundamentos/) — Arquitectura general y modelos de despliegue.
- [/article/gitlab/07-artifacts-y-cache/](/article/gitlab/07-artifacts-y-cache/) — Configuración de cache local y distribuido en runners.
- [/article/gitlab/17-troubleshooting/](/article/gitlab/17-troubleshooting/) — Diagnóstico de runners desconectados o jobs colgados.
- [/article/jenkins/04-agentes-y-nodos/](/article/jenkins/04-agentes-y-nodos/) — Topología de agentes en Jenkins.
