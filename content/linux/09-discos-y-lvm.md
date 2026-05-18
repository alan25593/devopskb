---
title: "Linux: Discos, Particiones, LVM y Compresión"
category: "linux"
tags: ["discos", "lvm", "particiones", "mount", "tar", "storage"]
keywords: ["ver discos linux", "lsblk", "montar disco", "mount umount", "fstab", "extender volumen lvm", "lvm crear volumen", "lvextend", "resize2fs", "ampliar disco vm", "tar comprimir", "tar extraer", "gzip bzip2", "crear particion", "fdisk", "ver espacio disco", "montar en arranque", "uuid disco", "xfs_growfs"]
description: "Gestión de almacenamiento en Linux: exploración de discos con lsblk, montaje con fstab, LVM para redimensionar volúmenes en caliente, y archivado con tar y gzip."
---

# Discos, particiones, LVM y compresión

## Contenido

- [Explorar discos y particiones con lsblk](#explorar-discos-y-particiones-con-lsblk)
- [Montar y desmontar sistemas de archivos](#montar-y-desmontar-sistemas-de-archivos)
- [Montaje persistente con /etc/fstab](#montaje-persistente-con-etcfstab)
- [LVM: gestión de volúmenes lógicos](#lvm-gestión-de-volúmenes-lógicos)
- [Archivado y compresión con tar y gzip](#archivado-y-compresión-con-tar-y-gzip)

---

## Explorar discos y particiones con lsblk

```bash
# Ver todos los discos y particiones en árbol
lsblk

# Con información de filesystem y punto de montaje
lsblk -f

# Con tamaños en formato legible
lsblk -o NAME,SIZE,TYPE,MOUNTPOINT,FSTYPE

# Ver información detallada de un disco específico
lsblk /dev/sdb

# Ver discos físicos y sus atributos (requiere root)
fdisk -l

# Identificar el tipo de filesystem de un dispositivo
blkid /dev/sdb1
blkid    # todos los dispositivos
```

Tipos de dispositivos más comunes:

| Nombre | Tipo |
|---|---|
| `/dev/sda`, `/dev/sdb` | Discos SCSI/SATA o discos virtuales (AWS, VMware) |
| `/dev/nvme0n1` | Disco NVMe (instancias AWS con EBS NVMe) |
| `/dev/xvda` | Disco Xen virtual (instancias EC2 antiguas) |
| `/dev/vda` | Disco KVM/QEMU virtual |

---

## Montar y desmontar sistemas de archivos

```bash
# Crear un filesystem en un disco nuevo (formatea — destruye datos)
mkfs.ext4 /dev/sdb1
mkfs.xfs /dev/sdb1

# Crear el punto de montaje
mkdir -p /mnt/datos

# Montar el disco
mount /dev/sdb1 /mnt/datos

# Montar con opciones específicas
mount -o ro /dev/sdb1 /mnt/datos           # solo lectura
mount -o remount,rw /mnt/datos             # remontar en lectura-escritura

# Verificar que montó correctamente
df -h /mnt/datos
mount | grep /mnt/datos

# Desmontar
umount /mnt/datos

# Si dice "device is busy", ver qué proceso usa el punto de montaje
lsof +D /mnt/datos
fuser -m /mnt/datos
```

---

## Montaje persistente con /etc/fstab

`/etc/fstab` define qué discos se montan automáticamente al arrancar.

> **Antes de editar fstab:** un error de sintaxis puede dejar el sistema sin arrancar. Siempre verificá con `mount -a` antes de reiniciar.

```bash
# Obtener el UUID del dispositivo (más estable que el nombre /dev/sdX)
blkid /dev/sdb1
# Output: /dev/sdb1: UUID="a1b2c3d4-..." TYPE="ext4"
```

```
# /etc/fstab
# <dispositivo>  <punto-montaje>  <tipo-fs>  <opciones>  <dump>  <pass>

# Disco de datos por UUID (recomendado sobre /dev/sdX)
UUID=a1b2c3d4-e5f6-7890-abcd-ef1234567890  /mnt/datos  ext4  defaults  0  2

# Disco de logs con opciones específicas
UUID=b2c3d4e5-...  /var/log  ext4  defaults,noatime  0  2

# Montaje de NFS
192.168.1.100:/exports/shared  /mnt/nfs  nfs  defaults,_netdev  0  0
```

Opciones más usadas:

| Opción | Efecto |
|---|---|
| `defaults` | rw, suid, dev, exec, auto, nouser, async |
| `noatime` | No actualiza el tiempo de acceso — mejora performance |
| `ro` | Solo lectura |
| `nofail` | No falla el boot si el disco no está presente |
| `_netdev` | Espera que la red esté disponible antes de montar |

```bash
# Probar fstab sin reiniciar (monta todo lo que no está montado)
mount -a

# Si hay error, muestra el mensaje sin romper el sistema
```

---

## LVM: gestión de volúmenes lógicos

LVM permite redimensionar volúmenes en caliente, crear snapshots y agregar discos sin reiniciar. Es el estándar en VMs cloud cuando necesitás expandir el disco.

### Conceptos LVM

```
Discos físicos (PV) → Grupo de volúmenes (VG) → Volúmenes lógicos (LV)
  /dev/sdb              vg_datos                  /dev/vg_datos/lv_app
```

### Escenario clásico: el disco de la VM se amplió en AWS/GCP y hay que expandir el filesystem

```bash
# 1. Verificar que el SO ve el nuevo tamaño del disco
lsblk
# Si el disco físico ya muestra el nuevo tamaño pero la partición no, redimensioná primero

# 2. Ver los volúmenes lógicos actuales
lvdisplay
lsblk

# 3. Extender el volumen lógico (usando todo el espacio libre del VG)
lvextend -l +100%FREE /dev/ubuntu-vg/ubuntu-lv

# O extender una cantidad específica (+20G)
lvextend -L +20G /dev/ubuntu-vg/ubuntu-lv

# 4a. Expandir el filesystem ext4 al nuevo tamaño del LV
resize2fs /dev/ubuntu-vg/ubuntu-lv

# 4b. Para XFS (no puede reducirse, solo expandirse)
xfs_growfs /

# 5. Verificar el nuevo tamaño
df -h
```

### Crear un nuevo volumen desde cero

```bash
# 1. Inicializar el disco físico como PV (Physical Volume)
pvcreate /dev/sdb

# 2. Crear un Volume Group
vgcreate vg_datos /dev/sdb

# 3. Crear un Logical Volume usando todo el VG
lvcreate -l 100%FREE -n lv_app vg_datos

# 4. Formatear y montar
mkfs.ext4 /dev/vg_datos/lv_app
mkdir -p /opt/app
mount /dev/vg_datos/lv_app /opt/app

# Agregar un segundo disco al VG existente (expandir el pool)
pvcreate /dev/sdc
vgextend vg_datos /dev/sdc

# Inspección
pvs    # Physical Volumes
vgs    # Volume Groups
lvs    # Logical Volumes
```

### Snapshots LVM

```bash
# Crear snapshot de un LV (útil antes de upgrades o migraciones riesgosas)
lvcreate -L 5G -s -n lv_app_snap /dev/vg_datos/lv_app

# Revertir al snapshot (restaurar)
lvconvert --merge /dev/vg_datos/lv_app_snap

# Borrar snapshot sin revertir
lvremove /dev/vg_datos/lv_app_snap
```

---

## Archivado y compresión con tar y gzip

### tar — crear y extraer archivos

```bash
# Crear un archivo tar comprimido con gzip (.tar.gz)
tar -czf backup.tar.gz /opt/app/

# Crear con bzip2 (más compresión, más lento)
tar -cjf backup.tar.bz2 /opt/app/

# Crear con xz (máxima compresión)
tar -cJf backup.tar.xz /opt/app/

# Extraer un archivo tar.gz en el directorio actual
tar -xzf backup.tar.gz

# Extraer en un directorio específico
tar -xzf backup.tar.gz -C /tmp/restore/

# Ver el contenido sin extraer
tar -tzf backup.tar.gz

# Extraer un solo archivo del tar
tar -xzf backup.tar.gz opt/app/config.yml

# Crear tar excluyendo directorios
tar -czf backup.tar.gz /opt/app/ --exclude=/opt/app/logs --exclude=/opt/app/tmp
```

Flags de `tar`:

| Flag | Significado |
|---|---|
| `-c` | Crear |
| `-x` | Extraer |
| `-t` | Listar contenido |
| `-z` | Comprimir/descomprimir con gzip |
| `-j` | Comprimir/descomprimir con bzip2 |
| `-J` | Comprimir/descomprimir con xz |
| `-f` | Nombre del archivo (siempre al final) |
| `-v` | Verbose (mostrar archivos procesados) |

### gzip, bzip2 y xz — comprimir archivos individuales

```bash
# Comprimir un archivo (reemplaza el original por .gz)
gzip archivo.log

# Comprimir sin borrar el original
gzip -k archivo.log

# Descomprimir
gzip -d archivo.log.gz
gunzip archivo.log.gz

# Ver el ratio de compresión
gzip -l archivo.log.gz

# bzip2 — mayor compresión que gzip
bzip2 archivo.log
bunzip2 archivo.log.bz2

# xz — máxima compresión (más lento)
xz archivo.log
unxz archivo.log.xz
```

### zip y unzip — para compatibilidad con Windows

```bash
# Crear zip
zip -r backup.zip /opt/app/

# Descomprimir
unzip backup.zip -d /tmp/restore/

# Ver contenido sin extraer
unzip -l backup.zip
```
