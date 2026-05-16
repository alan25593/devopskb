---
title: "Trabajo Remoto y Sincronización (GitHub / GitLab / CodeCommit)"
category: "git"
tags: ["remote", "push", "pull", "fetch", "upstream", "clone"]
keywords: ["subir cambios", "bajar cambios", "agregar origen remoto", "git push", "git pull", "git fetch", "clonar repositorio", "force push", "push rechazado", "sincronizar fork", "upstream remote"]
description: "Interacción con servidores remotos, manejo de tracking branches y diferencias clave entre fetch y pull."
---

# Trabajo Remoto y Colaboración

## Contenido

- [Configuración de remotos](#configuración-de-remotos)
- [Fetch vs Pull](#fetch-vs-pull)
- [Enviar cambios (Push)](#enviar-cambios-push)
- [Sincronizar un fork con el repositorio original](#sincronizar-un-fork-con-el-repositorio-original)
- [Push rechazado (diverged branches)](#push-rechazado-diverged-branches)
- [Tracking branches y referencias remotas](#tracking-branches-y-referencias-remotas)

---

## Configuración de remotos

```bash
# Clonar un repositorio existente
git clone git@github.com:usuario/repo.git

# Clonar solo una rama específica
git clone --branch develop --single-branch git@github.com:usuario/repo.git

# Ver los remotos configurados (fetch y push)
git remote -v

# Agregar un remoto a un repo local existente
git remote add origin git@github.com:usuario/repo.git

# Cambiar la URL de un remoto
git remote set-url origin git@github.com:usuario/nuevo-repo.git

# Agregar upstream para sincronizar un fork
git remote add upstream git@github.com:org-original/repo.git
```

---

## Fetch vs Pull

### Git Fetch — seguro, no toca tu código

Descarga el historial y las ramas del remoto a tu base de datos local `.git/`, pero **no modifica** tu Working Directory ni tu rama actual.

```bash
git fetch origin

# Ver qué cambió en el remoto antes de mergear
git log HEAD..origin/main --oneline
```

### Git Pull — fetch + merge automático

Descarga y fusiona inmediatamente en la rama donde estás parado.

```bash
git pull origin main
```

### Pull con rebase (recomendado)

Evita que el historial se llene de commits `Merge branch 'main' of github.com...`:

```bash
git pull --rebase origin main

# Configurarlo como default para siempre
git config --global pull.rebase true
```

---

## Enviar cambios (Push)

```bash
# Primera vez: subir la rama y setear tracking
git push -u origin feature/mi-infra

# Pushes siguientes (ya con tracking seteado)
git push

# Ver a qué remoto/rama está trackeando la rama actual
git branch -vv
```

### Force push — con cuidado

Necesario después de un rebase local. Nunca sobre ramas compartidas.

```bash
# PELIGROSO: sobreescribe sin preguntar
git push --force

# SEGURO: frena si alguien subió commits nuevos que vos no tenés
git push --force-with-lease
```

> `--force-with-lease` es la alternativa correcta a `--force`. Si alguien subió commits mientras vos estabas rebasing, el push falla — evitás pisar código ajeno.

---

## Sincronizar un fork con el repositorio original

```bash
git fetch upstream
git switch main
git rebase upstream/main
git push --force-with-lease origin main
```

---

## Push rechazado (diverged branches)

```
! [rejected] main -> main (non-fast-forward)
```

Solución:

```bash
git pull --rebase origin main
# resolver conflictos si los hay
git push origin main
```

---

## Tracking branches y referencias remotas

```bash
# Ver todas las ramas remotas disponibles
git branch -r

# Crear rama local trackeando una rama remota
git switch --track origin/feature/otra-feature

# Limpiar referencias a ramas remotas ya borradas
git fetch --prune
# o alias:
git remote prune origin
```
