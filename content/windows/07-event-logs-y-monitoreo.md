---
title: "Windows: Event Logs y Monitoreo"
category: "windows"
tags: ["event-logs", "monitoreo", "wevtutil", "powershell", "performance"]
keywords: ["get-eventlog powershell", "get-winevent", "event log windows filtrar", "wevtutil comandos", "performance monitor powershell", "get-counter cpu memoria", "windows event id", "event viewer cli", "xpath filtro eventos", "event log 4624 login", "event log 4625 login fallido", "clear-eventlog", "nuevo-eventlog powershell", "monitoreo windows", "resource monitor cli"]
description: "Consulta y análisis de Event Logs de Windows con Get-WinEvent, wevtutil, filtros XPath y monitoreo de performance con Get-Counter."
---

# Event Logs y Monitoreo

## Get-WinEvent — consultar eventos

```powershell
# Listar logs disponibles
Get-WinEvent -ListLog * | Select-Object LogName, RecordCount, IsEnabled

# Ver últimos 20 eventos del System log
Get-WinEvent -LogName System -MaxEvents 20

# Filtrar por nivel
Get-WinEvent -LogName System | Where-Object { $_.LevelDisplayName -eq "Error" }
Get-WinEvent -LogName Application | Where-Object { $_.Level -le 2 }  # 1=Critical, 2=Error

# Filtrar por tiempo
Get-WinEvent -LogName Security -MaxEvents 100 | Where-Object { $_.TimeCreated -gt (Get-Date).AddHours(-1) }

# Filtrar por Event ID
Get-WinEvent -LogName Security | Where-Object { $_.Id -eq 4624 }   # Login exitoso
Get-WinEvent -LogName Security | Where-Object { $_.Id -eq 4625 }   # Login fallido
Get-WinEvent -LogName System   | Where-Object { $_.Id -eq 6006 }   # Apagado limpio
Get-WinEvent -LogName System   | Where-Object { $_.Id -eq 41 }     # Apagado inesperado
```

## Filtros con hashtable (más eficiente)

```powershell
# FilterHashtable es más rápido que Where-Object (filtra en el proveedor)
Get-WinEvent -FilterHashtable @{
    LogName   = "Security"
    Id        = 4625
    StartTime = (Get-Date).AddDays(-1)
}

# Múltiples IDs
Get-WinEvent -FilterHashtable @{
    LogName = "System"
    Id      = @(6006, 6008, 41)
}

# Por proveedor
Get-WinEvent -FilterHashtable @{
    ProviderName = "Microsoft-Windows-Security-Auditing"
    Id           = 4724      # intento de reset de contraseña
}
```

## Filtros XPath (máxima performance)

```powershell
# Sintaxis XPath
$xpath = "*[System[EventID=4625 and TimeCreated[timediff(@SystemTime) <= 3600000]]]"
Get-WinEvent -LogName Security -FilterXPath $xpath

# Combinaciones
$xpath = "*[System[(EventID=4624 or EventID=4634) and Level=0]]"
Get-WinEvent -LogName Security -FilterXPath $xpath

# Incluir datos del mensaje
$xpath = "*[System[EventID=4625] and EventData[Data[@Name='TargetUserName']='Administrator']]"
Get-WinEvent -LogName Security -FilterXPath $xpath
```

## Event IDs importantes

| ID    | Log      | Evento                                      |
|-------|----------|---------------------------------------------|
| 4624  | Security | Login exitoso                               |
| 4625  | Security | Login fallido                               |
| 4634  | Security | Logoff                                      |
| 4648  | Security | Login con credenciales explícitas            |
| 4720  | Security | Cuenta de usuario creada                    |
| 4726  | Security | Cuenta de usuario eliminada                 |
| 4740  | Security | Cuenta bloqueada                            |
| 4756  | Security | Miembro agregado a grupo                    |
| 7045  | System   | Nuevo servicio instalado                    |
| 7036  | System   | Servicio cambia de estado                   |
| 41    | System   | Apagado inesperado (kernel power)           |
| 6006  | System   | Apagado limpio (event log)                  |
| 1074  | System   | Apagado/reinicio iniciado por usuario       |
| 1000  | Application | Crash de aplicación                      |
| 1001  | Application | Windows Error Reporting                  |

## wevtutil — gestión de logs desde cmd

```powershell
# Listar logs
wevtutil el

# Info de un log
wevtutil gl System
wevtutil gl Security

# Consultar eventos (últimos 10 errores del System)
wevtutil qe System /c:10 /f:text /q:"*[System[Level<=2]]"

# Exportar log
wevtutil epl System C:\logs\system.evtx

# Limpiar log
wevtutil cl System
wevtutil cl Application

# Habilitar / deshabilitar log
wevtutil sl "Microsoft-Windows-TaskScheduler/Operational" /e:true
wevtutil sl "Microsoft-Windows-TaskScheduler/Operational" /e:false
```

## Get-EventLog (legacy, Windows PowerShell)

```powershell
# Logs disponibles
Get-EventLog -List

# Últimos eventos
Get-EventLog -LogName System -Newest 50
Get-EventLog -LogName Application -EntryType Error -Newest 20

# Por fuente y tiempo
Get-EventLog -LogName System -Source "Service Control Manager" -After (Get-Date).AddHours(-6)

# Limpiar log
Clear-EventLog -LogName Application
```

## Performance Counters

```powershell
# CPU total
Get-Counter "\Processor(_Total)\% Processor Time"

# Múltiples counters de una vez
Get-Counter @(
    "\Processor(_Total)\% Processor Time",
    "\Memory\Available MBytes",
    "\LogicalDisk(C:)\% Free Space",
    "\Network Interface(*)\Bytes Total/sec"
)

# Muestras continuas (10 muestras cada 2 segundos)
Get-Counter "\Processor(_Total)\% Processor Time" -SampleInterval 2 -MaxSamples 10

# Todos los counters de una categoría
Get-Counter -ListSet "Processor" | Select-Object -ExpandProperty Counter

# Guardar en archivo
Get-Counter "\Processor(_Total)\% Processor Time" -SampleInterval 5 -MaxSamples 12 |
    Export-Counter -Path C:\perf.blg -FileFormat BLG
```

## Monitoreo de recursos con WMI/CIM

```powershell
# CPU
Get-CimInstance Win32_Processor | Select-Object Name, LoadPercentage, NumberOfCores

# Memoria
$os = Get-CimInstance Win32_OperatingSystem
[PSCustomObject]@{
    Total_GB     = [Math]::Round($os.TotalVisibleMemorySize / 1MB, 2)
    Free_GB      = [Math]::Round($os.FreePhysicalMemory     / 1MB, 2)
    UsedPct      = [Math]::Round(($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / $os.TotalVisibleMemorySize * 100, 1)
}

# Disco
Get-CimInstance Win32_LogicalDisk | Select-Object DeviceID,
    @{N="Total_GB";  E={[Math]::Round($_.Size/1GB,1)}},
    @{N="Free_GB";   E={[Math]::Round($_.FreeSpace/1GB,1)}},
    @{N="Free_Pct";  E={[Math]::Round($_.FreeSpace/$_.Size*100,1)}}

# Uptime
(Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime

# Top procesos por CPU y RAM
Get-Process | Sort-Object CPU -Descending | Select-Object Name, CPU,
    @{N="RAM_MB";E={[Math]::Round($_.WorkingSet/1MB,1)}} -First 10
```

## Crear eventos personalizados

```powershell
# Crear fuente de log
New-EventLog -LogName Application -Source "MiAplicacion"

# Escribir evento
Write-EventLog -LogName Application -Source "MiAplicacion" -EventId 1000 -EntryType Information -Message "Proceso completado exitosamente"
Write-EventLog -LogName Application -Source "MiAplicacion" -EventId 9001 -EntryType Error      -Message "Error crítico: no se pudo conectar a la DB"

# Eliminar fuente
Remove-EventLog -Source "MiAplicacion"
```

## Script de monitoreo básico

```powershell
function Get-SystemHealth {
    $cpu  = (Get-Counter "\Processor(_Total)\% Processor Time").CounterSamples.CookedValue
    $os   = Get-CimInstance Win32_OperatingSystem
    $mem  = [Math]::Round(($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / $os.TotalVisibleMemorySize * 100, 1)
    $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
    $diskFree = [Math]::Round($disk.FreeSpace / $disk.Size * 100, 1)

    [PSCustomObject]@{
        Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        CPU_Pct   = [Math]::Round($cpu, 1)
        RAM_Pct   = $mem
        Disk_Free = "$diskFree%"
        Uptime    = ((Get-Date) - $os.LastBootUpTime).ToString("d\d\ hh\:mm")
    }
}

# Monitoreo en loop
while ($true) {
    Get-SystemHealth
    Start-Sleep -Seconds 30
}
```
