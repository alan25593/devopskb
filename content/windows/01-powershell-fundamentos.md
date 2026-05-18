---
title: "Windows: PowerShell Fundamentos"
category: "windows"
tags: ["powershell", "scripting", "automatizacion", "cli"]
keywords: ["powershell comandos basicos", "powershell pipeline", "get-help powershell", "variables powershell", "funciones powershell", "powershell scripting", "cmdlet", "alias powershell", "foreach-object", "where-object", "select-object", "powershell perfil", "execution policy", "set-executionpolicy"]
description: "Fundamentos de PowerShell: cmdlets, pipeline, variables, funciones, scripts y configuración del entorno."
---

# PowerShell Fundamentos

## Conceptos básicos

```powershell
# Obtener ayuda
Get-Help Get-Process
Get-Help Get-Process -Examples
Get-Help Get-Process -Full

# Actualizar ayuda
Update-Help

# Listar comandos disponibles
Get-Command
Get-Command -Verb Get
Get-Command -Noun Process
Get-Command *network*
```

## Pipeline y objetos

```powershell
# Pipeline — pasa objetos, no texto
Get-Process | Where-Object { $_.CPU -gt 10 }
Get-Process | Sort-Object CPU -Descending | Select-Object -First 10
Get-Process | Select-Object Name, CPU, WorkingSet

# ForEach-Object
Get-ChildItem *.log | ForEach-Object { Remove-Item $_ }

# Guardar en variable
$procs = Get-Process | Where-Object { $_.Name -like "chrome*" }
$procs.Count
```

## Variables y tipos

```powershell
# Variables
$nombre = "servidor01"
$numero = 42
$lista  = @("a", "b", "c")
$hash   = @{ clave = "valor"; puerto = 8080 }

# Tipos
[int]$edad      = 30
[string]$texto  = "hola"
[bool]$activo   = $true
[datetime]$hoy  = Get-Date

# Strings
"Hola $nombre"                    # interpolación
"CPU: $($proc.CPU)"               # expresión dentro de string
'Sin interpolación: $nombre'       # comillas simples = literal

# Arrays y hashtables
$lista[0]                         # primer elemento
$hash["clave"]
$hash.clave
$hash.Keys
```

## Condicionales y bucles

```powershell
# If / elseif / else
if ($valor -gt 100) {
    "alto"
} elseif ($valor -eq 100) {
    "exacto"
} else {
    "bajo"
}

# Switch
switch ($estado) {
    "running" { "Activo" }
    "stopped" { "Detenido" }
    default   { "Desconocido" }
}

# For / foreach / while
for ($i = 0; $i -lt 10; $i++) { Write-Output $i }

foreach ($item in $lista) { Write-Output $item }

$i = 0
while ($i -lt 5) { $i++; Write-Output $i }

# Iterar sobre hashtable
foreach ($key in $hash.Keys) {
    "$key = $($hash[$key])"
}
```

## Operadores de comparación

```powershell
-eq    # igual
-ne    # distinto
-gt    # mayor
-lt    # menor
-ge    # mayor o igual
-le    # menor o igual
-like  # wildcard  "server*"
-match # regex     "^server\d+"
-in    # en lista  "web" -in @("web","db")
-not   # negación
-and   # AND lógico
-or    # OR lógico
```

## Funciones

```powershell
function Get-ServerInfo {
    param(
        [string]$ComputerName = "localhost",
        [int]$Timeout = 30
    )
    $os = Get-WmiObject Win32_OperatingSystem -ComputerName $ComputerName
    [PSCustomObject]@{
        Servidor   = $ComputerName
        SO         = $os.Caption
        Uptime     = (Get-Date) - $os.ConvertToDateTime($os.LastBootUpTime)
    }
}

# Invocar
Get-ServerInfo
Get-ServerInfo -ComputerName "web01"
```

## Manejo de errores

```powershell
# Try / catch / finally
try {
    $result = Invoke-Command -ComputerName $server -ScriptBlock { Get-Date }
} catch [System.Net.WebException] {
    Write-Error "Error de red: $_"
} catch {
    Write-Error "Error inesperado: $_"
} finally {
    Write-Output "Siempre se ejecuta"
}

# ErrorAction
Get-Item "no-existe.txt" -ErrorAction SilentlyContinue
Get-Item "no-existe.txt" -ErrorAction Stop

# Variable de error
$ErrorActionPreference = "Stop"
```

## Scripts y módulos

```powershell
# Execution policy
Get-ExecutionPolicy
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser

# Ejecutar script
.\mi-script.ps1
. .\mi-script.ps1          # dot-sourcing (importa funciones al scope actual)

# Módulos
Get-Module -ListAvailable
Import-Module ActiveDirectory
Remove-Module ActiveDirectory

# Instalar módulos desde PSGallery
Install-Module -Name Az -Scope CurrentUser
Find-Module *azure*
```

## Perfil de PowerShell

```powershell
# Ver ruta del perfil
$PROFILE
$PROFILE.CurrentUserAllHosts

# Crear perfil si no existe
if (-not (Test-Path $PROFILE)) {
    New-Item -ItemType File -Path $PROFILE -Force
}

# Editar perfil
notepad $PROFILE
# o
code $PROFILE
```

## Aliases comunes

| Alias | Cmdlet               |
|-------|----------------------|
| `ls`  | Get-ChildItem        |
| `cd`  | Set-Location         |
| `cat` | Get-Content          |
| `cp`  | Copy-Item            |
| `mv`  | Move-Item            |
| `rm`  | Remove-Item          |
| `ps`  | Get-Process          |
| `kill`| Stop-Process         |
| `echo`| Write-Output         |
| `?`   | Where-Object         |
| `%`   | ForEach-Object       |

## Output y formato

```powershell
# Formatear salida
Get-Process | Format-Table Name, CPU, WorkingSet -AutoSize
Get-Process | Format-List *
Get-Service | Format-Wide Name -Column 4

# Exportar
Get-Process | Export-Csv procesos.csv -NoTypeInformation
Get-Process | ConvertTo-Json | Out-File procesos.json
Import-Csv procesos.csv

# Out-GridView (GUI interactiva)
Get-Process | Out-GridView

# Measure
Get-ChildItem C:\ -Recurse | Measure-Object -Property Length -Sum
```
