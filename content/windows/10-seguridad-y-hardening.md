---
title: "Windows: Seguridad y Hardening"
category: "windows"
tags: ["seguridad", "hardening", "bitlocker", "audit", "firewall"]
keywords: ["hardening windows", "bitlocker powershell", "enable-bitlocker", "manage-bde", "windows defender powershell", "set-mppreference", "audit policy windows", "auditpol", "secedit windows", "local security policy cli", "windows defender atp", "applocker powershell", "uac windows", "credential guard", "windows baseline seguridad", "get-localuser powershell"]
description: "Hardening de Windows: BitLocker, Windows Defender, políticas de auditoría, cuentas locales, UAC y configuraciones de seguridad desde PowerShell."
---

# Seguridad y Hardening

## Cuentas locales

```powershell
# Listar usuarios locales
Get-LocalUser
Get-LocalUser | Select-Object Name, Enabled, LastLogon, PasswordRequired

# Crear usuario local
New-LocalUser -Name "svc_app" -Password (ConvertTo-SecureString "P@ssw0rd!" -AsPlainText -Force) -FullName "Service Account App" -PasswordNeverExpires -UserMayNotChangePassword

# Modificar usuario
Set-LocalUser -Name "svc_app" -PasswordNeverExpires $true
Enable-LocalUser  -Name "svc_app"
Disable-LocalUser -Name "svc_app"
Remove-LocalUser  -Name "svc_app"

# Deshabilitar cuenta Administrator y Guest por defecto
Disable-LocalUser -Name "Administrator"
Disable-LocalUser -Name "Guest"

# Renombrar cuenta Administrator (hardening)
Rename-LocalUser -Name "Administrator" -NewName "sysop_local"

# Grupos locales
Get-LocalGroup
Get-LocalGroupMember -Group "Administrators"
Add-LocalGroupMember    -Group "Remote Desktop Users" -Member "DOMINIO\usuario"
Remove-LocalGroupMember -Group "Administrators"      -Member "usuario_riesgoso"
```

## Windows Defender

```powershell
# Estado general
Get-MpComputerStatus
Get-MpComputerStatus | Select-Object AMServiceEnabled, AntispywareEnabled, AntivirusEnabled, RealTimeProtectionEnabled

# Actualizar definiciones
Update-MpSignature

# Escaneo rápido
Start-MpScan -ScanType QuickScan

# Escaneo completo
Start-MpScan -ScanType FullScan

# Escaneo de ruta específica
Start-MpScan -ScanType CustomScan -ScanPath "C:\descargas"

# Excluir ruta del escaneo (con cuidado)
Add-MpPreference -ExclusionPath "C:\app\build"
Get-MpPreference | Select-Object ExclusionPath

# Configurar preferencias
Set-MpPreference -DisableRealtimeMonitoring $false    # asegurar RT activo
Set-MpPreference -CloudBlockLevel High
Set-MpPreference -MAPSReporting Advanced
Set-MpPreference -SubmitSamplesConsent SendAllSamples

# Ver amenazas detectadas
Get-MpThreat
Get-MpThreatDetection
```

## BitLocker

```powershell
# Estado de BitLocker
Get-BitLockerVolume
Get-BitLockerVolume C: | Select-Object MountPoint, EncryptionMethod, ProtectionStatus, VolumeStatus

# Habilitar BitLocker con TPM
Enable-BitLocker -MountPoint "C:" -EncryptionMethod XtsAes256 -TpmProtector

# Habilitar con TPM + PIN
$pin = Read-Host -AsSecureString "PIN"
Enable-BitLocker -MountPoint "C:" -EncryptionMethod XtsAes256 -TpmAndPinProtector -Pin $pin

# Agregar protector de clave de recuperación
Add-BitLockerKeyProtector -MountPoint "C:" -RecoveryPasswordProtector

# Guardar clave de recuperación en AD
Backup-BitLockerKeyProtector -MountPoint "C:" -KeyProtectorId (Get-BitLockerVolume C:).KeyProtector[1].KeyProtectorId

# Guardar clave en archivo
(Get-BitLockerVolume C:).KeyProtector | Where-Object { $_.KeyProtectorType -eq "RecoveryPassword" } |
    ForEach-Object { $_.RecoveryPassword } | Out-File C:\secure\bitlocker-key.txt

# Deshabilitar BitLocker
Disable-BitLocker -MountPoint "C:"

# manage-bde (cmd)
manage-bde -status C:
manage-bde -on C: -EncryptionMethod XtsAes256
manage-bde -protectors -get C:
manage-bde -off C:
```

## Políticas de auditoría

```powershell
# Ver configuración actual
auditpol /get /category:*

# Habilitar auditorías recomendadas
auditpol /set /subcategory:"Logon" /success:enable /failure:enable
auditpol /set /subcategory:"Account Logon" /success:enable /failure:enable
auditpol /set /subcategory:"Account Management" /success:enable /failure:enable
auditpol /set /subcategory:"Object Access" /failure:enable
auditpol /set /subcategory:"Policy Change" /success:enable
auditpol /set /subcategory:"Privilege Use" /failure:enable
auditpol /set /subcategory:"Process Creation" /success:enable
auditpol /set /subcategory:"System Events" /success:enable /failure:enable

# Exportar / importar configuración
auditpol /backup /file:C:\audit-policy.csv
auditpol /restore /file:C:\audit-policy.csv

# Ver política local con secedit
secedit /export /cfg C:\secconfig.cfg
secedit /analyze /db C:\secedit.sdb /cfg C:\secconfig.cfg
secedit /configure /db C:\secedit.sdb /cfg C:\baseline.cfg
```

## UAC (User Account Control)

```powershell
# Ver nivel de UAC
Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" | Select-Object ConsentPromptBehaviorAdmin, EnableLUA

# Valores de ConsentPromptBehaviorAdmin
# 0 = Sin prompt (inseguro)
# 1 = Credenciales en secure desktop
# 2 = Aprobación en secure desktop (recomendado)
# 5 = Prompt en desktop normal (default)

# Configurar UAC al máximo (recomendado)
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "ConsentPromptBehaviorAdmin" -Value 2
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "EnableLUA"                  -Value 1
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "PromptOnSecureDesktop"      -Value 1
```

## AppLocker — control de aplicaciones

```powershell
# Requiere Windows Enterprise/Education/Server
# Habilitar servicio
Set-Service -Name AppIDSvc -StartupType Automatic
Start-Service AppIDSvc

# Crear política desde reglas por defecto
Get-AppLockerPolicy -Effective | Format-List

# Crear regla para ejecutables
New-AppLockerPolicy -RuleType Publisher -FilePath "C:\app\mi-app.exe" -User Everyone

# Ver reglas aplicadas
Get-AppLockerPolicy -Effective -Xml

# Auditoría (sin bloquear)
Set-AppLockerPolicy -PolicyObject (Get-AppLockerPolicy -Effective) -Merge
```

## Registro y configuraciones de seguridad

```powershell
# Deshabilitar SMBv1 (vector de EternalBlue/WannaCry)
Set-SmbServerConfiguration -EnableSMB1Protocol $false -Force
Get-SmbServerConfiguration | Select-Object EnableSMB1Protocol

# Requerir firma SMB
Set-SmbServerConfiguration -RequireSecuritySignature $true -Force
Set-SmbClientConfiguration -RequireSecuritySignature $true -Force

# Deshabilitar LLMNR (previene ataques de envenenamiento)
New-Item -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\DNSClient" -Force
Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\DNSClient" -Name "EnableMulticast" -Value 0

# Deshabilitar NetBIOS sobre TCP/IP
$adapters = Get-CimInstance Win32_NetworkAdapterConfiguration | Where-Object { $_.IPEnabled }
foreach ($adapter in $adapters) {
    $adapter.SetTcpipNetbios(2)   # 2 = deshabilitar NetBIOS
}

# Deshabilitar RDP si no se usa
Set-ItemProperty -Path "HKLM:\System\CurrentControlSet\Control\Terminal Server" -Name "fDenyTSConnections" -Value 1
Disable-NetFirewallRule -DisplayGroup "Remote Desktop"

# Configurar tamaño máximo de logs de eventos
wevtutil sl Security /ms:1073741824   # 1 GB para Security log
wevtutil sl System   /ms:524288000    # 500 MB para System log
```

## Baseline de seguridad (verificación rápida)

```powershell
function Test-SecurityBaseline {
    $checks = @()

    # SMBv1
    $smb1 = (Get-SmbServerConfiguration).EnableSMB1Protocol
    $checks += [PSCustomObject]@{ Check = "SMBv1 deshabilitado"; Pass = (-not $smb1) }

    # Windows Defender
    $wd = (Get-MpComputerStatus).RealTimeProtectionEnabled
    $checks += [PSCustomObject]@{ Check = "Windows Defender activo"; Pass = $wd }

    # Firewall
    $fw = (Get-NetFirewallProfile -Name Public).Enabled
    $checks += [PSCustomObject]@{ Check = "Firewall público activo"; Pass = $fw }

    # Guest deshabilitado
    $guest = (Get-LocalUser -Name "Guest").Enabled
    $checks += [PSCustomObject]@{ Check = "Guest deshabilitado"; Pass = (-not $guest) }

    # UAC activo
    $uac = (Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System").EnableLUA
    $checks += [PSCustomObject]@{ Check = "UAC habilitado"; Pass = ($uac -eq 1) }

    $checks | Select-Object Check, @{N="Estado";E={ if ($_.Pass) {"✓ OK"} else {"✗ FALLA"} }}
}

Test-SecurityBaseline
```
