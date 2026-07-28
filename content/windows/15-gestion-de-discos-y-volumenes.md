---
title: "Windows: Gestión de Discos y Volúmenes"
category: "windows"
tags: ["discos", "almacenamiento", "powershell", "storage"]
keywords: ["formatear disco windows", "montar disco powershell", "get-disk", "initialize-disk", "new-partition"]
description: "Cómo inicializar, particionar y formatear discos usando PowerShell."
---

# Gestión de Discos y Volúmenes

Si levantas VMs en AWS (con EBS) o en VMware/Hyper-V, casi siempre toca atachar un disco nuevo. Por UI (Disk Management) es fácil, pero por script es más rápido y predecible.

## Flujo Básico con PowerShell

Cuando agregás un disco nuevo, el sistema lo ve como "Offline" o "Raw". El flujo es: **Inicializar -> Particionar -> Formatear**.

### 1. Identificar el Disco Nuevo

```powershell
# Buscar discos que no estén inicializados (Raw)
Get-Disk | Where-Object PartitionStyle -eq "RAW"
```
*Supongamos que el disco que buscamos es el `Number 1`.*

### 2. Inicializar el Disco

Por defecto se usa GPT (moderno, soporta discos de +2TB).

```powershell
Initialize-Disk -Number 1 -PartitionStyle GPT
```

### 3. Crear Partición, Asignar Letra y Formatear

Podés hacer todo en un solo pipeline (¡magia!):

```powershell
# Usa todo el espacio, asigna letra D, formatea en NTFS y le pone la etiqueta "Datos"
New-Partition -DiskNumber 1 -UseMaximumSize -DriveLetter D | Format-Volume -FileSystem NTFS -NewFileSystemLabel "Datos" -Confirm:$false
```

### 4. Consultas Útiles de Almacenamiento

```powershell
# Ver espacio libre en todos los volúmenes lógicos
Get-Volume

# Ver salud física de los discos
Get-PhysicalDisk
```

> [!TIP]
> Si alguna vez te toca un disco que está "Offline" por políticas de SAN (SAN Policy), podés ponerlo Online con: `Set-Disk -Number 1 -IsOffline $false`.
