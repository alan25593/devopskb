---
title: "MongoDB: Referencia Rápida"
category: "clarive"
tags: ["clarive", "mongo", "database", "cli"]
---

# Consultas Directas a MongoDB

Referencia rápida para navegar y realizar consultas de administración por consola directamente en la base de datos de Clarive.

## Navegación básica en la CLI

Comandos para ubicar las colecciones del sistema:

```javascript
show dbs
use bancoformosa
show collections
```

## Consultas Útiles (Roles, Grupos y Reglas)

Las siguientes consultas permiten extraer u operar rápidamente sobre la metadata interna de Clarive:

- **Consultar roles configurados (solo ID y Rol)**:
  ```javascript
  db.role.find({}, { _id: 0, id: 1, role: 1 }).pretty()
  ```

- **Consultar grupos de usuarios**:
  ```javascript
  db.master_doc.find({collection: "UserGroup"}, {mid: 1})
  ```

- **Actualizar forzadamente un ID de regla**:
  ```javascript
  db.rule.updateOne(
      { rule_name: 'Nombre Regla' },
      { $set: { id: "ID nuevo", rule_seq: 381 } }
  )
  ```
