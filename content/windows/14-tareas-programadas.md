---
title: "Windows: Tareas Programadas"
category: "windows"
tags: ["automatizacion", "schtasks", "powershell", "cron"]
keywords: ["tareas programadas windows", "schtasks", "new-scheduledtask", "automatizacion windows"]
description: "Cómo crear, administrar y monitorear tareas programadas en Windows con CMD y PowerShell."
---

# Tareas Programadas (Scheduled Tasks)

La automatización no es nada sin un buen cron. En Windows, eso se maneja con el Task Scheduler. 

## PowerShell (Recomendado)

PowerShell es ideal porque te permite definir cada parte de la tarea como un objeto (el trigger, la acción, el usuario) y luego registrarla.

### Crear una tarea nueva

Supongamos que queremos correr un script todos los días a las 3 AM.

```powershell
# 1. Definir la Acción
$Action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-NoProfile -WindowStyle Hidden -File C:\Scripts\Backup.ps1"

# 2. Definir el Trigger
$Trigger = New-ScheduledTaskTrigger -Daily -At 3:00AM

# 3. Registrar la Tarea
Register-ScheduledTask -TaskName "BackupDiario" -Action $Action -Trigger $Trigger -Description "Ejecuta el backup diario a las 3 AM" -User "SYSTEM"
```

### Consultar tareas

```powershell
# Ver estado de una tarea
Get-ScheduledTask -TaskName "BackupDiario"

# Ver todas las tareas que están corriendo
Get-ScheduledTask | Where-Object State -eq "Running"
```

### Arrancar o frenar una tarea manualmente

```powershell
Start-ScheduledTask -TaskName "BackupDiario"
Stop-ScheduledTask -TaskName "BackupDiario"
```

---

## CMD (schtasks)

Si estás en un entorno restringido o armando un script viejo en .bat, `schtasks` es tu amigo.

### Crear una tarea

```cmd
schtasks /create /tn "BackupDiario" /tr "powershell.exe -file C:\Scripts\Backup.ps1" /sc daily /st 03:00 /ru SYSTEM
```

### Ejecutar, Consultar y Eliminar

```cmd
:: Ejecutar ahora
schtasks /run /tn "BackupDiario"

:: Ver estado
schtasks /query /tn "BackupDiario"

:: Eliminar
schtasks /delete /tn "BackupDiario" /f
```
