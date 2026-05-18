---
title: "Windows: Filesystem y Permisos NTFS"
category: "windows"
tags: ["ntfs", "permisos", "acl", "filesystem", "seguridad"]
keywords: ["permisos ntfs", "icacls comandos", "acl windows", "takeown windows", "herencia permisos ntfs", "get-acl powershell", "set-acl powershell", "junction point windows", "symlink windows", "compartir carpeta windows", "smbshare", "mklink", "attrib windows", "robocopy permisos"]
description: "Permisos NTFS, ACLs, herencia, icacls, Get-Acl/Set-Acl en PowerShell y gestión del filesystem desde la línea de comandos."
---

# Filesystem y Permisos NTFS

## Estructura de directorios Windows

```
C:\
├── Windows\           sistema operativo
│   ├── System32\      binarios del sistema (64-bit)
│   ├── SysWOW64\      binarios 32-bit en sistemas 64-bit
│   └── Temp\          archivos temporales del sistema
├── Program Files\     programas 64-bit
├── Program Files (x86)\ programas 32-bit
├── Users\             perfiles de usuario
│   ├── Public\        carpeta compartida entre usuarios
│   └── <usuario>\
│       ├── Desktop\
│       ├── Documents\
│       ├── AppData\Local\    datos de app por máquina
│       └── AppData\Roaming\  datos de app sincronizables
└── ProgramData\       datos de aplicación (oculto)
```

## Comandos básicos de filesystem

```powershell
# Listar archivos
Get-ChildItem C:\Windows
Get-ChildItem C:\ -Recurse -Filter *.log
ls -la          # alias (Get-ChildItem)
dir /s /b       # cmd clásico recursivo

# Crear / eliminar
New-Item -ItemType Directory -Path C:\mis-datos
New-Item -ItemType File     -Path C:\mis-datos\notas.txt
Remove-Item C:\mis-datos -Recurse -Force

# Copiar y mover
Copy-Item origen.txt destino.txt
Copy-Item C:\carpeta D:\backup -Recurse
Move-Item origen.txt C:\nueva\ubicacion\

# Propiedades de archivo
Get-Item C:\Windows\notepad.exe | Select-Object *
(Get-Item archivo.txt).Length          # tamaño en bytes
(Get-Item archivo.txt).LastWriteTime   # última modificación
```

## Permisos NTFS — Conceptos

Los permisos NTFS se almacenan en la ACL (Access Control List) de cada objeto.

**Permisos básicos:**
| Permiso       | Significado                        |
|---------------|------------------------------------|
| Full Control  | Todo, incluso cambiar permisos     |
| Modify        | Leer, escribir, eliminar           |
| Read & Execute| Leer y ejecutar archivos           |
| List Folder   | Ver contenido de carpeta           |
| Read          | Leer contenido y atributos         |
| Write         | Crear y modificar archivos         |

**Tipos de ACE (Access Control Entry):**
- **Allow** — permite la acción
- **Deny** — deniega (tiene precedencia sobre Allow)

**Herencia:** los permisos fluyen de carpeta padre a hijo por defecto.

## icacls — gestión de ACL desde cmd/PowerShell

```powershell
# Ver permisos actuales
icacls C:\mis-datos
icacls C:\mis-datos /T    # recursivo

# Otorgar permiso
icacls C:\mis-datos /grant "DOMINIO\usuario:(OI)(CI)F"
#   OI = Object Inherit (archivos dentro)
#   CI = Container Inherit (subcarpetas)
#   F  = Full Control

# Otros niveles
icacls archivo.txt /grant "usuario:(R)"   # Read
icacls archivo.txt /grant "usuario:(M)"   # Modify
icacls archivo.txt /grant "usuario:(RX)"  # Read & Execute

# Revocar permiso
icacls C:\mis-datos /remove "DOMINIO\usuario"

# Denegar explícitamente
icacls archivo.txt /deny "usuario:(W)"

# Deshabilitar herencia y copiar permisos actuales
icacls C:\mis-datos /inheritance:d

# Restaurar herencia
icacls C:\mis-datos /inheritance:e

# Copiar ACL de un archivo a otro
icacls origen.txt /save permisos.txt
icacls destino.txt /restore permisos.txt

# Cambiar owner
icacls C:\mis-datos /setowner "DOMINIO\usuario" /T
```

## Get-Acl / Set-Acl en PowerShell

```powershell
# Ver ACL
Get-Acl C:\mis-datos
(Get-Acl C:\mis-datos).Access

# Copiar ACL
$acl = Get-Acl C:\origen
Set-Acl -Path C:\destino -AclObject $acl

# Agregar una regla de acceso
$acl   = Get-Acl C:\mis-datos
$regla = New-Object System.Security.AccessControl.FileSystemAccessRule(
    "DOMINIO\usuario",
    "FullControl",
    "ContainerInherit,ObjectInherit",
    "None",
    "Allow"
)
$acl.SetAccessRule($regla)
Set-Acl C:\mis-datos $acl

# Quitar una regla
$acl.RemoveAccessRule($regla)
Set-Acl C:\mis-datos $acl
```

## Tomar propiedad (takeown)

```powershell
# Desde cmd
takeown /f C:\archivo.txt
takeown /f C:\carpeta /r /d y    # recursivo

# Desde PowerShell
$acl = Get-Acl C:\archivo.txt
$acl.SetOwner([System.Security.Principal.NTAccount]"DOMINIO\usuario")
Set-Acl C:\archivo.txt $acl
```

## Atributos de archivo

```powershell
# Ver atributos
Get-ItemProperty C:\archivo.txt | Select-Object Attributes
attrib C:\archivo.txt              # cmd

# Modificar atributos
attrib +h archivo.txt    # oculto
attrib +r archivo.txt    # solo lectura
attrib +s archivo.txt    # sistema
attrib -h archivo.txt    # quitar oculto

# PowerShell
$archivo = Get-Item C:\archivo.txt
$archivo.Attributes = "ReadOnly,Hidden"
```

## Links simbólicos y Junction Points

```powershell
# Symlink a archivo (requiere elevación o modo developer)
New-Item -ItemType SymbolicLink -Path C:\link.txt -Target C:\original.txt

# Symlink a directorio
New-Item -ItemType SymbolicLink -Path C:\link-dir -Target D:\datos

# Junction point (solo directorios, mismo volumen)
New-Item -ItemType Junction -Path C:\junction -Target C:\carpeta-real

# Desde cmd
mklink enlace.txt C:\original.txt          # symlink archivo
mklink /D C:\enlace-dir D:\directorio      # symlink directorio
mklink /J C:\junction C:\carpeta-real      # junction

# Ver links
Get-ChildItem | Where-Object { $_.LinkType }
```

## Compartir carpetas (SMB)

```powershell
# Listar shares existentes
Get-SmbShare

# Crear share
New-SmbShare -Name "datos" -Path "C:\mis-datos" -FullAccess "DOMINIO\admins" -ReadAccess "DOMINIO\users"

# Ver permisos de share
Get-SmbShareAccess -Name "datos"

# Modificar permisos
Grant-SmbShareAccess -Name "datos" -AccountName "DOMINIO\usuario" -AccessRight Change
Revoke-SmbShareAccess -Name "datos" -AccountName "DOMINIO\usuario"

# Eliminar share
Remove-SmbShare -Name "datos"

# Conectar a share
net use Z: \\servidor\datos
net use Z: \\servidor\datos /user:DOMINIO\usuario contraseña
New-PSDrive -Name Z -PSProvider FileSystem -Root \\servidor\datos
```

## Robocopy — copia con permisos

```powershell
# Copia básica
robocopy C:\origen D:\destino

# Copia recursiva con permisos NTFS
robocopy C:\origen D:\destino /E /COPYALL

# Mirror (igual que origen, borra lo extra en destino)
robocopy C:\origen D:\destino /MIR

# Solo archivos nuevos o modificados
robocopy C:\origen D:\destino /E /XO

# Opciones útiles
robocopy C:\origen D:\destino /E /COPYALL /LOG:copia.log /TEE /R:3 /W:5
# /LOG  → guardar log
# /TEE  → log y pantalla
# /R:3  → 3 reintentos
# /W:5  → 5 segundos entre reintentos
```
