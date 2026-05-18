---
title: "Windows: Redes y Firewall"
category: "windows"
tags: ["redes", "firewall", "netsh", "dns", "powershell"]
keywords: ["configurar ip windows powershell", "netsh comandos", "firewall windows powershell", "new-netfirewallrule", "ipconfig renew", "ping tracert nslookup windows", "get-netadapter", "set-netipaddress", "dns flush windows", "resolve-dnsname", "test-netconnection", "route windows", "proxy windows", "netstat windows", "configurar dns powershell"]
description: "Configuración de red, firewall de Windows Defender, diagnóstico de conectividad y gestión DNS desde PowerShell y netsh."
---

# Redes y Firewall

## Información de red

```powershell
# Adaptadores de red
Get-NetAdapter
Get-NetAdapter | Where-Object { $_.Status -eq "Up" }

# Dirección IP
Get-NetIPAddress
Get-NetIPAddress -AddressFamily IPv4
ipconfig /all          # cmd clásico

# Rutas
Get-NetRoute
route print            # cmd

# Tabla ARP
Get-NetNeighbor
arp -a                 # cmd

# Conexiones activas
Get-NetTCPConnection
Get-NetTCPConnection -State Established
netstat -ano           # cmd
```

## Configurar dirección IP

```powershell
# Ver configuración actual
Get-NetIPConfiguration
Get-NetIPConfiguration -InterfaceAlias "Ethernet"

# Asignar IP estática
New-NetIPAddress -InterfaceAlias "Ethernet" -IPAddress 192.168.1.50 -PrefixLength 24 -DefaultGateway 192.168.1.1

# Cambiar IP existente
Remove-NetIPAddress -InterfaceAlias "Ethernet" -IPAddress 192.168.1.50 -Confirm:$false
New-NetIPAddress -InterfaceAlias "Ethernet" -IPAddress 192.168.1.100 -PrefixLength 24 -DefaultGateway 192.168.1.1

# Configurar DNS
Set-DnsClientServerAddress -InterfaceAlias "Ethernet" -ServerAddresses ("8.8.8.8","8.8.4.4")
Set-DnsClientServerAddress -InterfaceAlias "Ethernet" -ResetServerAddresses   # DHCP para DNS

# Obtener IP por DHCP
Set-NetIPInterface -InterfaceAlias "Ethernet" -Dhcp Enabled
ipconfig /renew                # cmd

# Liberar y renovar DHCP
ipconfig /release
ipconfig /renew
```

## DNS

```powershell
# Flush caché DNS
Clear-DnsClientCache
ipconfig /flushdns      # cmd

# Ver caché DNS
Get-DnsClientCache

# Resolver nombre
Resolve-DnsName www.google.com
Resolve-DnsName www.google.com -Type MX
Resolve-DnsName www.google.com -Type A -Server 8.8.8.8
nslookup www.google.com               # cmd
nslookup -type=MX google.com 8.8.8.8 # cmd con servidor específico
```

## Diagnóstico de conectividad

```powershell
# Ping
Test-Connection 8.8.8.8
Test-Connection 8.8.8.8 -Count 4 -Quiet     # retorna $true/$false
ping 8.8.8.8 -n 4                             # cmd

# Traceroute
Test-NetConnection 8.8.8.8 -TraceRoute
tracert 8.8.8.8                               # cmd

# Probar puerto TCP
Test-NetConnection -ComputerName "servidor01" -Port 443
Test-NetConnection -ComputerName "servidor01" -Port 3389 -InformationLevel Detailed

# Probar desde PowerShell sin Test-NetConnection
$client = New-Object System.Net.Sockets.TcpClient
$client.Connect("servidor01", 80)
$client.Connected    # $true si pudo conectar
$client.Close()
```

## Firewall de Windows Defender

```powershell
# Estado del firewall
Get-NetFirewallProfile
Get-NetFirewallProfile -Name Domain,Private,Public | Select-Object Name, Enabled

# Habilitar / deshabilitar
Set-NetFirewallProfile -Profile Domain,Private,Public -Enabled True
Set-NetFirewallProfile -Profile Public -Enabled False

# Listar reglas
Get-NetFirewallRule
Get-NetFirewallRule -Enabled True -Direction Inbound
Get-NetFirewallRule -DisplayName "*HTTP*"

# Ver regla con detalles de puerto
Get-NetFirewallRule -DisplayName "Mi regla" | Get-NetFirewallPortFilter

# Crear regla — permitir entrada
New-NetFirewallRule -DisplayName "Permitir HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow

# Crear regla — bloquear entrada
New-NetFirewallRule -DisplayName "Bloquear Telnet" -Direction Inbound -Protocol TCP -LocalPort 23 -Action Block

# Crear regla — permitir programa
New-NetFirewallRule -DisplayName "Mi App" -Direction Inbound -Program "C:\app\mi-app.exe" -Action Allow

# Crear regla — permitir rango de IPs
New-NetFirewallRule -DisplayName "Red interna" -Direction Inbound -Protocol TCP -LocalPort 8080 -RemoteAddress "10.0.0.0/8" -Action Allow

# Modificar regla existente
Set-NetFirewallRule -DisplayName "Permitir HTTP" -Enabled False
Set-NetFirewallRule -DisplayName "Permitir HTTP" -RemoteAddress "192.168.0.0/16"

# Eliminar regla
Remove-NetFirewallRule -DisplayName "Permitir HTTP"
```

## netsh — configuración avanzada de red

```powershell
# Interfaces
netsh interface show interface
netsh interface ipv4 show addresses

# Asignar IP estática
netsh interface ipv4 set address name="Ethernet" static 192.168.1.50 255.255.255.0 192.168.1.1

# Configurar DNS
netsh interface ipv4 set dns name="Ethernet" static 8.8.8.8
netsh interface ipv4 add dns name="Ethernet" 8.8.4.4 index=2

# Volver a DHCP
netsh interface ipv4 set address name="Ethernet" dhcp
netsh interface ipv4 set dns name="Ethernet" dhcp

# Firewall desde netsh (legacy)
netsh advfirewall firewall add rule name="Puerto 80" protocol=TCP dir=in localport=80 action=allow
netsh advfirewall firewall delete rule name="Puerto 80"
netsh advfirewall show allprofiles
```

## Rutas estáticas

```powershell
# Agregar ruta
New-NetRoute -DestinationPrefix "10.20.0.0/16" -InterfaceAlias "Ethernet" -NextHop 192.168.1.254
route add 10.20.0.0 mask 255.255.0.0 192.168.1.254   # cmd

# Ruta persistente
route -p add 10.20.0.0 mask 255.255.0.0 192.168.1.254

# Ver rutas
Get-NetRoute -AddressFamily IPv4
route print

# Eliminar ruta
Remove-NetRoute -DestinationPrefix "10.20.0.0/16" -Confirm:$false
route delete 10.20.0.0
```

## Proxy del sistema

```powershell
# Ver configuración de proxy
netsh winhttp show proxy
Get-ItemProperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings" | Select-Object ProxyServer, ProxyEnable

# Configurar proxy
netsh winhttp set proxy proxy-server="http://proxy:8080" bypass-list="*.local;10.*"

# Importar desde IE/Edge
netsh winhttp import proxy source=ie

# Quitar proxy
netsh winhttp reset proxy

# Variables de entorno para herramientas CLI
$env:HTTP_PROXY  = "http://proxy:8080"
$env:HTTPS_PROXY = "http://proxy:8080"
$env:NO_PROXY    = "localhost,127.0.0.1,.local"
```

## Compartir conexión y NIC bonding

```powershell
# NIC Teaming (bonding)
New-NetLbfoTeam -Name "NIC-Team" -TeamMembers "Ethernet","Ethernet 2" -TeamingMode SwitchIndependent -LoadBalancingAlgorithm Dynamic

Get-NetLbfoTeam
Get-NetLbfoTeamMember -Team "NIC-Team"

Remove-NetLbfoTeam -Name "NIC-Team" -Confirm:$false
```
