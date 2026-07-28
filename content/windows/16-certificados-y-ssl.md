---
title: "Windows: Certificados y SSL"
category: "windows"
tags: ["seguridad", "certificados", "ssl", "powershell", "iis"]
keywords: ["instalar certificado powershell", "import-pfx", "certificate store windows", "cert:"]
description: "Manejo del almacén de certificados en Windows, importar y exportar PFX/CER con PowerShell."
---

# Certificados y SSL

Lidiar con certificados (.pfx, .cer) en Windows puede ser molesto si dependés del MMC (`certlm.msc`). Desde PowerShell es mucho más predecible usando el drive virtual `Cert:\`.

## Estructura del Certificate Store

Windows maneja los certificados como si fueran un sistema de archivos.

```powershell
# Ver los almacenes principales
Get-ChildItem Cert:\

# Ver los certificados personales de la máquina (LocalMachine\My) - El lugar más común para IIS/Servicios
Get-ChildItem Cert:\LocalMachine\My
```

## Importar Certificados

### Certificado PFX (con clave privada)

Ideal para cuando deployás una app web en IIS y necesitas que soporte HTTPS.

```powershell
# La contraseña del PFX debe pasarse como SecureString
$Password = ConvertTo-SecureString "PassDelPfx123" -AsPlainText -Force

# Importar a LocalMachine\My (Personal de la computadora)
Import-PfxCertificate -FilePath "C:\Temp\wildcard.pfx" -CertStoreLocation "Cert:\LocalMachine\My" -Password $Password
```

### Certificado CER (solo pública / CA)

Útil para instalar certificados de entidades certificadoras raíz (Root CAs).

```powershell
Import-Certificate -FilePath "C:\Temp\MiRootCA.cer" -CertStoreLocation "Cert:\LocalMachine\Root"
```

## Buscar y Eliminar Certificados

```powershell
# Buscar por Thumbprint
Get-ChildItem Cert:\LocalMachine\My | Where-Object Thumbprint -eq "A1B2C3D4E5..."

# Eliminar un certificado (ojo con esto)
Get-ChildItem Cert:\LocalMachine\My\A1B2C3D4E5... | Remove-Item
```

> [!WARNING]
> Nunca borres certificados del store de "Root" o "CA" a menos que sepas exactamente qué estás haciendo. Podés romper la confianza de la cadena SSL de todo el OS.
