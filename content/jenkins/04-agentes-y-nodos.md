---
title: "Agentes Jenkins: Inbound, SSH, Servicio Windows y Docker Cloud"
category: "jenkins"
tags: ["agentes", "nodos", "agent.jar", "websocket", "winsw", "docker-cloud", "ssh"]
keywords: ["jenkins agent", "conectar agente jenkins", "agent.jar", "jnlp", "inbound agent", "websocket agent", "jenkins slave windows servicio", "winsw jenkins", "jenkins-slave.xml", "ssh launcher jenkins", "docker cloud plugin", "agente efimero", "imagen agente jenkins", "pull never", "attach connector", "remoting version", "label jenkins"]
description: "Cómo conectar agentes a Jenkins: inbound vía agent.jar con WebSocket, agente Windows como servicio con WinSW, SSH launcher y agentes efímeros con el Docker Cloud plugin, incluyendo cómo construir las imágenes de runners."
---

# Agentes Jenkins

## Métodos de conexión

| Método | Quién inicia | Cuándo usarlo |
|--------|--------------|---------------|
| **Inbound (JNLP / WebSocket)** | El agente se conecta al controller | Agente detrás de NAT/firewall; Windows como servicio |
| **SSH launcher** | El controller entra por SSH y lanza `agent.jar` | Linux (o Windows con OpenSSH) alcanzable desde el controller |
| **Docker Cloud** | El controller crea un contenedor por build | Agentes efímeros, toolchains aislados por imagen |
| **Kubernetes plugin** | El controller crea un Pod por build | Cluster K8s disponible |

---

## Agente inbound (Linux)

En el controller: **Manage Jenkins → Nodes → New Node** → *Launch agent by connecting it to the controller*. Jenkins muestra el `secret`.

```bash
# Descargar agent.jar DEL MISMO controller (la versión de remoting debe coincidir)
curl -sO http://jenkins:8080/jnlpJars/agent.jar

java -jar agent.jar \
  -url http://jenkins:8080/ \
  -secret @secret-file \
  -name "DATABASE_ORA" \
  -webSocket \
  -workDir "/opt/jenkins-agent"
```

- `-webSocket`: usa el puerto HTTP(S) del controller; no hace falta abrir el puerto TCP de agentes (50000).
- `-secret @archivo`: lee el secret de un archivo en vez de dejarlo en la línea de comandos (visible en `ps`).

> **Nunca** commitear scripts de arranque con el `-secret` en texto plano. Cualquiera con el secret puede registrarse como ese nodo y recibir builds (y sus credenciales).

Como servicio systemd:

```ini
# /etc/systemd/system/jenkins-agent.service
[Unit]
Description=Jenkins inbound agent
After=network-online.target

[Service]
User=jenkins
WorkingDirectory=/opt/jenkins-agent
ExecStart=/usr/bin/java -jar /opt/jenkins-agent/agent.jar -url http://jenkins:8080/ -secret @/opt/jenkins-agent/secret -name DATABASE_ORA -webSocket -workDir /opt/jenkins-agent
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

---

## Agente Windows como servicio (WinSW)

Se usa [WinSW](https://github.com/winsw/winsw) renombrado a `jenkins-agent.exe` junto a un XML con el mismo nombre.

```xml
<!-- C:\JenkinsAgent\jenkins-agent.xml -->
<service>
  <id>jenkinsagent</id>
  <name>JenkinsAgent</name>
  <description>Jenkins inbound agent</description>
  <executable>C:\Program Files\Java\jdk-17\bin\java.exe</executable>
  <arguments>-jar "C:\JenkinsAgent\agent.jar" -workDir "C:\JenkinsAgent" -name "COMPILER_WINDOWS" -url https://jenkins.miorg.local/ -secret @C:\JenkinsAgent\secret -webSocket</arguments>

  <logmode>rotate</logmode>
  <onfailure action="restart" />

  <extensions>
    <!-- Mata java.exe huérfanos de una ejecución anterior al arrancar -->
    <extension enabled="true"
               className="winsw.Plugins.RunawayProcessKiller.RunawayProcessKillerExtension"
               id="killOnStartup">
      <pidfile>%BASE%\jenkins_agent.pid</pidfile>
      <stopTimeout>5000</stopTimeout>
      <stopParentFirst>false</stopParentFirst>
    </extension>
  </extensions>
</service>
```

```powershell
cd C:\JenkinsAgent
.\jenkins-agent.exe install
.\jenkins-agent.exe start
Get-Service jenkinsagent
Get-Content .\jenkins-agent.out.log -Tail 50
```

> El servicio corre como `LocalSystem` por defecto. Si los builds necesitan acceso a shares de red o a un perfil de usuario (npm cache, certificados), configurar `<serviceaccount>` con un usuario de dominio.

---

## SSH launcher

Configurado en el nodo: **Launch method → Launch agents via SSH**, host, credencial (usuario/clave o key) y *Host Key Verification Strategy*.

También se puede definir por Groovy (útil en DRP o al automatizar):

```groovy
import jenkins.model.Jenkins
import hudson.plugins.sshslaves.SSHLauncher
import hudson.plugins.sshslaves.verifiers.NonVerifyingKeyVerificationStrategy

def node = Jenkins.instance.getNode('COMPILER_WINDOWS')
def launcher = new SSHLauncher('10.0.0.10', 22, 'compiler-windows-ssh')
launcher.setSshHostKeyVerificationStrategy(new NonVerifyingKeyVerificationStrategy())
launcher.setLaunchTimeoutSeconds(60)
launcher.setMaxNumRetries(10)
launcher.setRetryWaitTime(15)
node.setLauncher(launcher)
Jenkins.instance.updateNode(node)
node.toComputer()?.connect(true)
```

> `NonVerifyingKeyVerificationStrategy` solo es aceptable en redes privadas donde la VM se recrea y cambia su host key (ej. DRP). En producción usar *Known hosts file* o *Manually trusted*.

---

## Docker Cloud: agentes efímeros por label

**Manage Jenkins → Clouds → Docker**: se define el `dockerHost` (`tcp://host:2375` o `unix:///var/run/docker.sock`) y uno o más **templates**:

| Campo del template | Ejemplo | Nota |
|--------------------|---------|------|
| Labels | `COMPILER_LINUX` | Lo que pide el pipeline en `node('...')` |
| Docker Image | `compiler-linux-agent:latest` | **Debe existir con ese `nombre:tag` exacto** si el pull strategy es *Never pull* |
| Connect method | *Attach Docker container* | `docker exec` en el contenedor; no requiere red entre agente y controller |
| Remote FS root | `/home/jenkins` | |
| Pull strategy | `Never pull` | Imágenes buildeadas localmente en el host Docker |

> Con `PULL_NEVER`, un typo en el tag hace fallar la provisión del agente. Si en producción una imagen quedó con tag `lastest` (typo), al reconstruir el entorno hay que **preservar el typo**: Jenkins matchea el string literal.

### Imagen de runner

```dockerfile
FROM ubuntu:22.04
LABEL description="Jenkins Agent with Node.js"

# agent.jar se baja del controller al que se va a conectar: así la versión de remoting coincide
ARG JENKINS_AGENT_URL=http://jenkins:8080/jnlpJars/agent.jar

RUN apt-get update && apt-get install -y \
      build-essential curl git openssh-client openjdk-17-jre-headless locales && \
    locale-gen en_US.UTF-8 && apt-get clean

ENV LANG=en_US.UTF-8 LANGUAGE=en_US:en LC_ALL=en_US.UTF-8

RUN useradd -m -d /home/jenkins -s /bin/bash jenkins

# Varias versiones de Node con update-alternatives + alias explícitos (node20, node22)
RUN mkdir -p /usr/local/lib/nodejs && \
    for v in 20.19.0 22.12.0; do \
      curl -fsSL https://nodejs.org/dist/v$v/node-v$v-linux-x64.tar.xz -o /tmp/n.tar.xz && \
      mkdir -p /usr/local/lib/nodejs/node-v$v && \
      tar -xJf /tmp/n.tar.xz -C /usr/local/lib/nodejs/node-v$v --strip-components=1 && rm /tmp/n.tar.xz; \
    done && \
    update-alternatives --install /usr/bin/node node /usr/local/lib/nodejs/node-v20.19.0/bin/node 20 && \
    update-alternatives --install /usr/bin/node node /usr/local/lib/nodejs/node-v22.12.0/bin/node 22 && \
    ln -s /usr/local/lib/nodejs/node-v22.12.0/bin/node /usr/local/bin/node22

RUN curl -fsSL -o /home/jenkins/agent.jar "${JENKINS_AGENT_URL}" && \
    chown jenkins:jenkins /home/jenkins/agent.jar

# known_hosts del proveedor Git para clonar por SSH sin prompt
RUN mkdir -p /home/jenkins/.ssh && \
    ssh-keyscan bitbucket.org >> /home/jenkins/.ssh/known_hosts && \
    chown -R jenkins:jenkins /home/jenkins/.ssh && chmod 700 /home/jenkins/.ssh && chmod 600 /home/jenkins/.ssh/known_hosts

WORKDIR /home/jenkins
USER jenkins
CMD ["java", "-jar", "/home/jenkins/agent.jar"]
```

```bash
# Build contra el controller local (útil en DRP: no depende de alcanzar producción)
docker build --network=host \
  --build-arg JENKINS_AGENT_URL=http://localhost:8080/jnlpJars/agent.jar \
  -t compiler-linux-agent-node:latest -f Dockerfile_COMPILER_NODE .
```

Catálogo típico de runners por label:

| Imagen | Contenido |
|--------|-----------|
| `compiler-linux-agent` | build-essential, Node, varios .NET SDK |
| `compiler-linux-agent-node` | Node 20/22 |
| `compile-net10` | .NET 10 SDK |
| `sonar-scanner` | SonarScanner CLI |
| `aws-cli-agent` | AWS CLI v2 |
| `sqlplus-jenkins-runner` | Oracle Instant Client + SQL*Plus |

---

## Elegir el nodo en el pipeline

```groovy
node('COMPILER_WINDOWS') { ... }            // label exacto
node('COMPILER_LINUX && docker') { ... }    // expresión de labels
node(isNet10 ? 'COMPILER_LINUX_NET10' : 'COMPILER_WINDOWS') { ... }  // decidido en runtime
node(envData.core.nodeName) { ... }         // leído de environments.json
```

| Label | SO | Steps válidos |
|-------|----|---------------|
| `COMPILER_LINUX*`, `master` | Linux | `sh` |
| `COMPILER_WINDOWS`, nodos IIS | Windows | `bat`, `powershell` |

> `sh` en un nodo Windows falla con `Cannot run program "nohup"`. Verificar siempre el label antes de escribir el paso.

---

## Diagnóstico rápido de agentes

| Síntoma | Causa probable |
|---------|----------------|
| `Failed to launch` repetido en un nodo de cloud | Host Docker caído o imagen inexistente → la cola genera una "tormenta" de reintentos |
| Agente conecta y se cae al instante | `agent.jar` de otra versión de Jenkins (remoting incompatible) |
| `java.io.IOException: Connection refused` | URL del controller mal, firewall, o falta `-webSocket` detrás de proxy |
| Windows: workspace no se puede borrar | Proceso aún vivo (dotnet, node) o archivos read-only → `attrib -r` y matar procesos |
| Agente offline tras reiniciar el controller | Agente inbound sin `Restart=always` / `onfailure restart` |
