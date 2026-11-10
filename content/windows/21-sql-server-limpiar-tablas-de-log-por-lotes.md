---
title: "SQL Server: limpiar tablas de log por lotes conservando las últimas horas"
category: "windows"
tags: ["sql-server", "sqlcmd", "mantenimiento", "disco", "transaction-log", "jenkins"]
keywords: ["sql server borrar logs viejos por lotes", "delete top batch sql server", "conservar ultimo dia tabla log", "truncate vs delete sql server", "transaction log lleno sql server", "dbcc shrinkfile log", "recovery simple shrink", "sqlcmd jenkins mantenimiento", "log_reuse_wait LOG_BACKUP", "borrar millones de filas sin bloquear"]
description: "Cómo pasar de un TRUNCATE de tablas de log a un borrado por lotes que conserva las últimas N horas, con simulacro, sin bloquear la tabla ni inflar el log de transacciones, y qué esperar del shrink."
---

# SQL Server: limpiar tablas de log por lotes conservando las últimas horas

Un job de mantenimiento hacía `TRUNCATE` de las tablas de log de la aplicación (`Log`, `JobResult`, etc.). Es rápido, pero borra **todo**, incluido lo del día, que es justo lo que se mira cuando hay un problema. Lo que se busca es conservar las últimas N horas y borrar el resto sin trabar la base.

---

## TRUNCATE vs DELETE por lotes

| | `TRUNCATE` | `DELETE TOP (N) ... WHERE fecha < @corte` en bucle |
|---|---|---|
| Qué borra | Todo | Solo lo anterior al corte |
| Log de transacciones | Mínimo | Registra cada fila: hay que ir por lotes |
| Bloqueos | Lock de tabla, muy corto | Locks por lote; la app sigue escribiendo |
| Requisitos | Sin FKs que apunten a la tabla | Ninguno |

---

## Script

```sql
SET NOCOUNT ON;
DECLARE @cutoff datetime2 = DATEADD(HOUR, -24, SYSDATETIME());

IF OBJECT_ID(N'dbo.Log', N'U') IS NULL OR COL_LENGTH(N'dbo.Log', N'CreationTime') IS NULL
    PRINT 'AVISO: dbo.Log.CreationTime no existe en ' + DB_NAME() + ': se saltea.';
ELSE
BEGIN
    DECLARE @old bigint, @deleted bigint = 0, @n int = 1;
    SELECT @old = COUNT_BIG(*) FROM dbo.Log WITH (NOLOCK) WHERE CreationTime < @cutoff;
    PRINT 'dbo.Log: ' + CONVERT(varchar(20), @old) + ' filas anteriores al corte';
    -- simulacro: cortar acá
    WHILE @n > 0
    BEGIN
        DELETE TOP (50000) FROM dbo.Log WHERE CreationTime < @cutoff;
        SET @n = @@ROWCOUNT;
        SET @deleted += @n;
        CHECKPOINT;          -- en recovery SIMPLE libera el log entre lotes
    END
    PRINT 'dbo.Log: borradas ' + CONVERT(varchar(20), @deleted) + ' filas.';
END
GO
```

- **Un bloque por tabla y columna de fecha**, separado por `GO` (cada batch declara sus variables). Si la tabla o la columna no existen en esa base, se saltea con aviso. Así el mismo script sirve para varias bases que no tienen exactamente las mismas tablas.
- **Simulacro primero:** el mismo script sin el `WHILE` informa cuántas filas se borrarían. Conviene sumar si hay un índice cuya primera columna sea la de fecha:

```sql
SELECT COUNT(*) FROM sys.index_columns ic
JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
WHERE ic.object_id = OBJECT_ID(N'dbo.Log') AND ic.key_ordinal = 1 AND c.name = N'CreationTime';
```

  Sin índice, cada lote recorre toda la tabla. Con cientos de miles de filas no importa; con cientos de millones, conviene crear el índice o borrar por la clave primaria.

- **Hora:** `SYSDATETIME()` es la hora del servidor. Si la aplicación guarda las fechas en UTC y el servidor no está en UTC, el corte se corre esas horas. Con un margen de 24 h casi nunca importa.

---

## Log de transacciones y shrink

Lo que más espacio de disco libera suele ser el **log de transacciones** (`.ldf`), no la tabla. Si la base está en `FULL` y nadie hace backups de log, `log_reuse_wait_desc = LOG_BACKUP` y el `.ldf` crece sin límite.

```sql
SELECT name, recovery_model_desc, log_reuse_wait_desc FROM sys.databases WHERE name = DB_NAME();

-- solo en ambientes donde no se necesita restore a un punto en el tiempo
DECLARE @alter nvarchar(400) = N'ALTER DATABASE ' + QUOTENAME(DB_NAME()) + N' SET RECOVERY SIMPLE';
EXEC (@alter);
CHECKPOINT;
DECLARE @log sysname = (SELECT TOP 1 name FROM sys.database_files WHERE type_desc = 'LOG');
DECLARE @shrink nvarchar(400) = N'DBCC SHRINKFILE (' + QUOTENAME(@log) + N', 2) WITH NO_INFOMSGS';
EXEC (@shrink);
```

- El shrink puede no llegar al tamaño pedido en la primera pasada, porque quedan VLFs activos al final del archivo. La corrida siguiente lo baja más.
- **El archivo de datos (`.mdf`) no se achica** al borrar filas: el espacio queda libre dentro de la base y se reutiliza. Un `SHRINKFILE` del archivo de datos fragmenta los índices; solo vale la pena si el espacio no se va a volver a usar.
- **No pasar a `SIMPLE` en producción** sin acordarlo: se pierde el restore a un punto en el tiempo.

Resultado típico en un ambiente de desarrollo: ~1,1 millones de filas viejas borradas y el log de transacciones bajó de 13,5 GB a menos de 1 GB.

---

## Correrlo desde Jenkins

- Ejecutalo **en el nodo de la base** o en uno con `sqlcmd` y llegada a la base. Que dependa de un agente intermedio que puede estar offline lo deja sin correr sin que nadie se entere.
- `sqlcmd -b -t 0 -i script.sql -o salida.log`: `-b` hace fallar el step ante un error SQL, y `-t 0` desactiva el timeout por consulta, porque el borrado por lotes puede tardar.
- La contraseña va por variable de entorno (`SQLCMDPASSWORD`) desde una credencial, nunca en el script ni con `verbose` en un reemplazo de texto que la imprima en el log.
- Si dispara el job un sistema de alertas, que lo haga **solo en no productivo** o con aprobación. Un parámetro `DRY_RUN=true` por defecto evita sorpresas en las corridas manuales.
