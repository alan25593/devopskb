---
title: "Windows: WinRM y PowerShell Remoting"
category: "windows"
tags: ["winrm", "remoting", "powershell", "rdp", "ssh"]
keywords: ["powershell remoting habilitar", "enable-psremoting", "invoke-command remoto", "enter-pssession", "new-pssession", "winrm configurar", "winrm quickconfig", "rdp powershell", "mstsc", "psexec windows", "ssh windows", "openssh windows server", "powershell jobs remotos", "credential powershell remoto", "kerberos ntlm powershell"]
description: "PowerShell Remoting con WinRM, sesiones remotas, Invoke-Command, RDP desde CLI y configuración de OpenSSH en Windows."
---

# WinRM y PowerShell Remoting

## Configurar WinRM

```powershell
# Habilitar remoting (requiere admin, abre puerto 5985)
Enable-PSRemoting -Force

# Configuración rápida equivalente
winrm quickconfig

# Verificar estado
Get-WSManInstance -ResourceURI winrm/config/listener -SelectorSet @{Address="*";Transport="HTTP"}
winrm enumerate winrm/config/listener

# Ver configuración actual
winrm get winrm/config
Get-WSManInstance winrm/config -Recurse

# Agregar equipos de confianza (en workgroup, sin dominio)
Set-Item WSMan:\localhost\Client\TrustedHosts -Value "servidor01,192.168.1.10"
Set-Item WSMan:\localhost\Client\TrustedHosts -Value "*"   # todos (inseguro en producción)
Get-Item WSMan:\localhost\Client\TrustedHosts
```

## Invoke-Command — ejecutar comandos remotos

```powershell
# Comando simple en un equipo
Invoke-Command -ComputerName "servidor01" -ScriptBlock { Get-Date }

# Con credenciales explícitas
$cred = Get-Credential
Invoke-Command -ComputerName "servidor01" -Credential $cred -ScriptBlock { Get-Process }

# Múltiples equipos en paralelo
$servidores = @("web01", "web02", "db01")
Invoke-Command -ComputerName $servidores -ScriptBlock { Get-Service W3SVC }

# Pasar variables al bloque remoto
$servicio = "W3SVC"
Invoke-Command -ComputerName "servidor01" -ScriptBlock { param($svc) Get-Service $svc } -ArgumentList $servicio

# Usando $Using: (más limpio)
$servicio = "W3SVC"
Invoke-Command -ComputerName "servidor01" -ScriptBlock { Get-Service $using:servicio }

# Ejecutar script remoto
Invoke-Command -ComputerName "servidor01" -FilePath "C:\scripts\deploy.ps1"
```

## Enter-PSSession — sesión interactiva

```powershell
# Abrir sesión interactiva
Enter-PSSession -ComputerName "servidor01"
Enter-PSSession -ComputerName "servidor01" -Credential (Get-Credential)

# Indicador de prompt cambia a: [servidor01]: PS C:\>
# Salir con:
Exit-PSSession
```

## New-PSSession — sesiones persistentes

```powershell
# Crear sesión (reutilizable)
$session = New-PSSession -ComputerName "servidor01"
$session = New-PSSession -ComputerName "servidor01" -Credential (Get-Credential)

# Usar sesión existente (más rápido que crear nueva cada vez)
Invoke-Command -Session $session -ScriptBlock { Get-ChildItem C:\ }
Invoke-Command -Session $session -ScriptBlock { $env:COMPUTERNAME }

# Entrar a sesión guardada
Enter-PSSession -Session $session

# Ver sesiones abiertas
Get-PSSession

# Cerrar sesión
Remove-PSSession -Session $session
Get-PSSession | Remove-PSSession   # cerrar todas

# Sesión a múltiples equipos
$sessions = New-PSSession -ComputerName "web01","web02","db01"
Invoke-Command -Session $sessions -ScriptBlock { hostname }
$sessions | Remove-PSSession
```

## Transferir archivos por remoting

```powershell
# Copiar desde local a remoto
$session = New-PSSession -ComputerName "servidor01"
Copy-Item "C:\local\app.zip" -Destination "C:\deploy\" -ToSession $session

# Copiar desde remoto a local
Copy-Item "C:\logs\error.log" -Destination "C:\local\" -FromSession $session

# Copiar directorio completo
Copy-Item "C:\local\app" -Destination "C:\deploy\" -ToSession $session -Recurse
```

## Jobs remotos en background

```powershell
# Ejecutar job remoto en background
$job = Invoke-Command -ComputerName "servidor01" -ScriptBlock { Start-Sleep 10; Get-Date } -AsJob

# Ver estado
Get-Job
$job.State

# Obtener resultado cuando termina
Receive-Job -Job $job -Wait
Remove-Job  -Job $job
```

## Configurar HTTPS para WinRM

```powershell
# Crear certificado autofirmado
$cert = New-SelfSignedCertificate -DnsName "servidor01.empresa.com" -CertStoreLocation Cert:\LocalMachine\My

# Crear listener HTTPS
New-Item -Path WSMan:\localhost\Listener -Transport HTTPS -Address * -CertificateThumbprint $cert.Thumbprint

# Conectar usando HTTPS
$option = New-WSManSessionOption -SkipCACheck -SkipCNCheck
Enter-PSSession -ComputerName "servidor01" -UseSSL -SessionOption $option
```

## RDP (Remote Desktop) desde CLI

```powershell
# Conectar via mstsc
mstsc /v:servidor01
mstsc /v:servidor01:3389
mstsc /v:servidor01 /admin        # conectar a sesión admin (sesión 0)
mstsc /v:servidor01 /f            # pantalla completa

# Guardar configuración RDP
mstsc /v:servidor01 /edit         # abrir GUI para guardar .rdp

# Habilitar RDP en equipo remoto
Invoke-Command -ComputerName "servidor01" -ScriptBlock {
    Set-ItemProperty -Path "HKLM:\System\CurrentControlSet\Control\Terminal Server" -Name "fDenyTSConnections" -Value 0
    Enable-NetFirewallRule -DisplayGroup "Remote Desktop"
    Set-ItemProperty -Path "HKLM:\System\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp" -Name "UserAuthentication" -Value 1
}

# Listar sesiones RDP activas
query session /server:servidor01
qwinsta /server:servidor01

# Cerrar sesión RDP remota
logoff <ID_sesion> /server:servidor01
```

## OpenSSH en Windows

```powershell
# Instalar OpenSSH Server
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0

# Iniciar y configurar auto-start
Start-Service sshd
Set-Service -Name sshd -StartupType Automatic

# Regla de firewall (se crea automáticamente)
Get-NetFirewallRule -Name "OpenSSH-Server-In-TCP"

# Configurar shell por defecto para SSH
New-ItemProperty -Path "HKLM:\SOFTWARE\OpenSSH" -Name DefaultShell -Value "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe" -PropertyType String -Force

# Conectar via SSH
ssh usuario@servidor01
ssh -i C:\Users\alan\.ssh\id_rsa usuario@servidor01

# Transferir archivos
scp archivo.txt usuario@servidor01:C:\destino\
scp usuario@servidor01:C:\archivo.txt C:\local\
```

## Credential Management

```powershell
# Solicitar credenciales de forma segura
$cred = Get-Credential
$cred = Get-Credential -UserName "DOMINIO\admin" -Message "Ingresá tu contraseña"

# Guardar credencial (encriptada para el usuario actual)
$cred = Get-Credential
$cred.Password | ConvertFrom-SecureString | Set-Content "C:\secure\pwd.txt"

# Recuperar credencial guardada
$password = Get-Content "C:\secure\pwd.txt" | ConvertTo-SecureString
$cred = New-Object System.Management.Automation.PSCredential("DOMINIO\admin", $password)

# Credential Manager de Windows
cmdkey /list
cmdkey /add:servidor01 /user:admin /pass:P@ssw0rd
cmdkey /delete:servidor01
```
