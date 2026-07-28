---
title: "GitOps y Continuous Delivery"
category: "Kubernetes"
tags: ["GitOps", "CD", "ArgoCD", "Flux"]
description: "Cómo implementar GitOps y CD en Kubernetes usando Argo CD y Flux."
---

# GitOps y Continuous Delivery (Argo CD / Flux)

¡Qué onda! Hoy vamos a hablar de cómo dejar de meter mano directa a los clusters (sí, deja de usar `kubectl apply -f` desde tu laptop) y empezar a hacer las cosas como se debe: con **GitOps**.

GitOps no es más que la idea de que Git sea tu única fuente de la verdad. Si no está en Git, no existe en tu cluster. Simple.

## ¿Por qué GitOps?

- **Auditoría:** Sabes exactamente quién, cuándo y por qué se rompió algo (gracias al `git blame`).
- **Reproducibilidad:** ¿Se murió el cluster? Levantas otro, apuntas Argo o Flux al repo, y listo. Te vas a tomar un café mientras se sincroniza.
- **Seguridad:** Tus devs solo necesitan acceso a Git, no al cluster de K8s.

## Argo CD: El rey del UI

Argo CD es una bestia. Es súper visual, y a la gente le encanta ver cómo los cuadraditos se ponen verdes. Se instala dentro del cluster y está constantemente comparando el estado de tu repo de Git con lo que hay corriendo en K8s.

### Ejemplo: Desplegando una App con Argo CD

Así se ve un manifiesto de tipo `Application` en Argo:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: mi-app-super-cool
  namespace: argocd
spec:
  project: default
  source:
    repoURL: 'https://github.com/mi-org/mi-repo-gitops.git'
    path: apps/mi-app/overlays/prod
    targetRevision: HEAD
  destination:
    server: 'https://kubernetes.default.svc'
    namespace: prod
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

Si le pones `selfHeal: true`, si alguien entra al cluster a borrar un pod o cambiar un deployment a mano, Argo CD va a decir "¡Ah, no! Esto no está en Git" y lo va a sobreescribir al instante. Brutal.

## Flux CD: Minimalista y poderoso

Flux es otra alternativa excelente. Nació en Weaveworks y, a diferencia de Argo, no tiene una UI pesada de entrada (aunque puedes instalarle cosas como Weave GitOps). Es muy modular y se basa en Custom Resource Definitions (CRDs).

```bash
# Para instalar Flux en tu cluster y conectarlo a GitHub en un solo comando:
flux bootstrap github \
  --owner=mi-usuario-github \
  --repository=mi-repo-gitops \
  --branch=main \
  --path=./clusters/my-cluster \
  --personal
```

Ese comandito te instala Flux, crea el repo (si no existe), y configura las llaves de despliegue. Magia pura.

## Consejos del Techlead

1. **Separa tu código de tu infraestructura:** No pongas tus manifiestos de K8s o Helm Charts en el mismo repo que el código fuente de tu app (Java, Node, etc.). Ten un repo `app-backend` y un repo `gitops-infra`.
2. **Kustomize o Helm:** Usa uno de los dos para manejar las diferencias entre entornos (dev, staging, prod). No copies y pegues YAMLs a lo bruto. Argo y Flux soportan ambos nativamente.

¡Dale una chance a GitOps, vas a dormir más tranquilo por las noches!
