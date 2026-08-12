---
title: "Administración y Operaciones"
category: "clarive"
tags: ["clarive", "operaciones", "servicios", "migraciones"]
---

# Administración y operaciones

## Gestión de Servicios

Algunos comandos habituales de administración para controlar los procesos de Clarive:

```bash
# Consultar procesos/servicios activos
cla ps

# Detener el servicio web
cla web-stop
```

> [!WARNING]
> Antes de ejecutar comandos de parada/reinicio en producción, verificar el impacto y si existen procesos o tareas en ejecución.

## Administración de la Base de Datos

En caso de ser necesario reiniciar o levantar la base de datos de MongoDB manualmente, utilizar su archivo de configuración:

```bash
mongod -f /opt/mongo/config/mongod.conf
```

## Migraciones: Exportar e Importar Reglas (Profiles)

Es muy común necesitar migrar reglas, vistas o configuraciones entre diferentes entornos (ej. de Desarrollo a Producción).

Guardar (exportar) una regla a un módulo del profile:
```bash
cla FormosaSave -c formosadev --profile FormosaCM_N202508_19_Alan_rule --include rules --json_query '{"id":{"$in":["406","339","346"]}}' > /opt/clarive/features/profiles/lib/Clarive/Profile/FormosaCM_N202508_19_Alan_rule.pm
```

Importar (cargar) una regla desde el entorno REPL de Perl:
```perl
repl -e 'use Clarive::FormosaScrumLoader; Clarive::FormosaScrumLoader->module_loader("FormosaCM_N202508_19_Alan_category")'
```
