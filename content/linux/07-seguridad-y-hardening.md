---
title: "Linux: Seguridad, Hardening y Auditoría"
category: "linux"
tags: ["seguridad", "hardening", "sudo", "firewall", "ssh", "auditoria"]
keywords: ["configurar sudo", "sudoers", "NOPASSWD sudo", "firewall linux", "ufw reglas", "iptables básico", "fail2ban configurar", "bloquear ip", "hardening ssh", "deshabilitar root ssh", "ver quien se conecto", "historial accesos", "last comando", "auditoria linux", "ver intentos login fallidos", "fail2ban instalacion", "ufw allow", "ufw status"]
description: "Hardening de servidores Linux: configuración segura de sudo, firewall con UFW e iptables, protección contra brute force con fail2ban, y auditoría de accesos."
---

# Seguridad y hardening de servidores Linux

## Contenido

- [sudo: configuración y buenas prácticas](#sudo-configuración-y-buenas-prácticas)
- [Firewall con UFW](#firewall-con-ufw)
- [Firewall con iptables](#firewall-con-iptables)
- [Protección contra brute force con fail2ban](#protección-contra-brute-force-con-fail2ban)
- [Hardening de SSH](#hardening-de-ssh)
- [Auditoría de accesos y actividad](#auditoría-de-accesos-y-actividad)

---

## sudo: configuración y buenas prácticas

`sudo` permite ejecutar comandos como otro usuario (generalmente root) sin conocer su contraseña.

```bash
# Ejecutar un comando como root
sudo systemctl restart nginx

# Abrir una shell de root
sudo -i
sudo -s

# Ejecutar como un usuario específico (no root)
sudo -u deploy /opt/scripts/deploy.sh

# Ver qué puede hacer el usuario actual con sudo
sudo -l

# Editar /etc/sudoers de forma segura (valida la sintaxis antes de guardar)
visudo

# Editar el sudoers de un usuario específico en /etc/sudoers.d/
visudo -f /etc/sudoers.d/deploy
```

### Configuración de /etc/sudoers

```
# Sintaxis: usuario  host=(usuario_destino)  comandos

# Dar acceso total a un usuario (equivalente a root)
deploy  ALL=(ALL:ALL)  ALL

# Permitir comandos específicos sin contraseña
deploy  ALL=(ALL)  NOPASSWD: /usr/bin/systemctl restart nginx, /usr/bin/systemctl reload nginx

# Dar permisos a todos los miembros de un grupo
%devops  ALL=(ALL)  NOPASSWD: ALL

# Requerir siempre contraseña (aunque el grupo tenga NOPASSWD)
deploy  ALL=(ALL)  PASSWD: /usr/bin/apt
```

```bash
# Mejor práctica: crear un archivo por usuario/rol en /etc/sudoers.d/
# Así no editás el archivo principal y evitás dejarlo roto

cat > /etc/sudoers.d/deploy << 'EOF'
deploy ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart mi-app, /usr/bin/systemctl stop mi-app
EOF

chmod 440 /etc/sudoers.d/deploy
```

---

## Firewall con UFW

UFW (Uncomplicated Firewall) es la interfaz simplificada sobre iptables, recomendada para la mayoría de los casos.

```bash
# Ver estado y reglas actuales
ufw status verbose

# Habilitar/deshabilitar UFW
ufw enable
ufw disable

# Política por defecto: denegar todo entrante, permitir todo saliente
ufw default deny incoming
ufw default allow outgoing

# Permitir puertos comunes
ufw allow ssh          # puerto 22
ufw allow 80/tcp       # HTTP
ufw allow 443/tcp      # HTTPS
ufw allow 8080/tcp

# Permitir desde una IP específica
ufw allow from 10.0.0.5

# Permitir desde una IP a un puerto específico
ufw allow from 10.0.0.5 to any port 5432

# Permitir desde una subred completa
ufw allow from 10.0.0.0/24 to any port 22

# Denegar un puerto
ufw deny 23/tcp

# Eliminar una regla
ufw delete allow 8080/tcp

# Ver reglas numeradas (para borrar por número)
ufw status numbered
ufw delete 3

# Limitar intentos de conexión (rate limiting — útil para SSH)
ufw limit ssh
```

---

## Firewall con iptables

iptables es el sistema de bajo nivel. UFW lo abstrae, pero para reglas complejas o scripting se usa directamente.

```bash
# Ver las reglas actuales
iptables -L -v -n
iptables -L -v -n --line-numbers   # con números de línea

# Política por defecto: ACCEPT todo (estado inicial en la mayoría de distros)
iptables -P INPUT ACCEPT
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Permitir conexiones establecidas y relacionadas (para no cortar sesiones activas)
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Permitir loopback
iptables -A INPUT -i lo -j ACCEPT

# Permitir SSH
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Permitir HTTP y HTTPS
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Bloquear una IP específica
iptables -A INPUT -s 1.2.3.4 -j DROP

# Limitar intentos de conexión al puerto 22 (10 intentos por minuto)
iptables -A INPUT -p tcp --dport 22 -m limit --limit 10/min --limit-burst 20 -j ACCEPT
iptables -A INPUT -p tcp --dport 22 -j DROP

# Guardar las reglas para que persistan al reiniciar
iptables-save > /etc/iptables/rules.v4
# Restaurar
iptables-restore < /etc/iptables/rules.v4
```

---

## Protección contra brute force con fail2ban

fail2ban monitorea logs del sistema y bloquea IPs que tienen demasiados intentos fallidos.

```bash
# Instalación
apt-get install fail2ban    # Debian/Ubuntu
yum install fail2ban        # RHEL/CentOS

# Estado general
fail2ban-client status

# Ver estado de una jail específica (ej: ssh)
fail2ban-client status sshd

# Desbloquear una IP manualmente
fail2ban-client set sshd unbanip 1.2.3.4

# Ver las IPs baneadas actualmente
fail2ban-client status sshd | grep "Banned IP"
```

### Configuración personalizada

Nunca editar `/etc/fail2ban/jail.conf` directamente — crear un override en `jail.local`.

```ini
# /etc/fail2ban/jail.local

[DEFAULT]
bantime  = 3600       # Duración del ban en segundos (1 hora)
findtime = 600        # Ventana de tiempo para contar intentos (10 minutos)
maxretry = 5          # Intentos fallidos antes del ban
banaction = ufw       # Usar UFW para banear (alternativa: iptables-multiport)

[sshd]
enabled  = true
port     = 22
logpath  = %(sshd_log)s
maxretry = 3          # Solo 3 intentos para SSH

[nginx-http-auth]
enabled  = true
port     = http,https
logpath  = /var/log/nginx/error.log

[nginx-limit-req]
enabled  = true
port     = http,https
logpath  = /var/log/nginx/error.log
maxretry = 10
```

```bash
# Aplicar cambios en la configuración
systemctl restart fail2ban

# Verificar que las jails están activas
fail2ban-client status
```

---

## Hardening de SSH

Editar `/etc/ssh/sshd_config` y reiniciar el servicio después de cada cambio.

```bash
# Siempre tener una sesión abierta mientras hacés cambios en sshd_config
# Si cometés un error, podés revertirlo desde la sesión activa
```

```ini
# /etc/ssh/sshd_config — configuración de hardening recomendada

# Deshabilitar login de root por SSH
PermitRootLogin no

# Solo permitir autenticación por clave, deshabilitar contraseñas
PasswordAuthentication no
PubkeyAuthentication yes

# Deshabilitar autenticación por contraseña vacía
PermitEmptyPasswords no

# Cambiar el puerto por defecto (dificulta los escaneos automáticos)
Port 2222

# Limitar a qué usuarios pueden conectarse por SSH
AllowUsers deploy admin
# O por grupo
AllowGroups ssh-users

# Deshabilitar forwarding de X11 (no se usa en servidores)
X11Forwarding no

# Tiempo máximo para autenticarse (en segundos)
LoginGraceTime 30

# Máximo de intentos de autenticación por conexión
MaxAuthTries 3

# Mantener la sesión activa con keep-alive
ClientAliveInterval 300
ClientAliveCountMax 2
```

```bash
# Verificar la sintaxis antes de reiniciar (evita quedar sin acceso)
sshd -t

# Aplicar cambios
systemctl reload sshd
```

---

## Auditoría de accesos y actividad

```bash
# Ver los últimos logins del sistema (usuarios + IP + duración)
last

# Ver los últimos logins de un usuario específico
last deploy

# Ver el último login de cada usuario registrado en el sistema
lastlog

# Ver quién está conectado ahora mismo y qué hace
who
w      # versión con más detalle (carga, tiempo de inactividad)

# Historial de comandos del usuario actual
history

# Historial con timestamps (si está configurado HISTTIMEFORMAT)
HISTTIMEFORMAT="%F %T " history

# Ver intentos de login fallidos
lastb

# Ver intentos de autenticación fallidos en los logs de SSH
journalctl -u sshd | grep "Failed password"
grep "Failed password" /var/log/auth.log

# Ver las IPs que más veces fallaron (candidatas a bloquear)
grep "Failed password" /var/log/auth.log | awk '{print $11}' | sort | uniq -c | sort -nr | head -10

# Ver todos los comandos ejecutados con sudo
grep "sudo" /var/log/auth.log
journalctl | grep "sudo"
```
