---
title: "Windows: Servicios y Procesos"
category: "windows"
tags: ["servicios", "procesos", "sc", "tasklist", "powershell"]
keywords: ["gestionar servicios windows", "get-service powershell", "start-service stop-service", "sc config windows", "tasklist taskkill", "get-process powershell", "stop-process", "scheduled tasks powershell", "schtasks", "crear servicio windows", "nssm windows service", "proceso en background windows", "monitorear procesos windows", "services.msc cli"]
description: "Gestión de servicios y procesos Windows desde PowerShell y cmd: iniciar, detener, configurar, monitorear y crear tareas programadas."
---

# Servicios y Procesos

## Gestión de servicios con PowerShell

```powershell
# Listar servicios
Get-Service
Get-Service -Name "wuauserv"         # Windows Update
Get-Service | Where-Object { $_.Status -eq "Running" }
Get-Service | Where-Object { $_.StartType -eq "Automatic" -and $_.Status -eq "Stopped" }

# Iniciar / detener / reiniciar
Start-Service   -Name "Spooler"
Stop-Service    -Name "Spooler"
Restart-Service -Name "Spooler"
Suspend-Service -Name "Spooler"      # pausar (si lo soporta)

# Cambiar tipo de inicio
Set-Service -Name "Spooler" -StartupType Automatic
Set-Service -Name "Spooler" -StartupType Manual
Set-Service -Name "Spooler" -StartupType Disabled

# Esperar a que arranque
Start-Service "Spooler"
(Get-Service "Spooler").WaitForStatus("Running", "00:00:30")
```

## sc.exe — control de servicios desde cmd

```powershell
# Consultar estado
sc query wuauserv
sc query type= all state= all   # todos los servicios

# Iniciar / detener
sc start wuauserv
sc stop  wuauserv

# Configurar tipo de inicio
sc config wuauserv start= auto      # automático
sc config wuauserv start= demand    # manual
sc config wuauserv start= disabled  # deshabilitado
sc config wuauserv start= delayed-auto  # auto retrasado

# Crear servicio
sc create "MiServicio" binPath= "C:\app\servicio.exe" start= auto DisplayName= "Mi Servicio"

# Eliminar servicio
sc delete "MiServicio"

# Ver descripción y detalles
sc qc wuauserv       # configuración
sc qdescription wuauserv
```

## Procesos con PowerShell

```powershell
# Listar procesos
Get-Process
Get-Process -Name "chrome"
Get-Process | Sort-Object CPU -Descending | Select-Object -First 10
Get-Process | Sort-Object WorkingSet -Descending | Select-Object Name, CPU, @{N="RAM_MB";E={[Math]::Round($_.WorkingSet/1MB,1)}} -First 15

# Detener proceso
Stop-Process -Name "notepad"
Stop-Process -Id 1234
Stop-Process -Name "chrome" -Force

# Información detallada
Get-Process chrome | Select-Object *
Get-Process -IncludeUserName | Select-Object Name, UserName, CPU

# Procesos por usuario
Get-WmiObject Win32_Process | Select-Object Name, ProcessId, @{N="Owner";E={$_.GetOwner().User}}
```

## tasklist y taskkill desde cmd

```powershell
# Listar procesos
tasklist
tasklist /v                         # verbose con usuario y título de ventana
tasklist /fi "STATUS eq running"
tasklist /fi "IMAGENAME eq chrome.exe"
tasklist /svc                       # servicios por PID

# Matar proceso
taskkill /PID 1234
taskkill /IM notepad.exe
taskkill /IM chrome.exe /F          # forzar (kill -9)
taskkill /IM chrome.exe /T          # proceso + hijos

# Remoto
tasklist /S servidor /U admin /P contraseña
taskkill /S servidor /IM proceso.exe /F
```

## Información del sistema y recursos

```powershell
# CPU y memoria general
Get-CimInstance Win32_ComputerSystem | Select-Object TotalPhysicalMemory
Get-CimInstance Win32_Processor | Select-Object Name, NumberOfCores, LoadPercentage

# Uso de disco
Get-PSDrive -PSProvider FileSystem
Get-CimInstance Win32_LogicalDisk | Select-Object DeviceID, @{N="GB_Total";E={[Math]::Round($_.Size/1GB,1)}}, @{N="GB_Free";E={[Math]::Round($_.FreeSpace/1GB,1)}}

# Performance counters
Get-Counter "\Processor(_Total)\% Processor Time"
Get-Counter "\Memory\Available MBytes"
Get-Counter "\LogicalDisk(C:)\% Free Space"

# Monitoreo continuo (5 muestras cada 2 segundos)
Get-Counter "\Processor(_Total)\% Processor Time" -SampleInterval 2 -MaxSamples 5
```

## Tareas programadas (Scheduled Tasks)

```powershell
# Listar tareas
Get-ScheduledTask
Get-ScheduledTask | Where-Object { $_.State -eq "Running" }
Get-ScheduledTask -TaskPath "\Microsoft\Windows\WindowsUpdate\*"

# Detalle de una tarea
Get-ScheduledTask -TaskName "MiTarea" | Select-Object *

# Ejecutar manualmente
Start-ScheduledTask -TaskName "MiTarea"

# Habilitar / deshabilitar
Enable-ScheduledTask  -TaskName "MiTarea"
Disable-ScheduledTask -TaskName "MiTarea"

# Crear tarea — ejemplo: script diario a las 6am
$action  = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-File C:\scripts\backup.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At "06:00AM"
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Hours 1)
Register-ScheduledTask -TaskName "Backup Diario" -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest -User "SYSTEM"

# Eliminar tarea
Unregister-ScheduledTask -TaskName "Backup Diario" -Confirm:$false
```

## schtasks desde cmd

```powershell
# Crear tarea
schtasks /create /tn "MiTarea" /tr "C:\scripts\backup.bat" /sc daily /st 06:00 /ru SYSTEM

# Consultar
schtasks /query /tn "MiTarea" /fo LIST /v

# Ejecutar ahora
schtasks /run /tn "MiTarea"

# Eliminar
schtasks /delete /tn "MiTarea" /f
```

## Crear un servicio Windows con NSSM

NSSM (Non-Sucking Service Manager) permite registrar cualquier ejecutable como servicio:

```powershell
# Instalar NSSM
winget install NSSM.NSSM
# o descargar desde https://nssm.cc

# Instalar aplicación como servicio
nssm install "MiApp" "C:\app\mi-app.exe"
nssm install "MiApp" "C:\app\mi-app.exe" "--config app.json"

# Configurar directorio de trabajo
nssm set "MiApp" AppDirectory "C:\app"

# Configurar redirección de logs
nssm set "MiApp" AppStdout "C:\logs\app.log"
nssm set "MiApp" AppStderr "C:\logs\app-error.log"

# Iniciar / detener
nssm start "MiApp"
nssm stop  "MiApp"

# Eliminar servicio
nssm remove "MiApp" confirm
```

## Ver qué usa un puerto

```powershell
# netstat clásico
netstat -ano | findstr :8080
netstat -b                   # proceso por conexión (requiere admin)

# PowerShell moderno
Get-NetTCPConnection -LocalPort 8080
Get-NetTCPConnection | Where-Object { $_.State -eq "Listen" } | Sort-Object LocalPort

# Asociar PID con proceso
$port = 8080
$pid_val = (Get-NetTCPConnection -LocalPort $port).OwningProcess
Get-Process -Id $pid_val
```
