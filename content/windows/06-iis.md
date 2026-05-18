---
title: "Windows: IIS - Internet Information Services"
category: "windows"
tags: ["iis", "web", "servidor-web", "powershell", "windows"]
keywords: ["iis powershell", "new-website iis", "configurar iis", "iis bindings", "iis ssl certificado", "appcmd iis", "iis logs ubicacion", "iis application pool", "new-webapplication iis", "webadministration powershell", "iis reset", "iisreset", "iis sitio web crear", "iis redirect", "web.config iis"]
description: "Gestión de IIS desde PowerShell con el módulo WebAdministration: sitios, application pools, bindings SSL, logs y diagnóstico."
---

# IIS — Internet Information Services

## Instalar y preparar IIS

```powershell
# Instalar IIS en Windows Server
Install-WindowsFeature -Name Web-Server -IncludeManagementTools
Install-WindowsFeature -Name Web-Server, Web-Asp-Net45, Web-Net-Ext45, Web-ISAPI-Ext, Web-ISAPI-Filter, Web-Mgmt-Console

# Importar módulo de gestión
Import-Module WebAdministration

# Verificar estado del servicio
Get-Service W3SVC
Start-Service W3SVC
```

## Sitios Web

```powershell
# Listar sitios
Get-Website
Get-Website -Name "Default Web Site"

# Crear sitio
New-Website -Name "MiSitio" `
            -PhysicalPath "C:\inetpub\misitio" `
            -Port 80 `
            -HostHeader "misitio.empresa.com" `
            -ApplicationPool "MiAppPool"

# Iniciar / detener sitio
Start-Website -Name "MiSitio"
Stop-Website  -Name "MiSitio"
Restart-WebItem "IIS:\Sites\MiSitio"

# Modificar path
Set-ItemProperty "IIS:\Sites\MiSitio" -Name physicalPath -Value "D:\wwwroot\misitio"

# Eliminar sitio
Remove-Website -Name "MiSitio"
```

## Bindings (HTTP/HTTPS)

```powershell
# Ver bindings de un sitio
Get-WebBinding -Name "MiSitio"

# Agregar binding HTTP
New-WebBinding -Name "MiSitio" -Protocol http -Port 8080 -HostHeader "api.empresa.com"

# Agregar binding HTTPS
New-WebBinding -Name "MiSitio" -Protocol https -Port 443 -HostHeader "misitio.empresa.com" -SslFlags 1

# Asignar certificado SSL al binding
$cert = Get-ChildItem Cert:\LocalMachine\My | Where-Object { $_.Subject -match "misitio.empresa.com" }
$binding = Get-WebBinding -Name "MiSitio" -Protocol https
$binding.AddSslCertificate($cert.Thumbprint, "MY")

# Eliminar binding
Remove-WebBinding -Name "MiSitio" -Protocol http -Port 8080
```

## Application Pools

```powershell
# Listar pools
Get-WebConfiguration /system.applicationHost/applicationPools/add

# Crear pool
New-WebAppPool -Name "MiAppPool"

# Configurar pool
Set-ItemProperty "IIS:\AppPools\MiAppPool" -Name processModel.identityType -Value 3       # ApplicationPoolIdentity
Set-ItemProperty "IIS:\AppPools\MiAppPool" -Name processModel.userName     -Value "svc_app"
Set-ItemProperty "IIS:\AppPools\MiAppPool" -Name processModel.password     -Value "P@ssw0rd!"
Set-ItemProperty "IIS:\AppPools\MiAppPool" -Name managedRuntimeVersion     -Value "v4.0"
Set-ItemProperty "IIS:\AppPools\MiAppPool" -Name recycling.periodicRestart.time -Value "00:00:00"  # deshabilitar recycling por tiempo

# Iniciar / detener / reciclar
Start-WebAppPool   -Name "MiAppPool"
Stop-WebAppPool    -Name "MiAppPool"
Restart-WebAppPool -Name "MiAppPool"

# Eliminar pool
Remove-WebAppPool -Name "MiAppPool"
```

## Aplicaciones y directorios virtuales

```powershell
# Crear aplicación
New-WebApplication -Name "api" -Site "MiSitio" -PhysicalPath "C:\inetpub\api" -ApplicationPool "MiAppPool"

# Crear directorio virtual
New-WebVirtualDirectory -Site "MiSitio" -Name "static" -PhysicalPath "D:\static-files"

# Listar aplicaciones de un sitio
Get-WebApplication -Site "MiSitio"
```

## Configuración via web.config

```xml
<!-- C:\inetpub\misitio\web.config -->
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>

    <!-- Redireccionamiento HTTP → HTTPS -->
    <rewrite>
      <rules>
        <rule name="HTTP to HTTPS" stopProcessing="true">
          <match url="(.*)" />
          <conditions>
            <add input="{HTTPS}" pattern="^OFF$" />
          </conditions>
          <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
        </rule>
      </rules>
    </rewrite>

    <!-- Página de error personalizada -->
    <httpErrors>
      <remove statusCode="404" />
      <error statusCode="404" path="/404.html" responseMode="ExecuteURL" />
    </httpErrors>

    <!-- Headers de seguridad -->
    <httpProtocol>
      <customHeaders>
        <add name="X-Content-Type-Options" value="nosniff" />
        <add name="X-Frame-Options" value="SAMEORIGIN" />
        <add name="Strict-Transport-Security" value="max-age=31536000" />
      </customHeaders>
    </httpProtocol>

  </system.webServer>
</configuration>
```

## appcmd — CLI clásica de IIS

```powershell
# Listar sitios / pools / apps
%windir%\system32\inetsrv\appcmd list site
%windir%\system32\inetsrv\appcmd list apppool
%windir%\system32\inetsrv\appcmd list app

# Iniciar / detener
appcmd start  site  "MiSitio"
appcmd stop   site  "MiSitio"
appcmd start  apppool "MiAppPool"
appcmd stop   apppool "MiAppPool"
appcmd recycle apppool "MiAppPool"

# Crear sitio
appcmd add site /name:"MiSitio" /physicalPath:"C:\inetpub\misitio" /bindings:"http/*:80:misitio.empresa.com"

# Eliminar sitio
appcmd delete site "MiSitio"
```

## Logs de IIS

```powershell
# Ubicación por defecto
# C:\inetpub\logs\LogFiles\W3SVC1\

# Ver configuración de logs
Get-WebConfigurationProperty -Filter system.applicationHost/sites/site[@name='MiSitio'] -Name logFile

# Cambiar directorio de logs
Set-WebConfigurationProperty -Filter system.applicationHost/sites/site[@name='MiSitio'] -Name "logFile.directory" -Value "D:\logs\iis"

# Parsear log desde PowerShell
Import-Csv "C:\inetpub\logs\LogFiles\W3SVC1\u_ex240101.log" -Delimiter " " -Header "date","time","s-ip","cs-method","cs-uri-stem","cs-uri-query","s-port","cs-username","c-ip","cs(User-Agent)","cs(Referer)","sc-status","sc-substatus","sc-win32-status","time-taken" |
    Where-Object { $_."sc-status" -ge 500 } |
    Select-Object date, time, "cs-method", "cs-uri-stem", "sc-status"
```

## iisreset y diagnóstico

```powershell
# Reiniciar IIS completo
iisreset
iisreset /restart
iisreset /stop
iisreset /start

# Verificar estado del sitio
Test-NetConnection -ComputerName "localhost" -Port 80
Invoke-WebRequest -Uri "http://localhost" -UseBasicParsing

# Ver worker processes activos
Get-WebConfiguration /system.applicationHost/applicationPools/add |
    Where-Object { $_.state -eq "Started" } |
    ForEach-Object { Get-WebConfiguration "/system.applicationHost/applicationPools/add[@name='$($_.name)']/workerProcesses/add" }
```
