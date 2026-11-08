---
title: "Limpiar logs de IIS y de aplicaciones con PowerShell (con vista previa)"
category: "windows"
tags: ["iis", "powershell", "logs", "disco", "limpieza", "webadministration", "automatizacion"]
keywords: ["limpiar logs iis powershell", "borrar logs iis antiguos", "Get-Website logFile directory", "W3SVC logs carpeta", "iis logs llenan disco", "liberar espacio disco windows server", "borrar archivos mas viejos powershell", "powershell whatif limpieza", "logs aplicacion iis app_data logs", "disco lleno windows iis"]
description: "Script PowerShell para liberar disco en servidores IIS: encuentra la carpeta de logs de cada sitio, suma carpetas de logs de aplicaciones, borra solo archivos más viejos que N horas y tiene modo vista previa con salida JSON."
---

# Limpiar logs de IIS y de aplicaciones con PowerShell

En servidores web Windows, los logs de IIS (`u_ex*.log`) crecen sin límite por defecto. En un server con muchos sitios es común encontrar **varios GB de logs** de meses atrás: en casos reales, 5,6 GB en un webserver de QA, la mayor parte de dos o tres sitios con mucho tráfico.

Este script:

- **Encuentra solo** la carpeta de logs de cada sitio desde la configuración de IIS: no hay que mantener una lista de rutas.
- Suma **carpetas de logs de aplicaciones** (por ejemplo `<ruta de instalación>\logs`).
- Borra solo **archivos** más viejos que `KeepHours`. Nunca borra carpetas, y saltea los archivos en uso.
- Tiene **modo vista previa** (`-WhatIf`) y devuelve **JSON** para usarlo desde Jenkins u otra automatización.

---

## Dónde guarda IIS los logs

Cada sitio tiene su carpeta en `logFile.directory` (por defecto `%SystemDrive%\inetpub\logs\LogFiles`) y una subcarpeta `W3SVC<id>`:

```powershell
Import-Module WebAdministration
Get-Website | Select-Object id, name, @{n='logDir'; e={ Join-Path ([Environment]::ExpandEnvironmentVariables($_.logFile.directory)) ("W3SVC" + $_.id) }}
```

```text
id name          logDir
-- ----          ------
 1 Default       C:\inetpub\logs\LogFiles\W3SVC1
 4 Admin         C:\inetpub\logs\LogFiles\W3SVC4
 6 Portal        D:\IISLogs\W3SVC6
```

---

## Script

```powershell
<#
.SYNOPSIS
  Borra logs de IIS (todos los sitios) y de aplicaciones con más de KeepHours.
.PARAMETER KeepHours
  Se conservan los archivos modificados en las últimas N horas (24 = "todo menos el último día").
.PARAMETER AppLogDirs
  Carpetas de logs de aplicaciones a incluir (solo se procesan las que existen).
.PARAMETER WhatIf
  Vista previa: lista y suma, no borra.
#>
param(
    [int]$KeepHours = 24,
    [string[]]$AppLogDirs = @(),
    [switch]$WhatIf
)
$ErrorActionPreference = 'Stop'
$limit = (Get-Date).AddHours(-$KeepHours)
$targets = @()

# 1) Logs de IIS de cada sitio
try {
    Import-Module WebAdministration -ErrorAction Stop
    foreach ($s in @(Get-Website)) {
        $d = [Environment]::ExpandEnvironmentVariables([string]$s.logFile.directory)
        if ($d) { $targets += [pscustomobject]@{ type = 'IIS'; name = [string]$s.name; path = (Join-Path $d ('W3SVC' + $s.id)) } }
    }
} catch { Write-Warning "IIS no disponible: $($_.Exception.Message)" }

# 2) Logs de aplicaciones
foreach ($p in $AppLogDirs) { $targets += [pscustomobject]@{ type = 'APP'; name = (Split-Path $p -Parent | Split-Path -Leaf); path = $p } }

$rows = @()
$seen = @{}
foreach ($t in $targets) {
    $p = $t.path.TrimEnd('\')
    if ($seen.ContainsKey($p.ToLower())) { continue }
    $seen[$p.ToLower()] = 1

    # Reglas de seguridad: ruta larga, que contenga "log" y que exista
    if ($p.Length -lt 10 -or $p -notmatch 'log' -or -not (Test-Path -LiteralPath $p -PathType Container)) { continue }

    $f = @(Get-ChildItem -LiteralPath $p -Recurse -File -Force -ErrorAction SilentlyContinue |
           Where-Object { $_.LastWriteTime -lt $limit })
    $mb = 0
    if ($f.Count -gt 0) { $mb = [math]::Round((($f | Measure-Object -Property Length -Sum).Sum) / 1MB, 1) }

    $failed = 0
    if (-not $WhatIf) {
        foreach ($x in $f) {
            try { Remove-Item -LiteralPath $x.FullName -Force -ErrorAction Stop } catch { $failed++ }   # en uso
        }
    }
    $rows += [pscustomobject]@{ type = $t.type; name = $t.name; path = $p; files = $f.Count; mb = $mb; failed = $failed }
}

$rows | Sort-Object mb -Descending | Format-Table -AutoSize | Out-String | Write-Host
$total = ($rows | Measure-Object -Property mb -Sum).Sum
Write-Host ("{0}: {1} archivos / {2} MB" -f ($(if ($WhatIf) { 'A borrar (vista previa)' } else { 'Borrados' })), ($rows | Measure-Object -Property files -Sum).Sum, [math]::Round($total, 1))

# Línea final parseable desde un pipeline
Write-Output ('CLEAN_RESULT=' + (@{ rows = @($rows); whatIf = [bool]$WhatIf } | ConvertTo-Json -Depth 4 -Compress))
```

Uso:

```powershell
# Vista previa
.\Clear-IisAndAppLogs.ps1 -KeepHours 24 -WhatIf

# Real, incluyendo carpetas de logs de aplicaciones
.\Clear-IisAndAppLogs.ps1 -KeepHours 24 -AppLogDirs 'C:\inetpub\wwwroot\api\logs','C:\Services\scheduler\logs\main'
```

---

## Desde Jenkins

Si las rutas de instalación de las apps ya están en un inventario (por ejemplo `app_paths.json` con `install.path` y opcionalmente `install.logsFolder`), las carpetas candidatas se arman de ahí y **se pasan todas**: el script solo procesa las que existen en ese server, así no hace falta mapear qué app corre en qué máquina.

```groovy
def apps = []
appPaths.services.each { name, s ->
    def base = s.install?.path
    if (base && !base.contains('{')) {
        (s.install.logsFolder ? [s.install.logsFolder] : ['logs', 'App_Data\\logs']).each { sub -> apps << "${base}\\${sub}".toString() }
    }
}
def out
node('SERVER-WEB-01') {
    withEnv(["APP_DIRS=${apps.join(';')}"]) {
        out = powershell(returnStdout: true, script: '.\\Clear-IisAndAppLogs.ps1 -KeepHours 24 -AppLogDirs ($env:APP_DIRS -split ";")')
    }
}
def line = out.readLines().find { it.startsWith('CLEAN_RESULT=') }
def result = readJSON(text: line.substring('CLEAN_RESULT='.length()))
```

Ver el flujo completo con alertas y tickets en [Remediación automática de alertas de disco](/article/jenkins/16-remediacion-alertas-disco-alertmanager-jira/).

---

## Prevenir en lugar de limpiar

- **Mover los logs de IIS a otro disco**: `Set-WebConfigurationProperty -Filter system.applicationHost/sites/siteDefaults/logFile -Name directory -Value 'D:\IISLogs'`.
- **Tarea programada diaria** con este script (ver [Tareas programadas](/article/windows/14-tareas-programadas/)).
- **Rotación en la aplicación**: configurar el logger (Serilog, NLog, log4net) con `retainedFileCountLimit` o un equivalente.
- **Comprimir en lugar de borrar** si hay requisitos de auditoría: `Compress-Archive` a otra unidad antes de borrar.

Relacionado: [Gestión de discos y volúmenes](/article/windows/15-gestion-de-discos-y-volumenes/), [Optimización del sistema](/article/windows/19-optimizacion-sistema/).
