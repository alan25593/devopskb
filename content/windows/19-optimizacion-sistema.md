---
title: "Windows: Optimización del Sistema"
category: "windows"
tags: ["optimizacion", "powershell", "rendimiento", "red", "servicios"]
keywords: ["optimizar windows server", "deshabilitar telemetria windows", "alto rendimiento windows", "tcp window scaling", "limpiar temporales powershell", "desactivar sysmain", "disable wsearch"]
description: "Comandos de PowerShell para optimizar Windows (Server y Desktop) en entornos de producción: telemetría, servicios, red y energía."
---

# Optimización del Sistema

Cuando levantamos una VM nueva o configuramos un server on-prem, siempre viene bien pegarle una repasada a la configuración para sacarle el máximo jugo y evitar que procesos innecesarios nos coman los recursos. Acá te dejo los mejores comandos de PowerShell para dejar el SO volando.

## 1. Deshabilitar Telemetría

Windows suele mandar muchos datos de uso a Microsoft. En entornos de producción, esto no solo consume ancho de banda y CPU, sino que a veces va en contra de las políticas de privacidad de la empresa.

```powershell
# Modificar el registro para bloquear la telemetría
Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection" -Name "AllowTelemetry" -Value 0 -Type DWord

# Detener y deshabilitar el servicio de recolección (DiagTrack)
Stop-Service -Name "DiagTrack" -Force -ErrorAction SilentlyContinue
Set-Service -Name "DiagTrack" -StartupType Disabled
```

## 2. Deshabilitar Servicios Innecesarios

Servicios como la búsqueda indexada de Windows, pre-carga en caché (SysMain/SuperFetch) o las apps de Xbox no tienen sentido en un servidor y castigan bastante el disco.

```powershell
$servicios = @("SysMain", "WSearch", "XblAuthManager", "XblGameSave", "XboxNetApiSvc", "XboxGipSvc")

foreach ($srv in $servicios) {
    if (Get-Service $srv -ErrorAction SilentlyContinue) {
        Stop-Service -Name $srv -Force -ErrorAction SilentlyContinue
        Set-Service -Name $srv -StartupType Disabled
    }
}
```

## 3. Plan de Energía (Alto Rendimiento)

Por defecto, Windows viene en modo Equilibrado y a veces baja las frecuencias del CPU para ahorrar energía. Para producción, forzamos el modo "High Performance".

```powershell
# Activa el plan de Alto Rendimiento usando su GUID estándar
powercfg -setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c
```

## 4. Optimizaciones de Red (TCP)

Si tenés mucho tráfico de red, podés tunear cómo Windows maneja los paquetes y forzarlo a repartir el procesamiento de red entre los distintos cores del CPU.

```powershell
# Activar Receive Side Scaling (RSS) en todas las placas de red
Enable-NetAdapterRss -Name "*" -ErrorAction SilentlyContinue

# Forzar TCP AutoTuning para aprovechar todo el ancho de banda
Set-NetTCPSetting -SettingName "InternetCustom" -AutoTuningLevelLocal Normal
Set-NetTCPSetting -SettingName "InternetCustom" -ScalingHeuristics Disabled

# (Opcional) Activar Receive Segment Coalescing (RSC) para bajar la carga de CPU
Enable-NetAdapterRsc -Name "*" -ErrorAction SilentlyContinue
```

## 5. Limpieza de Archivos Temporales

Ideal para correr en un script de mantenimiento. Limpia las basuras clásicas y, lo más importante, limpia los backups de las actualizaciones de Windows (WinSxS) que suelen comer gigas y gigas.

```powershell
# Limpiar temporales básicos
Remove-Item -Path "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$env:WINDIR\Temp\*" -Recurse -Force -ErrorAction SilentlyContinue

# Vaciar la Papelera de reciclaje
Clear-RecycleBin -Force -ErrorAction SilentlyContinue

# Limpieza profunda de WinSxS y Componentes con DISM (Tarda un rato, pero libera mucho espacio)
Dism.exe /Online /Cleanup-Image /StartComponentCleanup /ResetBase
```

## 6. Optimizar el Arranque (Boot)

Un clásico para VMs o fierros pesados es forzar a Windows a usar todos los cores del CPU desde el primer segundo del booteo y revisar qué basurita arranca sola con el SO.

```powershell
# Forzar a usar todos los procesadores lógicos en el arranque (lo que hacíamos a mano en msconfig)
$cores = (Get-CimInstance Win32_ComputerSystem).NumberOfLogicalProcessors
bcdedit /set "{current}" numproc $cores

# Listar qué aplicaciones arrancan con Windows para ver qué matar
Get-CimInstance Win32_StartupCommand | Select-Object Name, command, Location | Format-Table -AutoSize
```

*(Tip: Para volar las apps de inicio innecesarias, en servers conviene borrar directo las entradas de registro en `HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run` o hacerlo por GPO).*
