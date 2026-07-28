---
title: "Windows: WMI y CIM (Consultas al Sistema)"
category: "windows"
tags: ["wmi", "cim", "monitoreo", "powershell", "telemetria"]
keywords: ["get-wmi", "get-ciminstance", "wmic", "consultar hardware windows"]
description: "Consultas de sistema a bajo nivel mediante WMI y CIM en PowerShell para extraer telemetría e información de hardware."
---

# WMI y CIM (Consultas al Sistema)

Windows Management Instrumentation (WMI) y Common Information Model (CIM) son las APIs nativas de Windows para sacar telemetría del SO y del hardware. 

> [!TIP]
> A partir de PowerShell v3, **CIM (`Get-CimInstance`) es el estándar recomendado** sobre los viejos cmdlets WMI (`Get-WmiObject`), ya que CIM usa WinRM por debajo y es mucho más rápido y amigable con el firewall.

## Ejemplos Prácticos con CIM

### 1. Información del Sistema Operativo

```powershell
# Obtener versión exacta de Windows, build y último booteo
Get-CimInstance -ClassName Win32_OperatingSystem | Select-Object Caption, Version, OSArchitecture, LastBootUpTime
```

### 2. Información del Hardware (CPU y RAM)

```powershell
# Detalles del Procesador
Get-CimInstance -ClassName Win32_Processor | Select-Object Name, NumberOfCores, NumberOfLogicalProcessors

# Memoria RAM Total (convertido a GB)
$Ram = Get-CimInstance -ClassName Win32_ComputerSystem
[math]::Round($Ram.TotalPhysicalMemory / 1GB, 2)
```

### 3. Consultar Discos Lógicos (Espacio Libre)

```powershell
Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DriveType=3" | 
    Select-Object DeviceID, 
                  @{Name="Size(GB)";Expression={[math]::truncate($_.size / 1GB)}}, 
                  @{Name="FreeSpace(GB)";Expression={[math]::truncate($_.freespace / 1GB)}}
```

### 4. Consultas Remotas (CIM Sessions)

Si tenés WinRM habilitado en tu flota de servidores, CIM brilla para consultar múltiples máquinas a la vez de forma asíncrona.

```powershell
$Computers = "web01", "web02", "db01"

# Obtener info de disco C de todos los servidores al mismo tiempo
Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DeviceID='C:'" -ComputerName $Computers
```

## CMD Histórico (wmic)

Aunque `wmic` está **deprecado** en versiones recientes de Windows 10/11, si estás en un Windows Server viejo y no tenés PowerShell a mano:

```cmd
:: Ver número de serie (ej. Service Tag de Dell/HP)
wmic bios get serialnumber

:: Ver RAM total
wmic computersystem get TotalPhysicalMemory
```
