---
title: "Git Worktrees"
category: "Productividad"
tags: ["git", "worktree", "stash", "paralelismo"]
description: "Trabaja en múltiples ramas al mismo tiempo sin necesidad de git stash o clonar varias veces."
---

# Git Worktrees: Clonar es para novatos 🌳

Imaginate esto: Estás re concentrado tirando código en un feature (`feat/infra-aws`), tenés el estado a medias, archivos modificados por todos lados, y entra el PM gritando por un **HOTFIX URGENTE** en producción.

¿Qué haces? 
- ¿Haces un `git stash` y rezas para no perder nada o que no haya conflictos después?
- ¿Haces un commit falopa tipo "wip"?
- ¿Clonas de nuevo el repo en otra carpeta (gastando tiempo y disco)?

No. Usas `git worktree`.

## ¿Qué es Git Worktree?

Te permite tener varias ramas del **mismo repositorio** abiertas en carpetas separadas (working directories), compartiendo el mismo `.git` subyacente. O sea, podés tener tu rama de desarrollo abierta en tu IDE actual, y abrir la rama de master en otra carpeta, arreglar el bug, pushear y volver a tu vida.

## Cómo usarlo

### 1. Crear un worktree nuevo
Supongamos que estamos en `~/dev/mi-app`. Vamos a crear una carpeta nueva al lado de `mi-app` para el hotfix:

```bash
# git worktree add <ruta> <rama-a-crear-o-checkout>
git worktree add ../mi-app-hotfix -b hotfix/caida-db master
```

Esto crea el directorio `../mi-app-hotfix`, hace un checkout de la rama `master`, y crea la rama `hotfix/caida-db` a partir de ella. 

### 2. Trabajar normalmente
Abres `../mi-app-hotfix` en otra ventana de tu editor. Haces el fix, commiteas y pusheas.

```bash
cd ../mi-app-hotfix
# fixes...
git commit -am "fix: connection pool overflow"
git push origin hotfix/caida-db
```

### 3. Listar worktrees activos
Si te olvidas cuántas carpetas tenés dando vueltas:
```bash
git worktree list
```

### 4. Limpiar cuando terminas
Una vez que el hotfix está en master y ya no necesitás la carpeta, la borras y le avisas a Git que la limpié.

```bash
# Borras el directorio físicamente (puedes usar rm -rf también)
git worktree remove ../mi-app-hotfix
```

> [!NOTE]
> Tené en cuenta que si usás variables de entorno en archivos `.env`, vas a tener que copiarlos al nuevo worktree, ya que Git no trackea esos archivos (obvio, están en el `.gitignore`). Aparte de eso, es un viaje de ida.
