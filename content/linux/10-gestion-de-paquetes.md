---
title: "Linux: Gestión de Paquetes con apt, yum y dnf"
category: "linux"
tags: ["paquetes", "apt", "yum", "dnf", "rpm", "repositorios"]
keywords: ["instalar paquete linux", "apt install", "yum install", "dnf install", "actualizar paquetes", "apt update upgrade", "buscar paquete", "apt search", "agregar repositorio", "add-apt-repository", "yum repo", "rpm -q", "listar paquetes instalados", "desinstalar paquete", "apt remove purge", "snap install", "gpg key repositorio", "ubuntu debian paquetes", "centos rhel paquetes", "amazon linux paquetes"]
description: "Gestión de paquetes en las distribuciones más usadas en DevOps: apt para Debian/Ubuntu, yum/dnf para RHEL/CentOS/Amazon Linux, y manejo de repositorios externos."
---

# Gestión de paquetes

## Contenido

- [apt: Debian, Ubuntu y derivados](#apt-debian-ubuntu-y-derivados)
- [yum y dnf: RHEL, CentOS, Amazon Linux](#yum-y-dnf-rhel-centos-amazon-linux)
- [rpm: inspección de paquetes sin gestor](#rpm-inspección-de-paquetes-sin-gestor)
- [Agregar repositorios externos](#agregar-repositorios-externos)
- [snap y otros gestores modernos](#snap-y-otros-gestores-modernos)

---

## apt: Debian, Ubuntu y derivados

`apt` es el gestor de paquetes de alto nivel para Debian y Ubuntu. Reemplaza a `apt-get` y `apt-cache` en la mayoría de los casos de uso cotidiano.

```bash
# Actualizar el índice de paquetes (siempre antes de instalar)
apt update

# Actualizar todos los paquetes instalados
apt upgrade

# Actualizar paquetes + manejar dependencias que cambian (más agresivo)
apt full-upgrade

# Instalar un paquete
apt install nginx

# Instalar múltiples paquetes
apt install nginx curl git jq

# Instalar sin confirmación interactiva (para scripts)
apt install -y nginx

# Instalar una versión específica
apt install nginx=1.24.0-1

# Desinstalar (conserva archivos de configuración)
apt remove nginx

# Desinstalar + borrar archivos de configuración
apt purge nginx

# Desinstalar paquetes huérfanos (dependencias que ya no se usan)
apt autoremove

# Buscar un paquete por nombre o descripción
apt search "web server"

# Ver información detallada de un paquete
apt show nginx

# Ver qué archivos instalaría un paquete sin instalarlo
apt-file list nginx   # requiere: apt install apt-file && apt-file update

# Ver el historial de operaciones apt
cat /var/log/apt/history.log
```

### Listar paquetes instalados

```bash
# Todos los paquetes instalados
dpkg -l

# Filtrar por nombre
dpkg -l | grep nginx

# Ver los archivos que instaló un paquete
dpkg -L nginx

# Ver a qué paquete pertenece un archivo
dpkg -S /usr/sbin/nginx

# Ver versión instalada de un paquete
dpkg -l nginx
apt list --installed | grep nginx
```

### Bloquear la versión de un paquete (hold)

```bash
# Evitar que un paquete se actualice (ej: fijar versión de kernel)
apt-mark hold nginx

# Ver paquetes en hold
apt-mark showhold

# Liberar el hold
apt-mark unhold nginx
```

---

## yum y dnf: RHEL, CentOS, Amazon Linux

`yum` es el gestor clásico de RHEL/CentOS 7 y Amazon Linux 2. `dnf` es su sucesor en RHEL/CentOS 8+ y Amazon Linux 2023 — la sintaxis es prácticamente idéntica.

```bash
# Actualizar el índice de metadatos y todos los paquetes
yum update
dnf update

# Instalar un paquete
yum install nginx
dnf install nginx

# Instalar sin confirmación
yum install -y nginx
dnf install -y nginx

# Desinstalar
yum remove nginx
dnf remove nginx

# Buscar un paquete
yum search nginx
dnf search nginx

# Ver información de un paquete
yum info nginx
dnf info nginx

# Ver qué paquete provee un archivo o comando
yum provides /usr/sbin/nginx
dnf provides curl

# Limpiar caché de metadatos
yum clean all
dnf clean all
```

### Listar paquetes instalados

```bash
# Todos los paquetes instalados
yum list installed
dnf list installed

# Filtrar
yum list installed | grep nginx
dnf list installed nginx

# Ver los archivos que instaló un paquete
rpm -ql nginx

# Ver a qué paquete pertenece un archivo
rpm -qf /usr/sbin/nginx
```

### Grupos de paquetes

```bash
# Ver grupos disponibles (conjuntos de paquetes relacionados)
yum grouplist
dnf grouplist

# Instalar un grupo completo (ej: herramientas de desarrollo)
yum groupinstall "Development Tools"
dnf groupinstall "Development Tools"
```

---

## rpm: inspección de paquetes sin gestor

`rpm` opera directamente sobre los paquetes `.rpm` sin resolver dependencias.

```bash
# Instalar un .rpm descargado manualmente
rpm -ivh paquete.rpm

# Actualizar
rpm -Uvh paquete.rpm

# Desinstalar
rpm -e nombre-paquete

# Verificar si un paquete está instalado
rpm -q nginx

# Ver versión instalada
rpm -q --queryformat "%{NAME} %{VERSION}-%{RELEASE}\n" nginx

# Listar todos los archivos de un paquete instalado
rpm -ql nginx

# Ver a qué paquete pertenece un archivo
rpm -qf /etc/nginx/nginx.conf

# Ver la info completa de un paquete instalado
rpm -qi nginx

# Verificar la integridad de un paquete instalado
rpm -V nginx
```

---

## Agregar repositorios externos

### En Debian/Ubuntu (apt)

```bash
# Método moderno: agregar clave GPG + archivo .sources

# Ejemplo: agregar repositorio de Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | gpg --dearmor -o /usr/share/keyrings/docker.gpg

echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  > /etc/apt/sources.list.d/docker.list

apt update
apt install docker-ce

# Método legacy (Ubuntu < 22.04): add-apt-repository
add-apt-repository ppa:ondrej/php
apt update
apt install php8.2

# Ver repositorios configurados
cat /etc/apt/sources.list
ls /etc/apt/sources.list.d/
```

### En RHEL/CentOS/Amazon Linux (yum/dnf)

```bash
# Agregar repositorio via archivo .repo
cat > /etc/yum.repos.d/nginx.repo << 'EOF'
[nginx-stable]
name=nginx stable repo
baseurl=http://nginx.org/packages/centos/$releasever/$basearch/
gpgcheck=1
enabled=1
gpgkey=https://nginx.org/keys/nginx_signing.key
EOF

yum install nginx

# Agregar repositorio EPEL (Extra Packages for Enterprise Linux)
yum install epel-release         # CentOS/RHEL
amazon-linux-extras install epel # Amazon Linux 2

# Habilitar/deshabilitar un repositorio temporalmente
yum install --enablerepo=epel htop
yum install --disablerepo=epel nginx

# Ver repositorios configurados
yum repolist
dnf repolist
```

---

## snap y otros gestores modernos

### snap — paquetes universales con dependencias incluidas

```bash
# Instalar un snap
snap install code --classic

# Listar snaps instalados
snap list

# Actualizar todos los snaps
snap refresh

# Ver información de un snap
snap info code

# Desinstalar
snap remove code
```

### Instalar binarios directamente (sin gestor)

Patrón común para herramientas DevOps que no están en los repos oficiales:

```bash
# Ejemplo: instalar kubectl
curl -LO "https://dl.k8s.io/release/$(curl -Ls https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
mv kubectl /usr/local/bin/

# Verificar que quedó en el PATH
which kubectl
kubectl version --client
```
