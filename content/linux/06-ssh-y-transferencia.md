---
title: "Linux: SSH, Claves, Transferencia de Archivos y Tunnels"
category: "linux"
tags: ["ssh", "scp", "rsync", "tunnels", "claves"]
keywords: ["configurar ssh", "generar clave ssh", "ssh-keygen", "copiar clave ssh", "ssh sin password", "config ssh", "multiple hosts ssh", "scp copiar archivo", "rsync sincronizar", "tunnel ssh", "port forwarding", "ssh -L", "ssh -R", "ssh -D socks", "ssh agent", "authorized_keys", "bastion host", "jump host", "proxy jump"]
description: "Configuración completa de SSH: generación de claves, archivo config para múltiples hosts, transferencia segura con scp y rsync, y tunnels para port forwarding."
---

# SSH, transferencia de archivos y tunnels

## Contenido

- [Conexión básica y opciones](#conexión-básica-y-opciones)
- [Gestión de claves SSH](#gestión-de-claves-ssh)
- [Archivo ~/.ssh/config para múltiples hosts](#archivo-sshconfig-para-múltiples-hosts)
- [Transferencia de archivos con scp y rsync](#transferencia-de-archivos-con-scp-y-rsync)
- [Tunnels y port forwarding](#tunnels-y-port-forwarding)
- [ssh-agent y forwarding de agente](#ssh-agent-y-forwarding-de-agente)

---

## Conexión básica y opciones

```bash
# Conexión básica
ssh usuario@192.168.1.50

# Especificar puerto no estándar
ssh -p 2222 usuario@servidor.com

# Usar una clave específica
ssh -i ~/.ssh/mi-clave.pem usuario@servidor.com

# Ejecutar un comando remoto sin abrir shell interactiva
ssh usuario@servidor.com 'df -h && free -h'

# Ejecutar múltiples comandos
ssh usuario@servidor.com << 'EOF'
cd /opt/app
git pull
systemctl restart app
EOF

# Conectar con verbose (útil para debuggear problemas de autenticación)
ssh -v usuario@servidor.com
ssh -vvv usuario@servidor.com   # máximo detalle

# Ignorar la verificación del host (solo para labs, nunca en producción)
ssh -o StrictHostKeyChecking=no usuario@servidor.com
```

---

## Gestión de claves SSH

```bash
# Generar par de claves (ed25519 es el algoritmo recomendado actualmente)
ssh-keygen -t ed25519 -C "deploy@empresa.com"

# Generar con nombre de archivo específico (para múltiples claves)
ssh-keygen -t ed25519 -f ~/.ssh/clave-produccion -C "produccion"

# RSA de 4096 bits (para compatibilidad con sistemas viejos)
ssh-keygen -t rsa -b 4096 -C "deploy@empresa.com"

# Copiar la clave pública al servidor (agrega a ~/.ssh/authorized_keys)
ssh-copy-id usuario@servidor.com

# Con clave específica y puerto no estándar
ssh-copy-id -i ~/.ssh/clave-produccion.pub -p 2222 deploy@servidor.com

# Manualmente: agregar la clave pública al servidor
cat ~/.ssh/id_ed25519.pub | ssh usuario@servidor.com 'cat >> ~/.ssh/authorized_keys'

# Ver el fingerprint de una clave (para comparar con el servidor)
ssh-keygen -lf ~/.ssh/id_ed25519.pub

# Ver todas las claves cargadas en el agente
ssh-add -l
```

### Permisos requeridos en el servidor

SSH es estricto con los permisos — si están mal, la autenticación por clave falla silenciosamente.

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
chmod 600 ~/.ssh/id_ed25519
chmod 644 ~/.ssh/id_ed25519.pub
```

---

## Archivo ~/.ssh/config para múltiples hosts

En lugar de recordar IPs, puertos y claves, centralizá todo en `~/.ssh/config`.

```
# ~/.ssh/config

# Host de producción
Host prod
    HostName 203.0.113.10
    User deploy
    IdentityFile ~/.ssh/clave-produccion
    Port 22

# Host de staging
Host staging
    HostName 192.168.1.50
    User deploy
    IdentityFile ~/.ssh/clave-staging

# Bastion / Jump host de AWS
Host bastion
    HostName ec2-54-123-45-67.compute-1.amazonaws.com
    User ec2-user
    IdentityFile ~/.ssh/aws-key.pem

# Servidor interno al que se accede a través del bastion
Host db-prod
    HostName 10.0.1.100
    User admin
    ProxyJump bastion
    IdentityFile ~/.ssh/aws-key.pem

# Configuración global para todos los hosts
Host *
    ServerAliveInterval 60
    ServerAliveCountMax 3
    AddKeysToAgent yes
```

```bash
# Con este config, conectarse es tan simple como:
ssh prod
ssh staging
ssh db-prod    # salta automáticamente por el bastion
```

---

## Transferencia de archivos con scp y rsync

### scp — copia segura simple

```bash
# Copiar archivo local al servidor remoto
scp archivo.tar.gz deploy@prod:/opt/backups/

# Copiar con puerto no estándar
scp -P 2222 archivo.txt deploy@servidor.com:/tmp/

# Copiar directorio completo (recursivo)
scp -r ./dist deploy@prod:/opt/app/

# Copiar archivo del servidor al local
scp deploy@prod:/var/log/app/app.log ./logs/

# Usar perfil del ~/.ssh/config
scp archivo.txt prod:/opt/app/
```

### rsync — sincronización eficiente

`rsync` solo transfiere los bloques que cambiaron — mucho más eficiente que `scp` para directorios grandes.

```bash
# Sincronizar directorio local al servidor (preservando permisos y timestamps)
rsync -avz ./dist/ deploy@prod:/opt/app/dist/

# Flags más usados:
# -a  archive mode: recursivo + preserva permisos, timestamps, symlinks, etc.
# -v  verbose
# -z  comprimir durante la transferencia
# -P  muestra progreso + permite reanudar transferencias interrumpidas
# --delete  borra en destino los archivos que ya no existen en origen

# Sincronizar y eliminar archivos que ya no están en origen (mirror exacto)
rsync -avz --delete ./dist/ deploy@prod:/opt/app/dist/

# Dry-run: ver qué haría rsync sin ejecutar nada
rsync -avzn ./dist/ deploy@prod:/opt/app/dist/

# Excluir archivos o directorios
rsync -avz --exclude='.git' --exclude='node_modules' ./ deploy@prod:/opt/app/

# Sincronizar con puerto SSH no estándar
rsync -avz -e "ssh -p 2222" ./dist/ deploy@servidor.com:/opt/app/

# Usar perfil del ~/.ssh/config
rsync -avz ./dist/ prod:/opt/app/dist/
```

---

## Tunnels y port forwarding

### Local port forwarding (-L)

Reenvía un puerto local hacia un host remoto, a través del servidor SSH. Útil para acceder a servicios internos.

```bash
# -L <puerto-local>:<host-destino>:<puerto-destino>
# Acceder a la base de datos interna como si fuera local
ssh -L 5432:db-interno.vpc:5432 bastion

# Ahora en otra terminal podés conectarte a localhost:5432 y llega al db interno
psql -h localhost -p 5432 -U admin mi_base

# En background (no abre shell)
ssh -L 5432:db-interno.vpc:5432 -N -f bastion
```

### Remote port forwarding (-R)

Expone un puerto local en el servidor remoto. Útil para dar acceso a tu máquina desde afuera sin abrir firewall.

```bash
# -R <puerto-remoto>:<host-local>:<puerto-local>
# Expone tu app local (puerto 3000) en el servidor remoto en el puerto 8080
ssh -R 8080:localhost:3000 deploy@servidor.com

# Cualquiera que acceda a servidor.com:8080 llega a tu app local
```

### Dynamic port forwarding / SOCKS proxy (-D)

Crea un proxy SOCKS5 local que enruta todo el tráfico a través del servidor SSH.

```bash
# Crear proxy SOCKS5 en el puerto local 1080
ssh -D 1080 -N -f bastion

# Luego configurar el browser o curl para usar localhost:1080 como proxy SOCKS5
curl --proxy socks5://localhost:1080 http://servicio-interno.vpc
```

---

## ssh-agent y forwarding de agente

El ssh-agent almacena tus claves desencriptadas en memoria para no pedir passphrase en cada conexión.

```bash
# Iniciar el agente (generalmente ya corre con la sesión de desktop)
eval "$(ssh-agent -s)"

# Agregar una clave al agente
ssh-add ~/.ssh/id_ed25519

# Agregar con tiempo de expiración (ej: 4 horas)
ssh-add -t 14400 ~/.ssh/id_ed25519

# Ver claves cargadas
ssh-add -l

# Eliminar todas las claves del agente
ssh-add -D
```

### Agent forwarding

Permite que el servidor remoto use tus claves locales para saltar a otros servidores, sin copiar las claves privadas al servidor intermedio.

```bash
# Conectar con forwarding del agente
ssh -A deploy@bastion

# Configurado en ~/.ssh/config (más cómodo)
Host bastion
    ForwardAgent yes
```

> **Regla de oro:** Habilitá `ForwardAgent` solo en hosts de confianza. Un admin del servidor remoto puede usar tus claves mientras tenés la sesión abierta.
