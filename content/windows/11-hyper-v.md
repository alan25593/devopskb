---
title: "Windows: Hyper-V"
category: "windows"
tags: ["hyper-v", "virtualizacion", "vm", "powershell"]
keywords: ["hyper-v powershell", "new-vm hyper-v", "start-vm stop-vm", "get-vm hyper-v", "checkpoint vm hyper-v", "snapshot vm powershell", "hyper-v switch virtual", "new-vmswitch", "hyper-v habilitar", "export-vm import-vm", "hyper-v replication", "vmconnect", "move-vm live migration", "hyper-v resource metering", "iso montar hyper-v"]
description: "Gestión de máquinas virtuales Hyper-V desde PowerShell: crear, configurar, snapshots, networking virtual y operaciones de lifecycle."
---

# Hyper-V

## Habilitar Hyper-V

```powershell
# En Windows 10/11 Pro/Enterprise
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -All -NoRestart

# En Windows Server
Install-WindowsFeature -Name Hyper-V -IncludeManagementTools -Restart

# Verificar
Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V
Get-VMHost                          # info del host Hyper-V
```

## Gestión de VMs

```powershell
# Listar VMs
Get-VM
Get-VM | Select-Object Name, State, CPUUsage, MemoryAssigned, Uptime

# Estado de una VM
Get-VM -Name "Web01"

# Iniciar / detener / reiniciar
Start-VM   -Name "Web01"
Stop-VM    -Name "Web01"
Stop-VM    -Name "Web01" -Force          # equivale a cortar energía
Restart-VM -Name "Web01"
Suspend-VM -Name "Web01"                 # pausar (guardar en RAM)
Resume-VM  -Name "Web01"
Save-VM    -Name "Web01"                 # guardar estado al disco

# Conectar a la consola de la VM
vmconnect localhost "Web01"
```

## Crear VM

```powershell
# Crear VM básica (Generation 2, UEFI)
New-VM -Name "Web01" `
       -Generation 2 `
       -MemoryStartupBytes 2GB `
       -SwitchName "vSwitch-Externo" `
       -NewVHDPath "C:\VMs\Web01\Web01.vhdx" `
       -NewVHDSizeBytes 60GB `
       -Path "C:\VMs\Web01"

# Configurar CPU
Set-VMProcessor -VMName "Web01" -Count 2 -Maximum 100

# Configurar memoria dinámica
Set-VMMemory -VMName "Web01" -DynamicMemoryEnabled $true -MinimumBytes 512MB -MaximumBytes 4GB -StartupBytes 1GB

# Montar ISO de instalación
Add-VMDvdDrive -VMName "Web01" -Path "C:\ISOs\Windows-Server-2022.iso"
Set-VMFirmware -VMName "Web01" -FirstBootDevice (Get-VMDvdDrive -VMName "Web01")

# Iniciar e instalar
Start-VM -Name "Web01"
vmconnect localhost "Web01"
```

## Discos virtuales (VHD/VHDX)

```powershell
# Crear disco
New-VHD -Path "C:\VMs\disco-datos.vhdx" -SizeBytes 100GB -Dynamic
New-VHD -Path "C:\VMs\disco-fijo.vhdx"  -SizeBytes 100GB -Fixed

# Agregar disco a VM
Add-VMHardDiskDrive -VMName "Web01" -Path "C:\VMs\disco-datos.vhdx"

# Ver discos de una VM
Get-VMHardDiskDrive -VMName "Web01"

# Expandir disco
Resize-VHD -Path "C:\VMs\disco-datos.vhdx" -SizeBytes 200GB

# Compactar disco dinámico
Optimize-VHD -Path "C:\VMs\disco-datos.vhdx" -Mode Full

# Convertir formato
Convert-VHD -Path "C:\VMs\disco.vhd" -DestinationPath "C:\VMs\disco.vhdx" -VHDType Dynamic

# Montar VHD en el host
Mount-VHD -Path "C:\VMs\disco-datos.vhdx"
Dismount-VHD -Path "C:\VMs\disco-datos.vhdx"
```

## Switches virtuales (networking)

```powershell
# Ver switches
Get-VMSwitch

# Crear switch externo (comparte NIC física — acceso a red real)
New-VMSwitch -Name "vSwitch-Externo" -NetAdapterName "Ethernet" -AllowManagementOS $true

# Crear switch interno (host + VMs, sin acceso externo)
New-VMSwitch -Name "vSwitch-Interno" -SwitchType Internal

# Crear switch privado (solo entre VMs, sin host)
New-VMSwitch -Name "vSwitch-Privado" -SwitchType Private

# Agregar NIC a VM
Add-VMNetworkAdapter -VMName "Web01" -SwitchName "vSwitch-Externo"

# Ver NICs de una VM
Get-VMNetworkAdapter -VMName "Web01"

# Configurar VLAN
Set-VMNetworkAdapterVlan -VMName "Web01" -VMNetworkAdapterName "Network Adapter" -Access -VlanId 100

# Eliminar switch
Remove-VMSwitch -Name "vSwitch-Privado"
```

## Checkpoints (snapshots)

```powershell
# Crear checkpoint
Checkpoint-VM -Name "Web01" -SnapshotName "Pre-Deploy-v1.2"

# Listar checkpoints
Get-VMCheckpoint -VMName "Web01"

# Restaurar checkpoint
Restore-VMCheckpoint -Name "Pre-Deploy-v1.2" -VMName "Web01" -Confirm:$false
Start-VM -Name "Web01"

# Eliminar checkpoint
Remove-VMCheckpoint -VMName "Web01" -Name "Pre-Deploy-v1.2"

# Eliminar todos los checkpoints
Get-VMCheckpoint -VMName "Web01" | Remove-VMCheckpoint -Confirm:$false

# Configurar tipo de checkpoint
Set-VM -Name "Web01" -CheckpointType Production    # consistente con aplicación
Set-VM -Name "Web01" -CheckpointType Standard      # compatible con versiones previas
Set-VM -Name "Web01" -CheckpointType Disabled       # deshabilitar
```

## Exportar e importar VMs

```powershell
# Exportar VM (debe estar detenida o se usa checkpoint)
Stop-VM -Name "Web01"
Export-VM -Name "Web01" -Path "D:\Backups\VMs"

# Exportar VM en ejecución (crea checkpoint temporal)
Export-VM -Name "Web01" -Path "D:\Backups\VMs" -CaptureLiveState

# Importar VM
Import-VM -Path "D:\Backups\VMs\Web01\Virtual Machines\*.vmcx"

# Importar copiando archivos (nueva VM independiente)
Import-VM -Path "D:\Backups\VMs\Web01\Virtual Machines\*.vmcx" `
          -Copy `
          -VhdDestinationPath "C:\VMs\" `
          -VirtualMachinePath "C:\VMs\"
```

## Replicación Hyper-V

```powershell
# Habilitar en el servidor primario
Set-VMReplicationServer -ReplicationEnabled $true -AllowedAuthenticationType Kerberos

# Configurar replicación de VM
Enable-VMReplication -VMName "Web01" -ReplicaServerName "hyper-v-replica" -ReplicaServerPort 80 -AuthenticationType Kerberos

# Iniciar replicación inicial
Start-VMInitialReplication -VMName "Web01"

# Ver estado de replicación
Get-VMReplication -VMName "Web01"
Measure-VMReplication -VMName "Web01"
```

## Información del host

```powershell
# Configuración del host
Get-VMHost | Select-Object Name, LogicalProcessorCount, MemoryCapacity, VirtualMachinePath, VirtualHardDiskPath

# Uso de recursos por VM
Get-VM | Select-Object Name, State, CPUUsage, @{N="RAM_GB";E={[Math]::Round($_.MemoryAssigned/1GB,1)}}

# Estadísticas de red
Get-VMNetworkAdapter -All | Select-Object VMName, Name, IPAddresses
```
