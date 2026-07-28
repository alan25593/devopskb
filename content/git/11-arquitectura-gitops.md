---
title: "Arquitectura GitOps y Estrategias de Repositorios"
category: "GitOps"
tags: ["gitops", "monorepo", "polyrepo", "arquitectura"]
description: "Diseño de repositorios para GitOps: Monorepo vs Polyrepo y cómo estructurar tus entornos."
---

# Arquitectura GitOps: Monorepo vs Polyrepo 🏗️

¿Qué tal? Cuando implementamos GitOps (con ArgoCD, Flux, Atlantis, etc.), el repositorio Git deja de ser solo un "lugar para guardar código" y pasa a ser la **única fuente de verdad** del estado de la infraestructura y las aplicaciones. Si se cae todo, deberías poder reconstruir la empresa entera haciendo un `git clone`.

El debate eterno: ¿Ponemos todo en un solo repo masivo o separamos todo en mini repos?

## Polyrepo (Múltiples repositorios)

Es la estructura más tradicional. Tienes un repo por microservicio y repos separados para la infraestructura.

### Pros
- **Permisos granulares:** El equipo Frontend solo tiene acceso a `repo-frontend`.
- **CI simple:** Si hay un push en `repo-backend`, sabes que solo tienes que buildear el backend.
- **Git más rápido:** Clonar y fetchear no consume recursos.

### Contras
- **Dependencias infernales:** Si cambias un contrato de API, tienes que coordinar PRs en 3 repos distintos a la vez.
- **GitOps fragmentado:** Para auditar el estado actual de tu entorno `producción`, tienes que scrollear por 20 repositorios distintos.

## Monorepo (Todo en un solo repo)

Google, Meta y muchos usan esto. Un solo repositorio monstruoso que contiene el código de todas las apps, la infraestructura y los manifiestos de Kubernetes.

### Pros
- **Visibilidad total:** Un solo PR puede actualizar el código del microservicio, su Dockerfile y su Helm chart, todo de forma atómica. 
- **Dry/Reutilización:** Compartir librerías y módulos de Terraform es tan fácil como importar una ruta relativa.
- **Auditoría simple:** Toda la historia de la empresa está en un solo `git log`.

### Contras
- **CI Complejo:** Necesitas un pipeline inteligente que detecte qué carpetas cambiaron para no rebuildear toda la empresa con un simple cambio en el README (herramientas como Bazel, Nx o Turborepo ayudan acá).
- **Control de accesos:** Tienes que usar CODEOWNERS agresivamente para que los devs no toquen carpetas de infra.

---

## Patrones recomendados para GitOps (Kubernetes)

Independientemente de si el código de tu app es Monorepo o Polyrepo, para la **configuración (YAMLs/Helm/Kustomize)** te recomiendo separar el código de la app del código de despliegue.

### El patrón de "App Repo" y "Env Repo"

1. **App Repo(s):** Contienen el código fuente, los tests y el Dockerfile. El CI corre acá, compila, y empuja la imagen a un Registry.
2. **Environment/Infra Repo:** Un repositorio centralizado y puramente declarativo. No tiene código fuente, solo manifiestos (Kustomize/Helm).

#### Estructura de un Env Repo típico (Kustomize)
```text
├── base/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── kustomization.yaml
└── overlays/
    ├── dev/
    │   ├── kustomization.yaml
    │   └── patch-replicas.yaml
    ├── staging/
    │   ├── kustomization.yaml
    │   └── patch-resources.yaml
    └── prod/
        ├── kustomization.yaml
        └── patch-hpa.yaml
```

Cuando el "App Repo" termina de compilar la nueva imagen (ej. `v1.2.3`), un bot (o CI) hace un commit automático al "Env Repo" actualizando el tag de la imagen en `overlays/dev/kustomization.yaml`. 

Luego, ArgoCD/Flux detecta el cambio en el Env Repo y sincroniza el cluster. ¡Magia automatizada y auditable!
