---
title: "Troubleshooting de Jenkins: Errores Frecuentes y Cómo Resolverlos"
category: "jenkins"
tags: ["troubleshooting", "errores", "debug", "windows", "cps", "agentes"]
keywords: ["error jenkins", "NotSerializableException", "Scripts not permitted to use method", "script approval", "readJSON falla", "trailing comma json", "cannot run program nohup", "sh en windows", "access denied borrar workspace", "agente no conecta", "remoting version mismatch", "waitForQualityGate timeout", "NotImplemented UploadPart OCI", "build colgado", "cola jenkins no avanza", "There are no nodes with the label", "jenkins lento", "OutOfMemoryError jenkins"]
description: "Guía de diagnóstico para los errores más comunes de Jenkins: CPS y serialización, script approval, JSON inválido, steps de Linux en Windows, workspaces bloqueados, agentes que no conectan, cola trabada, Sonar, uploads a Object Storage y problemas de memoria."
---

# Troubleshooting de Jenkins

## Pipelines y Groovy

| Error | Causa | Solución |
|-------|-------|----------|
| `java.io.NotSerializableException: java.util.regex.Matcher` (u otra clase) | Objeto no serializable vivo entre steps (CPS) | Mover la lógica a un método `@NonCPS`, o asignar `null` antes del siguiente step |
| `Scripts not permitted to use method ...` | Código en sandbox llamando una API no aprobada | **Manage Jenkins → In-process Script Approval**, o mover el código a una librería global |
| `No such DSL method 'xxx'` | Falta el plugin que provee el step, o typo | Verificar plugin (`readJSON` = *Pipeline Utility Steps*, `httpRequest` = *HTTP Request*) |
| `No signature of method: ... call()` en `vars/` | Firma de `call()` no coincide con la invocación | Revisar parámetros (Map vs posicionales, closure al final) |
| `readJSON` falla o devuelve algo inesperado | JSON inválido (trailing comma, comillas) | `jq . archivo.json`; agregar validación en CI del repo |
| Todas las ramas de un `parallel` usan el último valor | Closure captura la variable del loop | Copiar a una local: `def r = repo` dentro del `each` |
| `properties([...])` borró los parámetros del job | `properties` reemplaza toda la config | Declarar ahí todos los parámetros |
| Warning *"A secret was passed to sh using Groovy String interpolation"* | `sh "... ${PASS}"` | Comillas simples: `sh '... $PASS'` |

---

## Windows

| Error | Causa | Solución |
|-------|-------|----------|
| `Cannot run program "nohup"` | `sh` en un nodo Windows | Usar `bat`/`powershell`; verificar el label del `node()` |
| `Access is denied` / `The process cannot access the file` al borrar | Servicio/IIS o proceso de build aún vivo; archivos read-only | Detener el servicio (`iis`/`windowsTools` helper), `attrib -r -h -s /s /d`, matar `dotnet`/`node`/`VBCSCompiler` |
| `returnStdout` de `bat` trae el comando además del resultado | `bat` hace eco | Prefijar `@` o tomar `.split('\n').last()` |
| Carpetas `*_ws-cleanup_*` acumulándose | Borrado diferido que no terminó | `cleanWs(disableDeferredWipeout: true)` |
| Rutas > 260 caracteres | `node_modules` profundos, workspaces largos | `git config --system core.longpaths true`, workspace más corto (`ws('C:\\w\\job')`) |
| Symlinks del repo llegan como archivos de texto | Git en Windows sin symlinks | `git config --global core.symlinks true` antes del checkout (requiere privilegio) |

---

## Agentes y cola

| Síntoma | Causa | Solución |
|---------|-------|----------|
| *"There are no nodes with the label 'X'"* | Label mal escrito o ningún nodo/cloud lo ofrece | Revisar labels en `/computer/` y templates del cloud |
| *"Waiting for next available executor"* eterno | Todos los executors ocupados o nodos offline | Ver `/computer/`; buscar builds colgados; `input` dentro de `node` reteniendo executors |
| `Failed to launch` en loop en agentes de cloud | Host Docker caído o imagen inexistente (*Never pull*) | Marcar nodo temporarily offline (watchdog); verificar `docker images` en el host y el `nombre:tag` exacto |
| Agente conecta y se desconecta | `agent.jar` de otra versión de Jenkins | Re-descargar de `/jnlpJars/agent.jar` del controller actual; reconstruir imágenes |
| Agente inbound no conecta detrás de proxy | Puerto TCP 50000 bloqueado | Usar `-webSocket` |
| Build figura "en ejecución" pero no hace nada / Abort no responde | Build zombie (ejecución perdida tras reinicio) o step trabado | [Liberar un job colgado](/article/jenkins/13-liberar-job-colgado/): `doStop` → `doTerm` → `doKill` → `finish` |
| Al arrancar se lanzan builds viejos | `queue.xml` restaurado | Borrar `queue.xml` con Jenkins detenido / `init.groovy.d` que vacía la cola |

---

## Integraciones

| Síntoma | Causa | Solución |
|---------|-------|----------|
| `waitForQualityGate` llega al timeout | SonarQube no puede llamar al webhook de Jenkins | Configurar webhook `https://jenkins/sonarqube-webhook/` y verificar conectividad Sonar → Jenkins |
| Quality Gate `NONE` | Proyecto sin gate asignado o análisis en otra instancia | Revisar `withSonarQubeEnv('<nombre>')` y gate del proyecto |
| Upload a Artifactory OK en prod, falla en DRP | La URL de Artifactory la usa el agente y apunta a una IP inalcanzable | Actualizar `org.jfrog.hudson.ArtifactoryBuilder.xml` con una IP alcanzable desde los agentes |
| `NotImplemented` en `UploadPart` subiendo a OCI con `aws s3 cp` | aws-cli manda `aws-chunked` con checksum trailer | Usar rclone (backend s3, provider Other) |
| Git: `Host key verification failed` | known_hosts sin el proveedor | `ssh-keyscan bitbucket.org >> ~/.ssh/known_hosts` en el agente/imagen |
| Git: `no matching host key type found. Their offer: ssh-rsa` | Cliente SSH moderno rechaza RSA/SHA1 | En `~/.ssh/config`: `HostkeyAlgorithms +ssh-rsa` y `PubkeyAcceptedAlgorithms +ssh-rsa` (o migrar la clave a ed25519) |
| Submódulo no se inicializa | Timeout/credenciales del submódulo | `SubmoduleOption` con `parentCredentials: true` y `timeout`; validar con `fileExists('Submodulo')` y fallar explícito |
| Tráfico hacia redes de clientes por VPN se pierde desde Jenkins en Docker | Subred bridge de Docker solapa con la red del cliente | `network_mode: host` o `default-address-pools` (ver [Jenkins en Docker](/article/jenkins/08-jenkins-en-docker/)) |

---

## Controller

| Síntoma | Diagnóstico | Solución |
|---------|-------------|----------|
| UI lenta / `OutOfMemoryError` | `jstat -gcutil <pid> 5s`, *Manage Jenkins → System Information* | Subir `-Xmx`; reducir historial (`buildDiscarder`); no compilar en el controller |
| Disco lleno | `du -sh jobs workspace` | Ver [Mantenimiento](/article/jenkins/10-mantenimiento-y-limpieza/) |
| Plugin rompió el arranque | `docker logs jenkins` / `journalctl -u jenkins` | Mover `plugins/<plugin>.jpi` a `.disabled` o restaurar la versión anterior (`<plugin>.bak`) |
| Credenciales no se descifran tras restore | Falta `secrets/` o no corresponde al `credentials.xml` | Restaurar ambos del mismo backup |

---

## Comandos de diagnóstico

```bash
# Logs del controller
journalctl -u jenkins -f              # paquete
docker logs -f --tail 200 jenkins     # Docker
tail -f /var/log/jenkins/jenkins.log

# Log plano de un build
curl -s -u user:API_TOKEN https://jenkins/job/Folder/job/mi-job/123/consoleText | less

# Thread dump (builds o UI colgados)
curl -s -u user:API_TOKEN https://jenkins/threadDump > threads.txt

# ¿El agente alcanza al controller?
curl -sI https://jenkins/jnlpJars/agent.jar | head -1
```

```groovy
// En el pipeline: entorno y nodo actuales
echo "NODE=${env.NODE_NAME} WS=${env.WORKSPACE} unix=${isUnix()}"
sh 'env | sort'          // o: bat 'set'
```
