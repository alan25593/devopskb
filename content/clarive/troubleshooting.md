---
title: "Troubleshooting de Servicios Clarive"
category: "clarive"
tags: ["clarive", "troubleshooting", "logs", "locks"]
keywords: ["destrabar cola clarive", "dispatcher colgado", "reserve_objects", "logs clarive", "event daemon colgado"]
description: "Resolución de problemas críticos: ubicación de logs, cómo destrabar el semáforo del dispatcher, reiniciar el daemon y liberar objetos bloqueados."
---

# Troubleshooting de servicios

Ante problemas de Clarive, una de las primeras tareas es determinar si el error corresponde al backend, web, dispatcher, daemon, MongoDB o a un proceso Perl.

## Análisis de Logs

Los logs son la principal fuente para identificar errores (buscar palabras clave como `error`, `exception`, `failed`, `timeout`, `Mongo`).
La ubicación depende de la instalación, generalmente en: `/opt/clarive/logs/`, `log/` o `/var/log/`.

También se pueden revisar los logs del servicio directamente mediante el OS:
```bash
journalctl -u clarive -f
```

## Destrabar Colas (Dispatcher y Daemon)

### 1. Semáforo del Dispatcher
Cuando una operación o evento queda colgado, puede ser necesario limpiar manualmente el estado del semáforo en MongoDB.

Antes de ejecutar, verificar el estado para confirmar:
```javascript
db.sem.find({ key: "event_daemon" })
```

Para liberarlo (Acción destructiva):
```javascript
db.sem.updateOne(
    { key: "event_daemon" },
    { $set: { slots: 0, queue: [] } }
)
```

### 2. Reiniciar Cola del Daemon
Si el daemon se traba o necesita un reinicio limpio:

1. Detener el dispatcher: `cla disp-stop -c formosadev;`
2. Verificar procesos vivos: `cla ps -c formosadev;`
3. Si el daemon sigue colgado, matarlo desde el SO: `kill <PID>`
4. Iniciar servicio del daemon: `cla service.event.daemon -c formosadev -d`
5. Iniciar dispatcher: `cla disp-start -c formosadev --daemon -d`

## Limpiar Objetos Bloqueados en MongoDB

Clarive mantiene información de objetos reservados/lockeados. Si un usuario abandona la sesión bruscamente, el objeto puede quedar bloqueado en el frontend.

Buscar la reserva por el nombre del usuario o tópico:
```javascript
db.reserve_objects.find({ name: /JFMY123/i })
```

Eliminar la reserva puntual (¡Cuidado, verificar bien el `_id`!):
```javascript
db.reserve_objects.deleteOne({
    _id: ObjectId("69d8fdbdfd48a3531c49dead")
})
```
> [!CAUTION]
> Evitar borrar usando `deleteMany` o por criterios demasiado amplios.

## Comandos del SO útiles

- Obtener más info de un proceso colgado por su PID (archivos abiertos): 
  ```bash
  lsof -p <PID>
  ```
- Buscar y eliminar archivos basura masivamente: 
  ```bash
  find . -name "nombre_archivo" -exec rm -f {} \;
  ```
