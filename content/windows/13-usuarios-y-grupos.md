---
title: "Windows: Gestión de Usuarios y Grupos"
category: "windows"
tags: ["usuarios", "grupos", "cmd", "powershell", "seguridad", "lusrmgr"]
keywords: ["crear usuario windows", "cambiar contraseña windows cmd", "escalar permisos windows", "net user", "net localgroup", "new-localuser", "add-localgroupmember", "lusrmgr.msc"]
description: "Guía básica para la gestión de usuarios locales y grupos en Windows mediante CMD y PowerShell."
---

# Gestión de Usuarios y Grupos

Manejar usuarios y grupos locales es una tarea súper recurrente. Acá te dejo las formas más útiles de hacerlo, tanto desde la interfaz gráfica como por consola.

## Interfaz Gráfica (lusrmgr.msc)

Si preferís usar la interfaz visual, podés usar la consola de "Usuarios y grupos locales".

1. Apretá `Win + R` para abrir la ventana de Ejecutar.
2. Escribí `lusrmgr.msc` y dale a Enter.

Desde ahí vas a ver dos carpetas principales: **Usuarios** y **Grupos**. Con clic derecho podés hacer prácticamente todo: crear cuentas nuevas, blanquear contraseñas (sin saber la anterior), deshabilitar usuarios o agregar a alguien al grupo de Administradores. Viene genial cuando estás por RDP y preferís hacer un par de clics rápidos.

---

## CMD (Línea de Comandos)

El viejo y confiable comando `net` te saca de cualquier apuro.

### Crear un usuario

Para crear un usuario nuevo y clavarle una contraseña de una:

```cmd
net user NombreUsuario Contraseña /add
```

*Ejemplo:*
```cmd
net user jdoe P@ssw0rd123 /add
```

### Cambiar la contraseña

Si te piden blanquear o cambiar la pass de un usuario existente:

```cmd
net user NombreUsuario NuevaContraseña
```

### Escalar permisos (Añadir a Administradores)

Para darle permisos de admin a un usuario, lo metés al grupo "Administradores" (ojo, si el server está en inglés, es "Administrators").

```cmd
net localgroup Administradores NombreUsuario /add
```

### Habilitar / Deshabilitar un usuario

```cmd
:: Deshabilitar
net user NombreUsuario /active:no

:: Habilitar
net user NombreUsuario /active:yes
```

### Borrar un usuario

```cmd
net user NombreUsuario /delete
```

---

## PowerShell

PowerShell es la forma moderna. Usa cmdlets que devuelven objetos y te permiten automatizar mucho mejor.

### Crear un usuario

En PS, por seguridad, las contraseñas se manejan como `SecureString`.

```powershell
# Primero armamos la contraseña segura
$Password = ConvertTo-SecureString "P@ssw0rd123" -AsPlainText -Force

# Creamos el usuario
New-LocalUser -Name "jdoe" -Password $Password -FullName "John Doe" -Description "Usuario creado por script"
```

### Cambiar la contraseña

```powershell
$NuevaPassword = ConvertTo-SecureString "Nuev@Pass456" -AsPlainText -Force
Set-LocalUser -Name "jdoe" -Password $NuevaPassword
```

### Escalar permisos (Añadir a un grupo local)

Para meterlo en el grupo de admins:

```powershell
Add-LocalGroupMember -Group "Administradores" -Member "jdoe"
```
*(Recordá usar "Administrators" si el OS está en inglés)*

### Consultas útiles

Ver qué hay en el sistema siempre viene bien antes de tocar nada:

```powershell
# Listar todos los usuarios
Get-LocalUser

# Listar todos los grupos
Get-LocalGroup

# Ver quiénes son admins
Get-LocalGroupMember -Group "Administradores"
```

### Habilitar / Deshabilitar un usuario

```powershell
# Deshabilitar
Disable-LocalUser -Name "jdoe"

# Habilitar
Enable-LocalUser -Name "jdoe"
```

### Borrar un usuario

```powershell
Remove-LocalUser -Name "jdoe"
```
