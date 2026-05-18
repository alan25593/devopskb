---
title: "Windows: Updates y Gestión de Paquetes"
category: "windows"
tags: ["windows-update", "winget", "chocolatey", "paquetes", "wsus"]
keywords: ["windows update powershell", "pswindowsupdate modulo", "install-windowsupdate", "winget instalar", "winget upgrade all", "chocolatey instalar paquete", "choco install", "wsus configurar cliente", "wuauclt windows update forzar", "usoclient", "get-hotfix", "windows update historial", "dism windows", "sfc scannow", "windows features instalar powershell"]
description: "Gestión de Windows Update via PowerShell, winget, Chocolatey, características de Windows y diagnóstico con DISM y SFC."
---

# Windows Update y Gestión de Paquetes

## Windows Update con PSWindowsUpdate

```powershell
# Instalar módulo
Install-Module PSWindowsUpdate -Force -Scope CurrentUser

# Ver actualizaciones disponibles
Get-WindowsUpdate

# Instalar todas las actualizaciones
Install-WindowsUpdate -AcceptAll -AutoReboot

# Instalar sin reinicio automático
Install-WindowsUpdate -AcceptAll -IgnoreReboot

# Instalar solo actualizaciones de seguridad
Install-WindowsUpdate -AcceptAll -Category "Security Updates"

# Instalar actualización específica por KB
Install-WindowsUpdate -KBArticleID "KB5030219"

# Historial de actualizaciones instaladas
Get-WUHistory
Get-WUHistory | Select-Object -First 20

# Ocultar actualización problemática
Hide-WindowsUpdate -KBArticleID "KB5030219"

# Equipo remoto
Install-WindowsUpdate -ComputerName "servidor01" -AcceptAll -AutoReboot
```

## Get-HotFix — actualizaciones instaladas

```powershell
# Ver todas las actualizaciones
Get-HotFix
Get-HotFix | Sort-Object InstalledOn -Descending

# Buscar KB específico
Get-HotFix -Id "KB5030219"

# Remoto
Get-HotFix -ComputerName "servidor01"
```

## Windows Update desde cmd (legacy)

```powershell
# Forzar detección de actualizaciones
wuauclt /detectnow
wuauclt /updatenow

# Windows 10/11 moderno
UsoClient StartScan
UsoClient StartDownload
UsoClient StartInstall
UsoClient RestartDevice

# Estado del servicio Windows Update
Get-Service wuauserv
```

## Configurar cliente WSUS

```powershell
# Apuntar al servidor WSUS
$regPath = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate"
New-Item -Path $regPath -Force
Set-ItemProperty -Path $regPath -Name "WUServer"       -Value "http://wsus.empresa.com:8530"
Set-ItemProperty -Path $regPath -Name "WUStatusServer" -Value "http://wsus.empresa.com:8530"

$regPathAU = "$regPath\AU"
New-Item -Path $regPathAU -Force
Set-ItemProperty -Path $regPathAU -Name "UseWUServer"       -Value 1
Set-ItemProperty -Path $regPathAU -Name "NoAutoUpdate"      -Value 0
Set-ItemProperty -Path $regPathAU -Name "AUOptions"         -Value 4    # descarga e instala auto
Set-ItemProperty -Path $regPathAU -Name "ScheduledInstallDay"  -Value 0 # todos los días
Set-ItemProperty -Path $regPathAU -Name "ScheduledInstallTime" -Value 3 # 3am

# Forzar registro en WSUS
wuauclt /resetauthorization /detectnow
```

## winget — gestor de paquetes moderno

```powershell
# Buscar paquete
winget search "Visual Studio Code"
winget search --id "Microsoft.VisualStudioCode"

# Instalar
winget install Microsoft.VisualStudioCode
winget install --id Microsoft.VisualStudioCode --silent
winget install --id Git.Git --silent --accept-package-agreements --accept-source-agreements

# Actualizar
winget upgrade Microsoft.VisualStudioCode
winget upgrade --all                    # actualizar todo
winget upgrade --all --silent

# Ver instalados
winget list
winget list | findstr "Chrome"

# Desinstalar
winget uninstall Microsoft.VisualStudioCode

# Exportar lista de paquetes
winget export -o C:\mis-apps.json

# Importar y restaurar en otro equipo
winget import -i C:\mis-apps.json --ignore-unavailable
```

## Chocolatey

```powershell
# Instalar Chocolatey
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Buscar e instalar
choco search notepadplusplus
choco install notepadplusplus -y
choco install notepadplusplus git vscode 7zip -y

# Actualizar
choco upgrade notepadplusplus -y
choco upgrade all -y

# Ver instalados
choco list --local-only

# Desinstalar
choco uninstall notepadplusplus -y

# Instalar versión específica
choco install nodejs --version 18.17.0 -y
```

## Características de Windows (Features)

```powershell
# Listar características disponibles (Windows 10/11)
Get-WindowsOptionalFeature -Online | Select-Object FeatureName, State

# Habilitar característica
Enable-WindowsOptionalFeature -Online -FeatureName "Microsoft-Windows-Subsystem-Linux" -NoRestart
Enable-WindowsOptionalFeature -Online -FeatureName "VirtualMachinePlatform" -NoRestart
Enable-WindowsOptionalFeature -Online -FeatureName "IIS-WebServerRole" -All

# Deshabilitar característica
Disable-WindowsOptionalFeature -Online -FeatureName "WindowsMediaPlayer"

# Windows Server — roles y features
Get-WindowsFeature
Install-WindowsFeature -Name "Web-Server" -IncludeManagementTools
Install-WindowsFeature -Name "AD-Domain-Services" -IncludeAllSubFeature
Uninstall-WindowsFeature -Name "WindowsMediaPlayer"

# Capability packages (Windows 10/11)
Get-WindowsCapability -Online | Where-Object { $_.State -eq "NotPresent" }
Add-WindowsCapability -Online -Name "OpenSSH.Server~~~~0.0.1.0"
Remove-WindowsCapability -Online -Name "Browser.InternetExplorer~~~~0.0.11.0"
```

## DISM — Deployment Image Servicing

```powershell
# Verificar integridad de imagen
DISM /Online /Cleanup-Image /CheckHealth
DISM /Online /Cleanup-Image /ScanHealth
DISM /Online /Cleanup-Image /RestoreHealth

# Con fuente alternativa (si Windows Update no está disponible)
DISM /Online /Cleanup-Image /RestoreHealth /Source:D:\sources\sxs /LimitAccess

# Limpiar WinSxS (liberar espacio)
DISM /Online /Cleanup-Image /StartComponentCleanup
DISM /Online /Cleanup-Image /StartComponentCleanup /ResetBase

# Ver paquetes instalados
DISM /Online /Get-Packages

# Ver historial DISM
DISM /Online /Get-FeatureInfo /FeatureName:IIS-WebServerRole
```

## SFC — System File Checker

```powershell
# Verificar y reparar archivos del sistema
sfc /scannow

# Solo verificar sin reparar
sfc /verifyonly

# Verificar archivo específico
sfc /verifyfile=C:\Windows\System32\notepad.exe

# Ver log de SFC
Get-Content C:\Windows\Logs\CBS\CBS.log | Select-String "cannot repair"
```
