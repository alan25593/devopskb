---
title: "Gestión de Ramas, Merge, Rebase y Conflictos"
category: "git"
tags: ["branches", "merge", "rebase", "conflictos"]
keywords: ["crear rama", "cambiar de rama", "unir ramas", "hacer rebase", "resolver conflictos", "git checkout", "git switch", "borrar rama", "renombrar rama", "merge vs rebase"]
description: "Estrategias de ramificación, diferencias críticas entre Merge y Rebase, y resolución manual de conflictos de código."
---

# Gestión de Ramas y Fusión

## Contenido

- [Manipulación de ramas](#manipulación-de-ramas)
- [Merge vs Rebase](#merge-vs-rebase)
- [Resolución de conflictos](#resolución-de-conflictos)
- [Estrategias de branching (resumen)](#estrategias-de-branching-resumen)

---

## Manipulación de ramas

Las ramas en Git son punteros móviles a un commit — no pesan nada.

```bash
# Crear una rama
git branch feature/nueva-feature

# Cambiar de rama (forma moderna)
git switch feature/nueva-feature

# Crear y cambiar en un paso
git switch -c feature/nueva-feature
# equivalente clásico:
git checkout -b feature/nueva-feature

# Listar ramas locales y remotas
git branch -a

# Renombrar la rama actual
git branch -m nuevo-nombre

# Borrar rama local (solo si ya se fusionó)
git branch -d feature/vieja

# Forzar borrado sin importar si se fusionó
git branch -D feature/abortada

# Borrar rama en el remoto
git push origin --delete feature/vieja
```

---

## Merge vs Rebase

### Git Merge — conserva la historia real

Crea un "merge commit" uniendo las dos puntas. Mantiene el orden cronológico estricto. Ideal para ramas compartidas.

```bash
git switch main
git merge feature/nueva-feature
```

Historial resultante:
```
A---B---C---M  (main)
         \ /
          D---E  (feature)
```

### Git Rebase — historia lineal y limpia

Mueve la base de tu rama al tip de la rama destino. Reescribe los commits. Ideal para limpiar historia antes de mergear.

```bash
git switch feature/nueva-feature
git rebase main
```

Historial resultante:
```
A---B---C---D'---E'  (feature, rebaseada sobre main)
```

> **Regla de oro:** NUNCA hagas rebase sobre ramas públicas o compartidas (`main`, `develop`). Destruís el historial de tus compañeros.

### Rebase interactivo — reescribir los últimos N commits

```bash
git rebase -i HEAD~3
```

Opciones dentro del editor:
- `pick` — mantener el commit
- `reword` — cambiar el mensaje
- `squash` — fusionar con el anterior
- `drop` — eliminar el commit

---

## Resolución de conflictos

El conflicto ocurre cuando dos commits modifican la misma línea del mismo archivo.

Al ejecutar `git merge` o `git rebase`, Git frena con `CONFLICT (content)`.

**1. Ver qué archivos tienen conflicto:**
```bash
git status
```

**2. El archivo conflictuado tiene estos marcadores:**
```
<<<<<<< HEAD
Lógica que está en tu rama actual (destino)
=======
Lógica que viene de la rama que estás mergeando
>>>>>>> feature/nueva-feature
```

**3. Editar el archivo:** borrar los marcadores (`<<<<`, `====`, `>>>>`) y dejar el código correcto.

**4. Marcar como resuelto y continuar:**
```bash
git add archivo-resuelto.tf

git merge --continue    # si estabas en merge
git rebase --continue   # si estabas en rebase
```

**5. Abortar todo y volver al estado anterior:**
```bash
git merge --abort
git rebase --abort
```

---

## Estrategias de branching (resumen)

| Estrategia | Cuándo usarla |
|---|---|
| **Trunk-based** | Equipos chicos, CI/CD maduro, deploys frecuentes |
| **Git Flow** | Releases programados, equipos grandes |
| **GitHub Flow** | Feature branches + PR + deploy directo a main |

Convención de nombres recomendada:
```
feature/descripcion-corta
fix/nombre-del-bug
release/v1.2.0
hotfix/cors-error-prod
chore/update-dependencies
```
