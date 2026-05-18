# DevOps KB

Base de conocimiento técnica para equipos DevOps. Búsqueda rápida y offline de comandos, guías de troubleshooting y patrones de arquitectura para Docker, Kubernetes, Git y Terraform.

Funciona 100% offline — sin base de datos, sin backend, sin dependencias externas en runtime.

---

## Características

- **Búsqueda en lenguaje natural** — busca "frenar un contenedor" y encuentra `docker compose stop`
- **Offline-first** — todo el índice corre en el navegador (FlexSearch), sin requests externos
- **Atajo de teclado** — `Ctrl+K` para abrir la búsqueda desde cualquier vista
- **Copy-to-clipboard** — un clic para copiar cualquier bloque de código
- **Navegación prev/next** — entre artículos de la misma categoría
- **Responsive** — sidebar adaptado a móvil con menú hamburger
- **Sin autenticación** — wiki interna de acceso libre

### Categorías

| Categoría | Artículos |
|-----------|-----------|
| Docker | 7 |
| Kubernetes | 10 |
| Git | 6 |
| Terraform | 9 |

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 14 (App Router, static export) |
| UI | React 18 + Tailwind CSS 3 |
| Búsqueda | FlexSearch 0.7 (client-side) |
| Markdown | gray-matter + react-markdown + remark-gfm |
| Iconos | simple-icons |
| Lenguaje | TypeScript 5 |
| Salida | HTML/CSS/JS estático en `/out` |

---

## Levantar el proyecto

### Opción 1 — Docker (recomendado)

No requiere Node.js ni ninguna dependencia local. Solo Docker instalado.

```bash
git clone https://github.com/alan25593/devopskb.git
cd devopskb
docker compose up -d
```

Abre [http://localhost:8080](http://localhost:8080).

Detener:
```bash
docker compose down
```

Reconstruir luego de agregar contenido:
```bash
docker compose up -d --build
```

> El `Dockerfile` incluido hace el build de Next.js dentro del contenedor (multi-stage) y sirve el resultado con nginx:alpine. No requiere que tengas nada instalado localmente.

---

### Opción 2 — Local con pnpm

**Requisitos:** Node.js 20+, pnpm

```bash
git clone https://github.com/alan25593/devopskb.git
cd devopskb
pnpm install
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000).

---

### Opción 3 — Local con npm

**Requisitos:** Node.js 20+

```bash
git clone https://github.com/alan25593/devopskb.git
cd devopskb
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

---

### Build de producción (sin Docker)

```bash
pnpm build   # genera /out con HTML/CSS/JS estático
pnpm start   # sirve el build localmente
```

---

## Estructura del proyecto

```
knowdb/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                         # Página principal con búsqueda
│   └── article/[category]/[slug]/
│       └── page.tsx                     # Vista de artículo individual
├── components/
│   ├── SearchPage.tsx                   # UI de búsqueda + FlexSearch
│   ├── ArticleView.tsx                  # Renderizado markdown
│   ├── Sidebar.tsx                      # Navegación lateral
│   └── CategoryTag.tsx                  # Badge de categoría
├── lib/
│   ├── content.ts                       # Carga de archivos markdown
│   └── categories.ts                    # Definición de categorías e iconos
├── content/
│   ├── docker/        (7 artículos)
│   ├── git/           (6 artículos)
│   ├── kubernetes/    (10 artículos)
│   └── terraform/     (9 artículos)
├── Dockerfile
└── docker-compose.yml
```

---

## Agregar contenido

Los artículos son archivos `.md` dentro de `content/<categoria>/`. El nombre del archivo define el slug de la URL.

**Ejemplo:** `content/docker/08-multi-stage.md`

```markdown
---
title: "Builds multi-stage"
category: "docker"
tags: ["dockerfile", "optimización", "capas"]
keywords: ["reducir tamaño de imagen", "multi-stage build", "imagen liviana"]
description: "Cómo usar builds multi-stage para reducir el tamaño final de una imagen Docker."
---

## Concepto

...
```

Los `keywords` son frases en lenguaje natural que alimentan el índice de búsqueda. Mientras más descriptivos, mejor funciona la búsqueda semántica.
---

## Contribuir

Las modificaciones requieren aprobación del code owner (`@alan25593`). Ver `.github/CODEOWNERS`.

1. Crear una rama: `git checkout -b feat/nueva-categoria`
2. Agregar o modificar artículos en `content/`
3. Abrir un Pull Request hacia `master`
