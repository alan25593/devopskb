---
title: "Git LFS y Mantenimiento de Repositorios"
category: "Git Avanzado"
tags: ["git", "lfs", "mantenimiento", "git-filter-repo", "bfg"]
description: "Cómo manejar archivos grandes en Git y limpiar el historial de repos pesados."
---

# Git LFS y Mantenimiento de Repos 🧹

¿Qué onda? Si estás acá, seguro se te llenó el repo de binarios gigantes o alguien subió un `.iso` por accidente y ahora cada `git clone` tarda la vida entera. Vamos a arreglar eso como pros.

## Git LFS (Large File Storage)

Git no está hecho para manejar binarios pesados (imágenes, bases de datos de prueba, modelos de ML, etc). Cada vez que modificas un binario, Git guarda una copia completa. A la larga, tu `.git/` explota. Para eso usamos LFS, que cambia los archivos grandes por "punteros" de texto en Git, y guarda los verdaderos archivos en un server aparte.

### Instalación y setup rápido

```bash
# Instalalo a nivel de sistema (solo lo haces una vez)
git lfs install

# Dile a Git qué archivos trackear con LFS (ej. todos los .psd y .mp4)
git lfs track "*.psd"
git lfs track "*.mp4"

# Esto genera o actualiza un archivo .gitattributes, agrégalo a tu commit
git add .gitattributes
git commit -m "build: setup git lfs para psd y mp4"
```

## Limpieza profunda: BFG y git-filter-repo

Supongamos que alguien *ya subió* archivos gigantes y quieres sacarlos de la historia (porque Git nunca olvida). No uses `git filter-branch` (es súper lento y peligroso). Usa **git-filter-repo** (la herramienta oficial recomendada ahora) o **BFG Repo-Cleaner**.

### Usando git-filter-repo

Es un script de Python brutal para reescribir la historia.

```bash
# OJO: Trabaja siempre en un clon fresco y sin ramas locales raras
git clone --mirror git@github.com:tu-org/tu-repo.git
cd tu-repo.git

# Eliminar todos los archivos mayores a 50MB
git filter-repo --strip-blobs-bigger-than 50M

# O eliminar un archivo/directorio específico con passwords o basura
git filter-repo --path "configs/secrets.yml" --invert-paths

# Forzar el push de la nueva historia (avísale a todo el equipo que tendrán que clonar de nuevo)
git push --force
```

### Usando BFG Repo-Cleaner

Si te da pereza instalar dependencias de Python, BFG es un .jar hecho en Scala, súper rápido y fácil.

```bash
# Descarga bfg.jar
java -jar bfg.jar --strip-blobs-bigger-than 50M tu-repo.git

# Luego limpias la reflog y corres el Garbage Collector de git
cd tu-repo.git
git reflog expire --expire=now --all && git gc --prune=now --aggressive
```

> [!WARNING]
> Cuando reescribes el historial, los hashes de los commits cambian. Si tu equipo está trabajando en ramas basadas en la historia vieja, van a tener dolores de cabeza al hacer pull/push. Coordinen un freeze de código, limpien el repo y pidan a todos que clonen de cero. ¡Avisados están!
