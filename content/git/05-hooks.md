---
title: "Git Hooks: Automatización y Guardianes del Repositorio"
category: "git"
tags: ["hooks", "automatizacion", "pre-commit", "pre-push", "ci"]
keywords: ["git hooks", "pre-commit hook", "pre-push hook", "commit-msg hook", "validar commit", "ejecutar tests antes de push", "detectar secrets", "lint antes de commit", "husky", "automatizar git", "hook personalizado", "compartir hooks equipo"]
description: "Hooks de cliente y servidor para automatizar validaciones, detectar secrets, correr linters y proteger ramas antes de que el daño llegue al remoto."
---

# Git Hooks

## Contenido

- [Hooks de cliente más usados](#hooks-de-cliente-más-usados)
- [pre-commit — guardia antes de commitear](#pre-commit-—-guardia-antes-de-commitear)
- [commit-msg — validar el formato del mensaje](#commit-msg-—-validar-el-formato-del-mensaje)
- [pre-push — tests antes de que el daño llegue al remoto](#pre-push-—-tests-antes-de-que-el-daño-llegue-al-remoto)
- [post-merge — acciones después de un merge o pull](#post-merge-—-acciones-después-de-un-merge-o-pull)
- [Detectar secrets con git-secrets](#detectar-secrets-con-git-secrets)
- [Compartir hooks con el equipo (el problema)](#compartir-hooks-con-el-equipo-el-problema)
- [Hooks de servidor (bare repos / GitLab / Gitea)](#hooks-de-servidor-bare-repos-/-gitlab-/-gitea)

---

Los hooks son scripts que Git ejecuta automáticamente antes o después de eventos clave (commit, push, merge). Vivien en `.git/hooks/` y pueden estar escritos en bash, python, node — cualquier cosa ejecutable.

```bash
# Ver los hooks de ejemplo que Git incluye por defecto
ls .git/hooks/
```

Cada archivo `.sample` es un ejemplo desactivado. Para activar uno, quitás el `.sample` y lo hacés ejecutable:

```bash
cp .git/hooks/pre-commit.sample .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

---

## Hooks de cliente más usados

| Hook | Cuándo se ejecuta | Si sale con error |
|---|---|---|
| `pre-commit` | Antes de abrir el editor del commit | Cancela el commit |
| `commit-msg` | Después de escribir el mensaje | Cancela el commit |
| `pre-push` | Antes de enviar commits al remoto | Cancela el push |
| `post-commit` | Justo después de crear el commit | No cancela nada |
| `post-merge` | Después de un merge exitoso | No cancela nada |

---

## pre-commit — guardia antes de commitear

El hook más útil. Corre linters, formateadores y detección de secrets antes de que el código entre al historial.

```bash
#!/bin/bash
# .git/hooks/pre-commit

set -e

echo "→ Verificando secrets con git-secrets..."
git secrets --scan

echo "→ Corriendo linter de Terraform..."
terraform fmt -check -recursive

echo "→ Validando YAML..."
yamllint .

echo "✓ Todo OK"
```

Saltear el hook puntualmente (con consciencia):
```bash
git commit --no-verify -m "WIP: salteo hooks temporalmente"
```

---

## commit-msg — validar el formato del mensaje

Forzar Conventional Commits en todo el equipo:

```bash
#!/bin/bash
# .git/hooks/commit-msg

MSG=$(cat "$1")
PATTERN="^(feat|fix|docs|style|refactor|chore|test|ci)(\(.+\))?: .{1,80}"

if ! echo "$MSG" | grep -qE "$PATTERN"; then
  echo ""
  echo "✗ Mensaje de commit inválido:"
  echo "  $MSG"
  echo ""
  echo "  Formato requerido: tipo(scope): descripción"
  echo "  Ejemplos:"
  echo "    feat(auth): add OAuth2 support"
  echo "    fix(k8s): correct resource limits"
  echo ""
  exit 1
fi
```

---

## pre-push — tests antes de que el daño llegue al remoto

```bash
#!/bin/bash
# .git/hooks/pre-push

RAMA_ACTUAL=$(git symbolic-ref HEAD | sed 's|refs/heads/||')

# Bloquear push directo a main
if [ "$RAMA_ACTUAL" = "main" ] || [ "$RAMA_ACTUAL" = "master" ]; then
  echo "✗ Push directo a $RAMA_ACTUAL bloqueado."
  echo "  Abrí un Pull Request."
  exit 1
fi

echo "→ Corriendo tests..."
go test ./... || exit 1

echo "→ Validando terraform plan..."
terraform validate || exit 1

echo "✓ Listo para push"
```

---

## post-merge — acciones después de un merge o pull

Útil para instalar dependencias automáticamente cuando cambia el lockfile:

```bash
#!/bin/bash
# .git/hooks/post-merge

CHANGED=$(git diff-tree -r --name-only --no-commit-id ORIG_HEAD HEAD)

if echo "$CHANGED" | grep -q "go.sum"; then
  echo "→ go.sum cambió, actualizando dependencias..."
  go mod download
fi

if echo "$CHANGED" | grep -q "package-lock.json"; then
  echo "→ package-lock.json cambió, corriendo npm install..."
  npm install
fi
```

---

## Detectar secrets con git-secrets

```bash
# Instalar (Mac)
brew install git-secrets

# Instalar hooks en el repo actual
git secrets --install

# Agregar patrones de AWS
git secrets --register-aws

# Agregar patrón personalizado (ej: tokens internos)
git secrets --add 'VAULT_TOKEN=[A-Za-z0-9]{24}'

# Escanear todo el historial
git secrets --scan-history
```

---

## Compartir hooks con el equipo (el problema)

`.git/hooks/` no se commitea — cada desarrollador tiene que configurar los hooks manualmente. Soluciones:

### Opción A — directorio versionado + script de setup

```bash
# Estructura del repo
mkdir -p .githooks
# Crear los hooks ahí adentro
# ...

# Script de instalación (setup.sh)
git config core.hooksPath .githooks
chmod +x .githooks/*
```

Cada desarrollador corre `./setup.sh` una sola vez. El resto es automático.

```bash
# O configurarlo globalmente para todos los repos futuros
git config --global core.hooksPath ~/.githooks
```

### Opción B — Husky (proyectos Node)

```bash
npm install --save-dev husky
npx husky init
```

Crea `.husky/pre-commit` automáticamente. Los hooks se commitean y corren para todo el equipo sin setup manual.

```bash
# .husky/pre-commit
npm run lint
npm test
```

### Opción C — pre-commit framework (Python, multi-lenguaje)

```bash
pip install pre-commit
```

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.83.0
    hooks:
      - id: terraform_fmt
      - id: terraform_validate
      - id: terraform_docs

  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks
```

```bash
# Instalar los hooks
pre-commit install

# Correr manualmente sobre todos los archivos
pre-commit run --all-files
```

---

## Hooks de servidor (bare repos / GitLab / Gitea)

En servidores Git self-hosted podés usar hooks del lado del servidor que **no se pueden saltear con `--no-verify`**.

| Hook | Cuándo se ejecuta |
|---|---|
| `pre-receive` | Antes de aceptar cualquier push |
| `update` | Por cada rama que se intenta actualizar |
| `post-receive` | Después de aceptar el push (notificaciones, deploys) |

```bash
#!/bin/bash
# hooks/pre-receive (en el servidor)

while read OLDREV NEWREV REFNAME; do
  RAMA=$(echo "$REFNAME" | sed 's|refs/heads/||')

  if [ "$RAMA" = "main" ]; then
    echo "✗ Push directo a main no permitido en este servidor."
    exit 1
  fi
done
```

En **GitLab** y **GitHub** estos se configuran desde la UI (Protected Branches, Required Status Checks) en lugar de scripts manuales.
