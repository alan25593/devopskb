---
title: "Linux: Filesystem, Permisos, Usuarios y Grupos"
category: "linux"
tags: ["filesystem", "permisos", "usuarios", "grupos", "chmod"]
keywords: ["estructura directorios linux", "que hay en etc", "que hay en var", "chmod", "chown", "cambiar permisos", "crear usuario", "agregar usuario a grupo", "permisos octal", "link simbolico", "find archivos", "SUID", "sticky bit", "rwx", "ls -la", "passwd", "useradd", "usermod"]
description: "Estructura del filesystem Linux, sistema de permisos rwx y octal, gestión de usuarios y grupos, y búsqueda de archivos con find."
---

# Filesystem, permisos, usuarios y grupos

## Contenido

- [Estructura del filesystem](#estructura-del-filesystem)
- [Navegación y búsqueda de archivos](#navegación-y-búsqueda-de-archivos)
- [Permisos: lectura, escritura y ejecución](#permisos-lectura-escritura-y-ejecución)
- [Cambiar permisos y propietarios](#cambiar-permisos-y-propietarios)
- [Permisos especiales: SUID, SGID y sticky bit](#permisos-especiales-suid-sgid-y-sticky-bit)
- [Usuarios y grupos](#usuarios-y-grupos)
- [Links simbólicos y duros](#links-simbólicos-y-duros)

---

## Estructura del filesystem

Linux sigue el estándar FHS (Filesystem Hierarchy Standard). Todo cuelga de `/`.

| Directorio | Qué contiene |
|---|---|
| `/etc` | Archivos de configuración del sistema y servicios |
| `/var` | Datos variables: logs (`/var/log`), colas, bases de datos de paquetes |
| `/opt` | Software de terceros instalado manualmente |
| `/usr` | Binarios y librerías de usuario (`/usr/bin`, `/usr/lib`) |
| `/home` | Directorios home de cada usuario |
| `/root` | Home del usuario root |
| `/tmp` | Archivos temporales — se borra al reiniciar |
| `/proc` | Filesystem virtual — estado del kernel y procesos en tiempo real |
| `/sys` | Filesystem virtual — información del hardware |
| `/dev` | Dispositivos del sistema (discos, terminales, etc.) |

```bash
# Ver el árbol de directorios de primer nivel
ls /

# Ver cuánto ocupa cada subdirectorio de /var
du -h --max-depth=1 /var | sort -hr
```

---

## Navegación y búsqueda de archivos

```bash
# Mostrar contenido con detalles: permisos, dueño, tamaño, fecha
ls -lah

# Mostrar también archivos ocultos (empiezan con .)
ls -la

# Buscar un archivo por nombre en todo el sistema
find / -name "nginx.conf" 2>/dev/null

# Buscar solo en /etc, ignorando mayúsculas
find /etc -iname "*.conf"

# Buscar archivos modificados en las últimas 24 horas
find /var/log -mtime -1 -type f

# Buscar archivos más pesados que 100MB
find / -size +100M -type f 2>/dev/null

# Buscar un binario en el PATH
which nginx
type nginx
```

---

## Permisos: lectura, escritura y ejecución

Cada archivo tiene permisos para tres entidades: **dueño (u)**, **grupo (g)** y **otros (o)**.

```
-rwxr-xr--  1  deploy  devops  1234  may 10 14:32  deploy.sh
 |||||||||||
 ||||||||||└── otros: solo lectura (r--)
 |||||||└───── grupo: lectura y ejecución (r-x)
 ||||└──────── dueño: lectura, escritura y ejecución (rwx)
 └──────────── tipo: - archivo, d directorio, l link
```

Equivalencia octal:

| Simbólico | Octal | Significado |
|---|---|---|
| `rwx` | 7 | Lectura + escritura + ejecución |
| `rw-` | 6 | Lectura + escritura |
| `r-x` | 5 | Lectura + ejecución |
| `r--` | 4 | Solo lectura |
| `---` | 0 | Sin permisos |

Combinaciones más usadas: `755` (binarios), `644` (archivos de config), `600` (claves SSH), `777` (¡evitar en producción!).

---

## Cambiar permisos y propietarios

```bash
# Asignar permisos con notación octal
chmod 755 deploy.sh

# Asignar permisos con notación simbólica
chmod u+x deploy.sh         # agregar ejecución al dueño
chmod go-w archivo.conf     # quitar escritura a grupo y otros
chmod a+r archivo.txt       # dar lectura a todos

# Aplicar recursivo a un directorio
chmod -R 755 /opt/mi-app

# Cambiar dueño
chown deploy:devops deploy.sh

# Cambiar solo el grupo
chgrp docker /var/run/docker.sock

# Cambiar dueño recursivo
chown -R deploy:devops /opt/mi-app
```

---

## Permisos especiales: SUID, SGID y sticky bit

```bash
# SUID (Set User ID) — el archivo se ejecuta con los permisos del dueño, no del que lo corre
# Se ve como 's' en el bit de ejecución del dueño
chmod u+s /usr/bin/mi-binario
# Ejemplo clásico: /usr/bin/passwd (necesita escribir /etc/shadow como root)

# SGID en directorio — archivos creados heredan el grupo del directorio
chmod g+s /shared/equipo

# Sticky bit en directorio — solo el dueño del archivo puede borrarlo (ej: /tmp)
chmod +t /tmp/carpeta-compartida

# Ver permisos especiales activos en el sistema (posibles vectores de escalada)
find / -perm -4000 -type f 2>/dev/null   # SUID
find / -perm -2000 -type f 2>/dev/null   # SGID
```

---

## Usuarios y grupos

```bash
# Ver quién soy y qué grupos tengo
whoami
id
groups

# Crear un usuario del sistema (sin home, para servicios)
useradd --system --no-create-home --shell /bin/false nginx

# Crear un usuario normal con home
useradd -m -s /bin/bash -G sudo,docker deploy

# Cambiar la contraseña de un usuario
passwd deploy

# Agregar un usuario existente a un grupo (efecto tras re-login)
usermod -aG docker deploy
usermod -aG sudo deploy

# Bloquear / desbloquear una cuenta
usermod -L deploy      # lock
usermod -U deploy      # unlock

# Borrar usuario y su directorio home
userdel -r deploy

# Gestión de grupos
groupadd devops
groupdel devops

# Ver todos los usuarios del sistema
cat /etc/passwd | awk -F: '$3 >= 1000 { print $1, $6 }'

# Ver a qué grupos pertenece un usuario
groups deploy
id deploy
```

Archivos clave de autenticación:

| Archivo | Contenido |
|---|---|
| `/etc/passwd` | Usuarios: nombre, UID, GID, home, shell |
| `/etc/shadow` | Hashes de contraseñas (solo root) |
| `/etc/group` | Grupos y sus miembros |
| `/etc/sudoers` | Reglas de sudo — editar siempre con `visudo` |

---

## Links simbólicos y duros

```bash
# Link simbólico (symlink) — apunta a la ruta del target, puede romperse si se mueve el target
ln -s /opt/mi-app/actual /opt/mi-app/current

# Link duro — segunda referencia al mismo inode, no se rompe si se mueve el original
ln /var/log/app.log /var/log/app-backup.log

# Ver a dónde apunta un symlink
readlink -f /opt/mi-app/current

# Ver todos los symlinks en un directorio
find /etc -type l -ls
```

Los symlinks son el patrón clásico para manejar versiones: `/opt/app/current` apunta a `/opt/app/v2.3.1` y para hacer rollback alcanza con cambiar el symlink.
