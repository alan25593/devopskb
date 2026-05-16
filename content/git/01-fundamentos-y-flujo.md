---
title: "Git Fundamentos: Configuración, Ciclo de Vida y Commits"
category: "git"
tags: ["basics", "config", "commit", "status"]
keywords: ["como hacer un commit", "guardar cambios", "configurar usuario", "git init", "staging", "alias git", "ignorar archivos", "conventional commits", "configuracion inicial"]
description: "Configuración inicial, estados de los archivos en Git, creación de commits eficientes y buenas prácticas de mensajes."
---

# Git Fundamentos y Ciclo de Vida

## Contenido

- [Configuración inicial](#configuración-inicial)
- [El ciclo de vida de los archivos (Three States)](#el-ciclo-de-vida-de-los-archivos-three-states)
- [Crear commits efectivos](#crear-commits-efectivos)
- [.gitignore](#gitignore)

---

## Configuración inicial

Antes de empezar a trackear, configurá tu identidad:

```bash
# Configuración global (se guarda en ~/.gitconfig)
git config --global user.name "Tu Nombre"
git config --global user.email "tu-email@domain.com"

# Forzar LF en Linux/Mac, auto-convertir en Windows
git config --global core.autocrlf input

# Alias para ver log visual hermoso
git config --global alias.lg "log --graph --abbrev-commit --decorate --format=format:'%C(bold blue)%h%C(reset) - %C(bold green)(%ar)%C(reset) %C(white)%s%C(reset) %C(dim white)- %an%C(reset)%C(bold yellow)%d%C(reset)' --all"
```

Ver toda la configuración activa:

```bash
git config --list --show-origin
```

---

## El ciclo de vida de los archivos (Three States)

Git trabaja con tres áreas locales:

1. **Working Directory** — archivos modificados, sin trackear todavía
2. **Staging Area (Index)** — "limbo" preparando el snapshot para el commit
3. **Local Repository** — cambios guardados en la base de datos de `.git/`

```bash
# Inicializar un repositorio
git init

# Ver el estado actual
git status

# Agregar un archivo al staging
git add archivo.tf

# Agregar todos los cambios
git add .

# Ver exactamente qué cambió (diff de working vs staging)
git diff

# Ver qué está en staging vs último commit
git diff --staged
```

---

## Crear commits efectivos

```bash
# Commit estándar
git commit -m "feat(auth): add JWT validation middleware"

# Saltarse el staging (solo archivos ya trackeados)
git commit -a -m "fix(ingress): update WAF rule ID"

# Commit interactivo — abre el editor configurado
git commit
```

### Conventional Commits

Estructura para que tu pipeline genere changelogs automáticos:

| Prefijo | Cuándo usarlo |
|---|---|
| `feat:` | Nueva funcionalidad |
| `fix:` | Resolución de bug |
| `docs:` | Solo documentación |
| `refactor:` | Sin fix ni feature, solo reestructura |
| `chore:` | Build, dependencias, CI |
| `style:` | Formateo, espacios, sin cambio lógico |

Ejemplo con scope:
```bash
git commit -m "feat(k8s): add resource limits to all deployments"
git commit -m "fix(terraform): correct IAM policy ARN for S3 bucket"
```

---

## .gitignore

Patrones más comunes para proyectos DevOps:

```gitignore
# Terraform
.terraform/
*.tfstate
*.tfstate.backup
*.tfvars

# Secrets
.env
*.pem
*.key
secrets.yml

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
```

Ignorar un archivo ya trackeado (sin borrarlo del disco):

```bash
echo "secrets.env" >> .gitignore
git rm --cached secrets.env
git commit -m "chore: stop tracking secrets.env"
```
