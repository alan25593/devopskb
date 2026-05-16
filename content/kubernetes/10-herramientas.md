---
title: "Kubernetes Herramientas: Helm, k9s, kubectx, Kustomize y más"
category: "kubernetes"
tags: ["helm", "k9s", "kubectx", "kustomize", "herramientas", "productividad"]
keywords: ["helm kubernetes", "helm chart", "instalar helm chart", "helm upgrade", "helm rollback", "k9s kubernetes", "kubectx kubens", "kustomize kubernetes", "lens kubernetes", "herramientas kubernetes", "kubectl plugins", "krew kubectl", "stern logs kubernetes", "velero backup kubernetes", "helm values"]
description: "Herramientas esenciales para operar Kubernetes: Helm para gestionar aplicaciones, k9s y Lens para visualización, kubectx/kubens para navegación rápida y Kustomize para gestión de manifiestos."
---

# Herramientas para Kubernetes

## Contenido

- [Helm — gestor de paquetes de Kubernetes](#helm-—-gestor-de-paquetes-de-kubernetes)
- [kubectx y kubens — cambio rápido de cluster y namespace](#kubectx-y-kubens-—-cambio-rápido-de-cluster-y-namespace)
- [k9s — TUI para Kubernetes](#k9s-—-tui-para-kubernetes)
- [Kustomize — gestión de manifiestos sin templates](#kustomize-—-gestión-de-manifiestos-sin-templates)
- [Stern — logs multi-Pod en tiempo real](#stern-—-logs-multi-pod-en-tiempo-real)
- [Krew — plugin manager para kubectl](#krew-—-plugin-manager-para-kubectl)
- [Velero — backup y restore del cluster](#velero-—-backup-y-restore-del-cluster)

---

## Helm — gestor de paquetes de Kubernetes

Helm empaqueta manifiestos de Kubernetes en **Charts** reutilizables y versionados. Un `helm install` despliega un conjunto completo de recursos configurables.

```bash
# Instalar Helm
brew install helm

# Agregar un repositorio de charts
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Buscar charts disponibles
helm search repo nginx
helm search hub postgresql    # busca en Artifact Hub

# Ver los valores configurables de un chart
helm show values bitnami/postgresql
helm show values bitnami/postgresql > values.yaml   # guardar para editar
```

### Instalar y gestionar releases

```bash
# Instalar con valores por defecto
helm install mi-postgres bitnami/postgresql -n databases --create-namespace

# Instalar con valores personalizados
helm install mi-postgres bitnami/postgresql \
  -n databases \
  --create-namespace \
  -f my-values.yaml \
  --set auth.postgresPassword=supersecret \
  --set primary.persistence.size=20Gi

# Ver releases instalados
helm list -A

# Ver estado de un release
helm status mi-postgres -n databases

# Actualizar un release (aplica nuevos values o nueva versión del chart)
helm upgrade mi-postgres bitnami/postgresql \
  -n databases \
  -f my-values.yaml \
  --set image.tag=16.1.0

# Upgrade o install en un solo comando
helm upgrade --install mi-postgres bitnami/postgresql \
  -n databases \
  --create-namespace \
  -f my-values.yaml

# Ver el historial de revisiones
helm history mi-postgres -n databases

# Rollback a una revisión anterior
helm rollback mi-postgres 2 -n databases

# Desinstalar
helm uninstall mi-postgres -n databases
```

### Crear un chart propio

```bash
helm create mi-app
```

Estructura:
```
mi-app/
├── Chart.yaml         # metadata del chart (nombre, versión, descripción)
├── values.yaml        # valores por defecto
├── charts/            # dependencias (sub-charts)
└── templates/
    ├── deployment.yaml
    ├── service.yaml
    ├── ingress.yaml
    ├── _helpers.tpl   # funciones y helpers reutilizables
    └── NOTES.txt      # mensaje post-install
```

```yaml
# values.yaml
replicaCount: 3
image:
  repository: mi-app
  tag: "v1.2.0"
  pullPolicy: IfNotPresent
service:
  type: ClusterIP
  port: 80
ingress:
  enabled: true
  host: api.empresa.com
resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 256Mi
```

```bash
# Validar el chart (renderizar y verificar)
helm lint mi-app/
helm template mi-app/ -f custom-values.yaml

# Instalar el chart local
helm install mi-release ./mi-app/ -f prod-values.yaml -n produccion
```

---

## kubectx y kubens — cambio rápido de cluster y namespace

```bash
# Instalar
brew install kubectx    # instala tanto kubectx como kubens

# kubectx — cambiar de cluster
kubectx                         # listar contexts
kubectx mi-cluster-prod         # cambiar a prod
kubectx -                       # volver al context anterior

# kubens — cambiar de namespace
kubens                          # listar namespaces
kubens mi-app                   # cambiar al namespace mi-app
kubens -                        # volver al namespace anterior
```

---

## k9s — TUI para Kubernetes

Terminal UI interactiva para navegar y operar el cluster sin tipear comandos.

```bash
# Instalar
brew install k9s

# Iniciar
k9s
k9s -n mi-app              # abrir en un namespace específico
k9s --context prod-cluster  # con un context específico
```

Shortcuts dentro de k9s:

| Tecla | Acción |
|---|---|
| `:pod` | Ver Pods |
| `:deploy` | Ver Deployments |
| `:svc` | Ver Services |
| `:ns` | Ver Namespaces |
| `l` | Ver logs del Pod seleccionado |
| `s` | Shell en el Pod |
| `d` | Describe el recurso |
| `e` | Editar el recurso (YAML) |
| `ctrl+d` | Eliminar recurso |
| `/` | Filtrar por nombre |
| `?` | Ayuda con todos los shortcuts |

---

## Kustomize — gestión de manifiestos sin templates

Kustomize permite personalizar manifiestos base para distintos entornos sin usar templates (viene integrado en kubectl).

```
k8s/
├── base/
│   ├── kustomization.yaml
│   ├── deployment.yaml
│   └── service.yaml
└── overlays/
    ├── dev/
    │   └── kustomization.yaml
    ├── staging/
    │   └── kustomization.yaml
    └── prod/
        ├── kustomization.yaml
        └── replicas-patch.yaml
```

```yaml
# base/kustomization.yaml
resources:
  - deployment.yaml
  - service.yaml

commonLabels:
  app: mi-app
  managed-by: kustomize
```

```yaml
# overlays/prod/kustomization.yaml
bases:
  - ../../base

namespace: produccion

images:
  - name: mi-app
    newTag: v1.2.0

patches:
  - path: replicas-patch.yaml

configMapGenerator:
  - name: app-config
    literals:
      - LOG_LEVEL=warn
      - DB_HOST=postgres.databases.svc.cluster.local
```

```yaml
# overlays/prod/replicas-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mi-app
spec:
  replicas: 5
```

```bash
# Ver qué va a aplicar (sin aplicar)
kubectl kustomize overlays/prod/

# Aplicar
kubectl apply -k overlays/prod/

# Con Helm + Kustomize
helm template mi-release ./chart/ | kubectl apply -k -
```

---

## Stern — logs multi-Pod en tiempo real

```bash
brew install stern

# Ver logs de todos los Pods que matchean "mi-app" en tiempo real
stern mi-app -n mi-app

# Con distintos namespaces
stern mi-app --all-namespaces

# Filtrar por label
stern -l app=mi-app -n mi-app

# Solo errores
stern mi-app -n mi-app --include="ERROR|FATAL"
```

---

## Krew — plugin manager para kubectl

```bash
# Instalar Krew
brew install krew

# Buscar plugins
kubectl krew search

# Instalar plugins útiles
kubectl krew install ctx        # kubectx integrado
kubectl krew install ns         # kubens integrado
kubectl krew install neat       # YAML limpio sin campos internos
kubectl krew install who-can    # auditar permisos RBAC
kubectl krew install node-shell # shell en un nodo

# Uso de plugins instalados
kubectl neat get pod mi-pod -o yaml
kubectl who-can delete pods -n mi-app
kubectl node-shell mi-nodo
```

---

## Velero — backup y restore del cluster

```bash
# Instalar CLI
brew install velero

# Backup de todo el namespace
velero backup create mi-app-backup \
  --include-namespaces mi-app \
  --storage-location default

# Backup con snapshot de volúmenes
velero backup create mi-app-backup \
  --include-namespaces mi-app \
  --snapshot-volumes

# Ver backups
velero backup get

# Restore
velero restore create --from-backup mi-app-backup
velero restore get
```
