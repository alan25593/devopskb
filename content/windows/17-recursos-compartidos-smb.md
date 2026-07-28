---
title: "Windows: Recursos Compartidos (SMB)"
category: "windows"
tags: ["smb", "fileshare", "redes", "powershell", "cmd"]
keywords: ["compartir carpeta windows", "new-smbshare", "net share", "permisos smb"]
description: "Cómo crear y administrar carpetas compartidas en red usando CMD y PowerShell."
---

# Recursos Compartidos (SMB)

Compartir carpetas (File Shares) es una de las configuraciones de red más comunes. Recordá siempre esto: **Los permisos del Share y los permisos NTFS se combinan, y aplica el más restrictivo**.

## PowerShell (Módulo SmbShare)

La forma moderna y recomendada.

### Crear un Share

```powershell
# Compartir C:\Datos como "DatosCompartidos" y darle acceso de lectura a "Todos"
New-SmbShare -Name "DatosCompartidos" -Path "C:\Datos" -ReadAccess "Everyone"

# Compartir dando acceso Full a un grupo específico
New-SmbShare -Name "Deployments" -Path "D:\Deploy" -FullAccess "Dominio\DevOpsTeam"
```

### Modificar Permisos de un Share Existente

```powershell
# Agregar permiso de cambio (Change) a un usuario
Grant-SmbShareAccess -Name "DatosCompartidos" -AccountName "Dominio\jdoe" -AccessRight Change -Force

# Ver quién tiene acceso
Get-SmbShareAccess -Name "DatosCompartidos"
```

### Listar y Eliminar Shares

```powershell
# Ver todos los shares activos
Get-SmbShare

# Eliminar un share (no borra los archivos, solo deja de compartir la carpeta)
Remove-SmbShare -Name "DatosCompartidos" -Force
```

---

## CMD (net share)

Si necesitas hacerlo rápido por consola clásica.

### Crear un Share

```cmd
:: Compartir C:\Datos como "DatosCompartidos"
net share DatosCompartidos=C:\Datos /GRANT:Everyone,READ
```

### Eliminar un Share

```cmd
net share DatosCompartidos /delete
```

> [!NOTE]
> Por convención de seguridad moderna, se recomienda dar Full Control a "Everyone" en el nivel de SMB Share, y luego controlar los accesos de forma granular usando **permisos NTFS** en la pestaña de Seguridad de la carpeta.
