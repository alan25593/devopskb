---
title: "Git Tags y Releases: Versionado Semántico y Gestión de Releases"
category: "git"
tags: ["tags", "releases", "semver", "versionado"]
keywords: ["crear tag", "borrar tag", "subir tag", "listar tags", "tag anotado", "tag lightweight", "semver", "version semantica", "release git", "tag en commit viejo", "push tags", "tag remoto", "git tag", "versionar releases"]
description: "Creación, gestión y publicación de tags en Git. Versionado semántico, tags anotados vs lightweight y flujo completo de releases."
---

# Git Tags y Releases

## Contenido

- [Tipos de tag](#tipos-de-tag)
- [Operaciones básicas](#operaciones-básicas)
- [Push de tags al remoto](#push-de-tags-al-remoto)
- [Borrar tags](#borrar-tags)
- [Checkout de un tag (modo detached HEAD)](#checkout-de-un-tag-modo-detached-head)
- [Versionado Semántico (SemVer)](#versionado-semántico-semver)
- [Flujo completo de release](#flujo-completo-de-release)
- [Ver el tag más reciente](#ver-el-tag-más-reciente)
- [Tags en CI/CD](#tags-en-ci/cd)
- [Listar releases ordenados (útil en scripts)](#listar-releases-ordenados-útil-en-scripts)

---

Los tags son referencias estáticas a un punto específico del historial — no se mueven como las ramas. Se usan para marcar versiones de release (`v1.2.0`, `v2.0.0-beta`).

---

## Tipos de tag

### Lightweight — puntero simple a un commit

```bash
git tag v1.0.0
```

Sin metadata adicional. Solo una referencia al commit actual.

### Annotated — objeto completo en Git (recomendado para releases)

```bash
git tag -a v1.0.0 -m "Release v1.0.0: soporte multi-region y fix de IAM"
```

Tiene: autor, fecha, mensaje, y puede firmarse con GPG. Es lo que usa GitHub/GitLab para generar releases.

---

## Operaciones básicas

```bash
# Listar todos los tags
git tag

# Listar tags con filtro
git tag -l "v1.*"

# Ver información completa de un tag anotado
git show v1.0.0

# Crear tag en un commit específico del pasado
git tag -a v0.9.0 -m "Release v0.9.0" abc1234

# Crear tag anotado con fecha específica (override)
GIT_COMMITTER_DATE="2024-01-15T10:00:00" git tag -a v0.9.0 -m "Release v0.9.0"
```

---

## Push de tags al remoto

Los tags **no se pushean automáticamente** con `git push`.

```bash
# Subir un tag específico
git push origin v1.0.0

# Subir todos los tags locales de una vez
git push origin --tags

# Subir solo los tags anotados (excluye lightweight)
git push origin --follow-tags
```

> Configurar `--follow-tags` como default para que cada `git push` lleve los tags anotados:
> ```bash
> git config --global push.followTags true
> ```

---

## Borrar tags

```bash
# Borrar tag local
git tag -d v1.0.0-beta

# Borrar tag en el remoto
git push origin --delete v1.0.0-beta
# forma alternativa:
git push origin :refs/tags/v1.0.0-beta
```

---

## Checkout de un tag (modo detached HEAD)

```bash
git checkout v1.0.0
```

Esto pone HEAD en modo "detached" — no estás en ninguna rama. Para trabajar desde ese punto:

```bash
# Crear rama desde el tag
git switch -c hotfix/v1.0.1 v1.0.0
```

---

## Versionado Semántico (SemVer)

Formato: `vMAJOR.MINOR.PATCH`

| Tipo de cambio | Qué incrementar | Ejemplo |
|---|---|---|
| Breaking change, incompatible con versión anterior | MAJOR | `v1.0.0` → `v2.0.0` |
| Nueva funcionalidad, compatible hacia atrás | MINOR | `v1.0.0` → `v1.1.0` |
| Bug fix, compatible hacia atrás | PATCH | `v1.0.0` → `v1.0.1` |

### Pre-releases y build metadata

```
v1.0.0-alpha
v1.0.0-beta.2
v1.0.0-rc.1
v2.0.0+build.20240115
```

---

## Flujo completo de release

```bash
# 1. Asegurarse de estar en main actualizado
git switch main
git pull --rebase origin main

# 2. Crear el tag anotado
git tag -a v1.3.0 -m "Release v1.3.0

- feat(k8s): soporte para HPA basado en custom metrics
- fix(terraform): corregir permisos IAM en módulo S3
- chore: actualizar providers a versiones más recientes"

# 3. Pushear el tag
git push origin v1.3.0

# 4. (Opcional) Crear rama de release para hotfixes posteriores
git switch -c release/v1.3 v1.3.0
git push -u origin release/v1.3
```

---

## Ver el tag más reciente

```bash
# El tag más reciente alcanzable desde HEAD
git describe --tags

# Solo el nombre del tag más reciente
git describe --tags --abbrev=0

# Útil en CI para saber en qué versión estás
VERSION=$(git describe --tags --abbrev=0)
echo "Deploying $VERSION"
```

---

## Tags en CI/CD

### GitHub Actions — trigger por tag

```yaml
on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Get version
        run: echo "VERSION=${GITHUB_REF#refs/tags/}" >> $GITHUB_ENV
      - name: Build and push image
        run: |
          docker build -t myapp:$VERSION .
          docker push myapp:$VERSION
```

### GitLab CI — trigger por tag

```yaml
release:
  stage: deploy
  script:
    - echo "Releasing $CI_COMMIT_TAG"
    - docker build -t myapp:$CI_COMMIT_TAG .
  only:
    - tags
```

---

## Listar releases ordenados (útil en scripts)

```bash
# Tags ordenados por fecha de creación (más reciente primero)
git tag --sort=-creatordate

# Los últimos 5 tags
git tag --sort=-creatordate | head -5

# Ver commit y fecha de cada tag
git log --tags --simplify-by-decoration --pretty="format:%d %ai" | grep "tag:"
```
