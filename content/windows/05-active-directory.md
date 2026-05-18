---
title: "Windows: Active Directory"
category: "windows"
tags: ["active-directory", "ad", "ldap", "gpo", "dominio"]
keywords: ["active directory powershell", "get-aduser", "new-aduser", "add-adgroupmember", "gpo group policy", "new-gpo", "get-gpo", "ou organizational unit", "dominio windows", "ldap query powershell", "get-adcomputer", "active directory buscar usuario", "reset password ad", "disable-adaccount", "dsa.msc cli", "dcdiag", "repadmin"]
description: "Gestión de usuarios, grupos, OUs y GPOs en Active Directory desde PowerShell con el módulo ActiveDirectory."
---

# Active Directory

## Instalar módulo y conectar

```powershell
# Instalar módulo RSAT (en Windows 10/11)
Add-WindowsCapability -Online -Name "Rsat.ActiveDirectory.DS-LDS.Tools~~~~0.0.1.0"

# En Windows Server
Install-WindowsFeature -Name RSAT-AD-PowerShell

# Importar módulo
Import-Module ActiveDirectory

# Verificar conexión al dominio
Get-ADDomain
Get-ADForest
```

## Usuarios

```powershell
# Buscar usuarios
Get-ADUser -Identity "jperez"
Get-ADUser -Filter { Name -like "Juan*" }
Get-ADUser -Filter * -SearchBase "OU=Ventas,DC=empresa,DC=com"
Get-ADUser -Filter { Enabled -eq $true } -Properties LastLogonDate | Sort-Object LastLogonDate

# Propiedades extendidas
Get-ADUser -Identity "jperez" -Properties *
Get-ADUser -Identity "jperez" -Properties EmailAddress, Department, Title, LastLogonDate

# Crear usuario
New-ADUser -Name "Ana García" `
           -GivenName "Ana" `
           -Surname "García" `
           -SamAccountName "agarcia" `
           -UserPrincipalName "agarcia@empresa.com" `
           -Path "OU=IT,DC=empresa,DC=com" `
           -AccountPassword (ConvertTo-SecureString "P@ssw0rd!" -AsPlainText -Force) `
           -Enabled $true `
           -ChangePasswordAtLogon $true

# Modificar usuario
Set-ADUser -Identity "agarcia" -Title "Sysadmin" -Department "IT" -EmailAddress "agarcia@empresa.com"
Set-ADUser -Identity "agarcia" -Replace @{ telephoneNumber = "+54 11 1234-5678" }

# Habilitar / deshabilitar
Enable-ADAccount  -Identity "agarcia"
Disable-ADAccount -Identity "agarcia"

# Desbloquear cuenta
Unlock-ADAccount -Identity "agarcia"

# Resetear contraseña
Set-ADAccountPassword -Identity "agarcia" -Reset -NewPassword (ConvertTo-SecureString "NuevaClave1!" -AsPlainText -Force)

# Forzar cambio de contraseña en próximo login
Set-ADUser -Identity "agarcia" -ChangePasswordAtLogon $true

# Eliminar usuario
Remove-ADUser -Identity "agarcia" -Confirm:$false

# Usuarios inactivos (sin login en 90 días)
$fecha = (Get-Date).AddDays(-90)
Get-ADUser -Filter { LastLogonDate -lt $fecha -and Enabled -eq $true } -Properties LastLogonDate
```

## Grupos

```powershell
# Listar grupos
Get-ADGroup -Filter *
Get-ADGroup -Filter { Name -like "GRP_*" }
Get-ADGroup -Identity "GRP_Admins" -Properties *

# Miembros de un grupo
Get-ADGroupMember -Identity "GRP_Admins"
Get-ADGroupMember -Identity "GRP_Admins" -Recursive   # incluye grupos anidados

# Grupos de un usuario
Get-ADPrincipalGroupMembership -Identity "agarcia"

# Crear grupo
New-ADGroup -Name "GRP_Developers" `
            -GroupScope Global `
            -GroupCategory Security `
            -Path "OU=Grupos,DC=empresa,DC=com" `
            -Description "Desarrolladores"

# Agregar / quitar miembros
Add-ADGroupMember    -Identity "GRP_Developers" -Members "agarcia","jperez"
Remove-ADGroupMember -Identity "GRP_Developers" -Members "jperez" -Confirm:$false

# Mover usuario entre grupos
Remove-ADGroupMember -Identity "GRP_OldTeam"  -Members "agarcia" -Confirm:$false
Add-ADGroupMember    -Identity "GRP_NewTeam"  -Members "agarcia"
```

## Unidades Organizativas (OU)

```powershell
# Listar OUs
Get-ADOrganizationalUnit -Filter *
Get-ADOrganizationalUnit -Filter * | Select-Object Name, DistinguishedName

# Crear OU
New-ADOrganizationalUnit -Name "Servers" -Path "DC=empresa,DC=com"
New-ADOrganizationalUnit -Name "WebServers" -Path "OU=Servers,DC=empresa,DC=com"

# Mover objeto a otra OU
Move-ADObject -Identity "CN=agarcia,OU=IT,DC=empresa,DC=com" -TargetPath "OU=Managers,DC=empresa,DC=com"

# Eliminar OU (primero quitar protección)
Set-ADOrganizationalUnit -Identity "OU=Servers,DC=empresa,DC=com" -ProtectedFromAccidentalDeletion $false
Remove-ADOrganizationalUnit -Identity "OU=Servers,DC=empresa,DC=com" -Recursive -Confirm:$false
```

## Computadoras

```powershell
# Buscar equipos
Get-ADComputer -Filter *
Get-ADComputer -Filter { OperatingSystem -like "Windows Server*" } -Properties OperatingSystem
Get-ADComputer -Filter { Enabled -eq $true } -SearchBase "OU=Servers,DC=empresa,DC=com"

# Unir equipo al dominio
Add-Computer -DomainName "empresa.com" -Credential (Get-Credential) -Restart

# Quitar del dominio
Remove-Computer -UnjoinDomainCredential (Get-Credential) -WorkgroupName "WORKGROUP" -Restart
```

## Group Policy (GPO)

```powershell
# Módulo necesario
Import-Module GroupPolicy

# Listar GPOs
Get-GPO -All
Get-GPO -Name "Default Domain Policy"

# Crear GPO
New-GPO -Name "Politica-Escritorios"

# Vincular GPO a una OU
New-GPLink -Name "Politica-Escritorios" -Target "OU=Workstations,DC=empresa,DC=com"

# Bloquear herencia en una OU
Set-GPInheritance -Target "OU=IT,DC=empresa,DC=com" -IsBlocked Yes

# Ver links de una GPO
Get-GPOReport -Name "Politica-Escritorios" -ReportType Html -Path "C:\gpo-report.html"

# Forzar actualización de políticas en el equipo local
gpupdate /force
gpupdate /force /target:computer
gpupdate /force /target:user

# Ver políticas aplicadas
gpresult /r                          # resumen
gpresult /h C:\gpresult.html         # reporte HTML
gpresult /scope computer /v          # solo equipo, verbose
```

## Diagnóstico de AD

```powershell
# Controladores de dominio
Get-ADDomainController -Filter *
nltest /dsgetdc:empresa.com

# Estado de replicación
repadmin /showrepl
repadmin /replsummary
repadmin /syncall /AdeP               # forzar sincronización

# Diagnóstico general
dcdiag
dcdiag /test:replications
dcdiag /test:netlogons

# Buscar PDC emulator
(Get-ADDomain).PDCEmulator

# Tiempo y sincronización (crítico en AD)
w32tm /query /status
w32tm /resync
```

## Queries LDAP desde PowerShell

```powershell
# Búsqueda LDAP directa
$searcher = New-Object DirectoryServices.DirectorySearcher
$searcher.Filter = "(&(objectClass=user)(sAMAccountName=agarcia))"
$searcher.FindOne()

# Exportar usuarios a CSV
Get-ADUser -Filter * -Properties DisplayName, EmailAddress, Department, Enabled |
    Select-Object SamAccountName, DisplayName, EmailAddress, Department, Enabled |
    Export-Csv -Path "C:\usuarios-ad.csv" -NoTypeInformation -Encoding UTF8
```
