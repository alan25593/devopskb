---
title: "Git Avanzado: Stash, Reset, Reflog y Modo Bombero"
category: "git"
tags: ["troubleshooting", "stash", "cherry-pick", "reset", "revert", "reflog", "amend"]
keywords: ["borre un commit", "recuperar commit perdido", "guardar cambios temporalmente", "deshacer commit", "cambiar mensaje de commit", "traer un commit suelto", "git stash", "git reset", "git reflog", "cherry pick", "revert commit", "reset hard", "commit sin querer"]
description: "Comandos de emergencia para cuando rompés el repositorio: stash, reset, revert, cherry-pick y recuperación con reflog."
---

# Git Avanzado y Modo Bombero

## Contenido

- [Git Stash — guardado temporal](#git-stash-—-guardado-temporal)
- [Deshacer cambios: Reset vs Revert](#deshacer-cambios-reset-vs-revert)
- [Modificar el último commit](#modificar-el-último-commit)
- [Git Cherry-Pick — traer un commit específico](#git-cherry-pick-—-traer-un-commit-específico)
- [Git Reflog — el salvador definitivo](#git-reflog-—-el-salvador-definitivo)
- [Git Bisect — encontrar qué commit rompió algo](#git-bisect-—-encontrar-qué-commit-rompió-algo)
- [Git Log avanzado — buscar en la historia](#git-log-avanzado-—-buscar-en-la-historia)

---

## Git Stash — guardado temporal

Ideal cuando estás en medio de un desarrollo sucio y necesitás cambiar de rama urgente (hotfix en prod) sin hacer un commit incompleto.

```bash
# Guardar cambios actuales (incluye untracked con -u)
git stash -u -m "WIP: refactor de VPC subnets"

# Listar todos los stashes guardados
git stash list

# Aplicar el último stash y mantenerlo en la lista
git stash apply

# Aplicar el último stash y borrarlo de la lista (el más usado)
git stash pop

# Aplicar un stash específico
git stash apply stash@{2}

# Borrar un stash específico
git stash drop stash@{0}

# Borrar todos los stashes
git stash clear
```

---

## Deshacer cambios: Reset vs Revert

### Git Revert — seguro para producción

Crea un commit **nuevo** que revierte exactamente el commit indicado. No altera la historia pasada. Ideal para ramas compartidas y main.

```bash
# Revertir un commit específico
git revert <commit-sha>

# Revertir un merge commit (mantiene el lado base)
git revert -m 1 <sha-del-merge-commit>

# Revertir sin abrir el editor
git revert --no-edit <commit-sha>
```

### Git Reset — destructivo, reescribe historia

Mueve el puntero de la rama hacia atrás en el tiempo.

```bash
# --soft: mantiene cambios en staging (no perdés código)
git reset --soft HEAD~1

# --mixed (default): mantiene cambios en working directory
git reset HEAD~1

# --hard: BORRA TODO, deja el código como en ese commit
git reset --hard <commit-sha>
```

> Nunca hagas `reset --hard` sobre commits ya pusheados a una rama compartida.

---

## Modificar el último commit

Si te equivocaste en el mensaje o te olvidaste agregar un archivo:

```bash
# Cambiar el mensaje del último commit
git commit --amend -m "feat(security): fix IAM policy permissions"

# Agregar un archivo olvidado sin cambiar el mensaje
git add archivo-olvidado.yml
git commit --amend --no-edit
```

> Solo si el commit **no fue pusheado** todavía. Si ya fue, necesitás `--force-with-lease` después.

---

## Git Cherry-Pick — traer un commit específico

Necesitás aplicar un fix puntual de `feature/B` en `release/v1` sin arrastrar todos los demás cambios:

```bash
git switch release/v1.2
git cherry-pick <commit-sha>

# Varios commits de una vez
git cherry-pick abc123 def456 ghi789

# Cherry-pick de un rango de commits
git cherry-pick abc123^..ghi789
```

Si hay conflicto durante el cherry-pick:
```bash
# Resolver el conflicto, luego:
git add archivo-resuelto.tf
git cherry-pick --continue

# Abortar
git cherry-pick --abort
```

---

## Git Reflog — el salvador definitivo

Si hiciste un `git reset --hard` erróneo y pensás que perdiste trabajo, **reflog** lleva registro de absolutamente cada movimiento del HEAD — incluso commits huérfanos — por 90 días.

```bash
git reflog
```

Salida típica:
```
43b12a2 HEAD@{0}: reset: moving to HEAD~1
a8f9c11 HEAD@{1}: commit: feat(k8s): add resource limits to deployment
7cc3d10 HEAD@{2}: commit: chore: update terraform providers
```

Para recuperar el commit `a8f9c11` que borraste sin querer:

```bash
# Opción 1: volver directo (resetea la rama al estado recuperado)
git reset --hard a8f9c11

# Opción 2: crear una rama desde ese punto (más seguro)
git switch -c recuperacion a8f9c11
```

---

## Git Bisect — encontrar qué commit rompió algo

Búsqueda binaria sobre el historial para identificar cuándo se introdujo un bug:

```bash
git bisect start
git bisect bad                  # el estado actual está roto
git bisect good v1.0.0          # esta versión funcionaba bien

# Git va saltando commits automáticamente, vos en cada paso ejecutás tu test:
# Si está roto:
git bisect bad
# Si funciona:
git bisect good

# Cuando Git encuentra el commit culpable, te lo muestra.
# Para terminar:
git bisect reset
```

---

## Git Log avanzado — buscar en la historia

```bash
# Ver qué commits tocaron un archivo específico
git log --follow -- path/al/archivo.tf

# Buscar en qué commit apareció o desapareció un texto
git log -S "nombre_del_recurso" --oneline

# Ver los cambios de un commit específico
git show <commit-sha>

# Ver quién modificó cada línea de un archivo
git blame archivo.tf

# Solo las líneas 20 a 40
git blame -L 20,40 archivo.tf
```
