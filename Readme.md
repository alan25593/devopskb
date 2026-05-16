
```markdown
# 🧠 DevOps Knowledge Base (KB)

Este proyecto es una Base de Conocimiento (KB) técnica, optimizada para desarrollarse y consultarse **100% de forma local y offline**. Está diseñada para buscar y encontrar comandos, arquitecturas y soluciones de infraestructura de forma ultra eficiente.

Construida con **Next.js**, **Tailwind CSS** y un motor de búsqueda indexado local (**FlexSearch**).

---

## 🛠️ Stack Tecnológico

*   **Framework:** Next.js (App Router / Static Export)
*   **Estilos:** Tailwind CSS
*   **Búsqueda:** FlexSearch (Indexación semántica/fuzzy en cliente)
*   **Contenido:** Archivos Markdown (`.md`) con Frontmatter

---

## 📂 Estructura del Proyecto y Paths

La documentación se organiza de forma modular en la carpeta `/content`. El buscador indexará tanto el contenido como las palabras clave definidas en cada archivo.

```text
.
├── /apps                 # Código fuente de Next.js
├── /components           # Componentes de la UI (Searchbar, Layout, Sidebar)
├── /content              # Base de datos de conocimiento (Markdown)
│   ├── /git
│   │   ├── comandos-utiles.md
│   │   └── troubleshooting.md
│   ├── /docker
│   │   ├── docker-compose-tips.md
│   │   └── optimizacion-imagenes.md
│   ├── /kubernetes
│   │   ├── pods-troubleshooting.md
│   │   └── cluster-architecture.md
│   └── /terraform
│       ├── state-management.md
│       └── buenas-practicas.md
├── /public               # Assets estáticos
└── README.md

```

---

## 🔍 Estructura de un Documento (Clave para el Buscador)

Para que búsquedas naturales como *"como frenaba un solo contenedor de un compose"* funcionen de manera eficaz, cada archivo `.md` debe incluir un bloque de **Frontmatter** con `keywords` y `category`.

### Ejemplo de `/content/docker/docker-compose-tips.md`:

```markdown
---
title: "Frenar un contenedor específico en Docker Compose"
category: "Docker"
tags: ["docker-compose", "containers", "stop"]
keywords: ["frenar un solo contenedor", "apagar service compose", "detener", "down"]
description: "Comandos para manipular un único servicio dentro de un stack de docker-compose sin afectar al resto."
---

# Manipulación de Servicios Individuales en Compose

Si tenés un stack corriendo y querés frenar únicamente **un** contenedor, usás el nombre del servicio definido en el archivo `docker-compose.yml`.

### Frenar el contenedor sin borrarlo:
```bash
docker compose stop <nombre-del-servicio>

```

### Frenar y remover el contenedor:

```bash
docker compose rm -f -s <nombre-del-servicio>

```

```

---

## 🚀 Configuración del Buscador Local (FlexSearch)

El buscador utiliza **FlexSearch** en modo `document`. Configuralo en tu componente de búsqueda de Next.js para que indexe los campos clave:

```javascript
import { Index } from "flexsearch";

const index = new Index({
  tokenize: "forward", // Permite buscar coincidencias parciales
  language: "es",      // Optimiza para el idioma español
});

// Al cargar la app (u offline mediante un JSON pre-construido)
index.add(id, `${title} ${category} ${keywords.join(" ")} ${content}`);

```

---

## 💻 Desarrollo Local

### Prerrequisitos

* Node.js (v18 o superior)
* pnpm / npm / yarn

### 1. Clonar e instalar dependencias

```bash
cd apps
npm install

```

### 2. Correr en modo desarrollo

```bash
npm run dev

```

Abrir [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000) en el navegador.

### 3. Buildear para uso offline estático

Este comando genera una carpeta `/out` con HTML/JS/CSS puros que podés levantar con cualquier servidor local (incluso un contenedor Docker simple o doble click al `index.html` si está configurado en modo asset relativo).

```bash
npm run build

```

---

## 🐳 Despliegue Local Rápido (Opcional con Docker)

Si querés dejar la KB corriendo en tu servidor local de forma fija sin dependencias de Node:

```bash
docker run -d \
  --name devops-kb \
  -p 8080:80 \
  -v $(pwd)/out:/usr/share/nginx/html:ro \
  nginx:alpine

```

```

---

### 💡 Tip para que el buscador sea "inteligente":
Cuando crees el hook de búsqueda en Next.js, hacé que **FlexSearch** priorice (tenga más peso/score) el campo `keywords` y `title` sobre el cuerpo del texto (`content`). Así, cuando busques "frenar", va a matchear directo con las intenciones de Docker que configuraste en los metadatos antes que con una palabra random perdida en un tutorial de Kubernetes.

```