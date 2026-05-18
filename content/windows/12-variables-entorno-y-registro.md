---
title: "Windows: Variables de Entorno y Registro"
category: "windows"
tags: ["registro", "regedit", "variables-entorno", "powershell", "reg"]
keywords: ["variables entorno windows powershell", "setx variable entorno", "get-itemproperty registro", "set-itemproperty registro", "reg query reg add", "hklm hkcu registro windows", "regedit desde cli", "powershell registry", "variable de entorno sistema usuario", "path windows agregar", "reg export import", "environment variables windows server", "$env powershell", "setenv windows", "reg delete windows"]
description: "Gestión de variables de entorno y registro de Windows desde PowerShell y reg.exe: leer, crear, modificar y eliminar claves y valores."
---

# Variables de Entorno y Registro

## Variables de entorno en PowerShell

```powershell
# Ver todas las variables de entorno
Get-ChildItem Env:
[System.Environment]::GetEnvironmentVariables()

# Acceder a una variable
$env:PATH
$env:COMPUTERNAME
$env:USERNAME
$env:USERPROFILE
$env:TEMP

# Modificar variable en la sesión actual (temporal)
$env:MI_VAR = "valor"
$env:PATH = "$env:PATH;C:\mis-tools"

# Modificar para el usuario (persistente)
[System.Environment]::SetEnvironmentVariable("MI_VAR", "valor", "User")

# Modificar para el sistema (persistente, requiere admin)
[System.Environment]::SetEnvironmentVariable("MI_VAR", "valor", "Machine")

# Eliminar variable
[System.Environment]::SetEnvironmentVariable("MI_VAR", $null, "User")

# Leer valor actual (incluyendo sistema y usuario)
[System.Environment]::GetEnvironmentVariable("MI_VAR", "Machine")
[System.Environment]::GetEnvironmentVariable("MI_VAR", "User")
```

## setx — variables persistentes desde cmd

```powershell
# Crear / modificar variable de usuario
setx MI_VAR "valor"

# Crear variable de sistema (requiere admin)
setx MI_VAR "valor" /M

# Agregar al PATH del sistema
setx PATH "%PATH%;C:\mis-tools" /M

# Verificar
echo %MI_VAR%
```

## Agregar al PATH

```powershell
# Ver PATH actual
$env:PATH -split ";"

# Agregar al PATH de la sesión (temporal)
$env:PATH += ";C:\mis-tools"

# Agregar al PATH del usuario (persistente)
$path = [System.Environment]::GetEnvironmentVariable("PATH", "User")
[System.Environment]::SetEnvironmentVariable("PATH", "$path;C:\mis-tools", "User")

# Agregar al PATH del sistema (persistente, admin)
$path = [System.Environment]::GetEnvironmentVariable("PATH", "Machine")
[System.Environment]::SetEnvironmentVariable("PATH", "$path;C:\mis-tools", "Machine")

# Verificar sin reiniciar
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
```

## Registro de Windows — PowerShell

```powershell
# Navegar el registro como filesystem
Set-Location HKLM:\SOFTWARE
Get-ChildItem HKLM:\SOFTWARE
Get-ChildItem HKCU:\SOFTWARE\Microsoft

# Raíces disponibles como PSDrive
Get-PSDrive | Where-Object { $_.Provider -match "Registry" }
# HKLM = HKEY_LOCAL_MACHINE
# HKCU = HKEY_CURRENT_USER

# Leer valor
Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion" -Name "ProductName"
(Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion").ProductName

# Leer todos los valores de una clave
Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion"

# Verificar si existe una clave
Test-Path "HKLM:\SOFTWARE\MiApp"
```

## Crear y modificar claves y valores

```powershell
# Crear clave
New-Item -Path "HKLM:\SOFTWARE\MiApp" -Force
New-Item -Path "HKLM:\SOFTWARE\MiApp\Config" -Force

# Crear / modificar valor
New-ItemProperty  -Path "HKLM:\SOFTWARE\MiApp" -Name "Version"    -Value "1.0.0" -PropertyType String
New-ItemProperty  -Path "HKLM:\SOFTWARE\MiApp" -Name "MaxConns"   -Value 100     -PropertyType DWord
New-ItemProperty  -Path "HKLM:\SOFTWARE\MiApp" -Name "InstallDir" -Value "C:\app" -PropertyType ExpandString

Set-ItemProperty  -Path "HKLM:\SOFTWARE\MiApp" -Name "Version"    -Value "1.1.0"

# Tipos de datos del registro
# String        → texto
# ExpandString  → texto con variables (%PATH%)
# DWord         → entero 32-bit
# QWord         → entero 64-bit
# Binary        → bytes
# MultiString   → array de strings

# Leer y modificar un valor existente
$val = Get-ItemPropertyValue "HKLM:\SOFTWARE\MiApp" -Name "Version"
Set-ItemProperty "HKLM:\SOFTWARE\MiApp" -Name "Version" -Value "2.0.0"

# Eliminar valor
Remove-ItemProperty -Path "HKLM:\SOFTWARE\MiApp" -Name "Version"

# Eliminar clave completa
Remove-Item -Path "HKLM:\SOFTWARE\MiApp" -Recurse -Force
```

## reg.exe — registro desde cmd

```powershell
# Consultar
reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion"
reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion" /v ProductName
reg query "HKLM\SOFTWARE" /s /f "MiApp"     # buscar recursivo

# Agregar / modificar
reg add "HKLM\SOFTWARE\MiApp" /v Version /t REG_SZ /d "1.0.0" /f
reg add "HKLM\SOFTWARE\MiApp" /v MaxConns /t REG_DWORD /d 100 /f

# Tipos de reg.exe
# REG_SZ         → String
# REG_EXPAND_SZ  → ExpandString
# REG_DWORD      → DWord
# REG_QWORD      → QWord
# REG_BINARY     → Binary
# REG_MULTI_SZ   → MultiString

# Eliminar valor
reg delete "HKLM\SOFTWARE\MiApp" /v Version /f

# Eliminar clave completa
reg delete "HKLM\SOFTWARE\MiApp" /f

# Exportar clave a .reg
reg export "HKLM\SOFTWARE\MiApp" C:\backup\miapp.reg

# Importar .reg
reg import C:\backup\miapp.reg

# Copiar clave
reg copy "HKLM\SOFTWARE\MiApp" "HKCU\SOFTWARE\MiApp" /s /f
```

## Ubicaciones de registro importantes

```powershell
# Información del SO
Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion" |
    Select-Object ProductName, CurrentBuild, DisplayVersion, InstallDate

# Programas instalados
Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*" |
    Select-Object DisplayName, DisplayVersion, Publisher |
    Where-Object { $_.DisplayName } |
    Sort-Object DisplayName

# Programas instalados (32-bit en sistema 64-bit)
Get-ItemProperty "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*" |
    Select-Object DisplayName, DisplayVersion

# Autorun — programas al inicio (usuario)
Get-ItemProperty "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run"

# Autorun — programas al inicio (sistema)
Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run"

# Agregar programa al autorun
Set-ItemProperty "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" -Name "MiApp" -Value "C:\app\mi-app.exe --startup"

# Quitar del autorun
Remove-ItemProperty "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" -Name "MiApp"
```

## Backup y restauración del registro

```powershell
# Crear punto de restauración antes de modificar el registro
Checkpoint-Computer -Description "Antes de cambios en registro" -RestorePointType MODIFY_SETTINGS

# Exportar ramas críticas
reg export HKLM C:\backup\hklm-full.reg
reg export HKCU C:\backup\hkcu-full.reg
reg export "HKLM\SYSTEM\CurrentControlSet\Services" C:\backup\services.reg

# Ver puntos de restauración disponibles
Get-ComputerRestorePoint

# Restaurar punto
Restore-Computer -RestorePoint 1    # usa el ID del punto
```
