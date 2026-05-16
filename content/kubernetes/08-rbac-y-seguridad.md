---
title: "Kubernetes RBAC y Seguridad: Roles, ServiceAccounts y PodSecurity"
category: "kubernetes"
tags: ["rbac", "seguridad", "serviceaccount", "roles", "podsecurity"]
keywords: ["rbac kubernetes", "role kubernetes", "clusterrole kubernetes", "rolebinding kubernetes", "serviceaccount kubernetes", "permisos kubernetes", "quien puede hacer que kubernetes", "pod security kubernetes", "pod security admission", "security context kubernetes", "privileged pod", "non-root kubernetes", "kubeconfig usuario", "auditar permisos kubernetes"]
description: "Control de acceso basado en roles en Kubernetes: Roles, ClusterRoles, ServiceAccounts y configuración de seguridad de Pods para minimizar la superficie de ataque."
---

# RBAC y Seguridad en Kubernetes

## Contenido

- [Cómo funciona RBAC](#cómo-funciona-rbac)
- [Role y ClusterRole](#role-y-clusterrole)
- [RoleBinding y ClusterRoleBinding](#rolebinding-y-clusterrolebinding)
- [ServiceAccount — identidad para Pods](#serviceaccount-—-identidad-para-pods)
- [Security Context — hardening del Pod](#security-context-—-hardening-del-pod)
- [Pod Security Admission (k8s 1.25+)](#pod-security-admission-k8s-125+)
- [Auditar permisos existentes](#auditar-permisos-existentes)

---

## Cómo funciona RBAC

```
Subject (quién)  →  RoleBinding  →  Role (qué puede hacer)  →  Resources (sobre qué)

Subjects:
  - User          → persona con certificado/token externo
  - Group         → grupo de users
  - ServiceAccount → identidad para Pods
```

---

## Role y ClusterRole

- **Role**: permisos dentro de un namespace
- **ClusterRole**: permisos en todo el cluster o sobre recursos sin namespace (Nodes, PV)

```yaml
# Role — solo en el namespace "mi-app"
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: dev-role
  namespace: mi-app
rules:
  - apiGroups: [""]             # "" = core API group
    resources: ["pods", "pods/log", "pods/exec"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "watch", "update", "patch"]
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list"]
```

```yaml
# ClusterRole — acceso de solo lectura en todo el cluster
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cluster-reader
rules:
  - apiGroups: ["*"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]
```

Verbos disponibles: `get`, `list`, `watch`, `create`, `update`, `patch`, `delete`, `deletecollection`, `exec`

---

## RoleBinding y ClusterRoleBinding

```yaml
# RoleBinding — asigna Role a un User en un namespace
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: dev-binding
  namespace: mi-app
subjects:
  - kind: User
    name: "juan@empresa.com"
    apiGroup: rbac.authorization.k8s.io
  - kind: Group
    name: "developers"
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: dev-role
  apiGroup: rbac.authorization.k8s.io
```

```yaml
# ClusterRoleBinding — asigna ClusterRole a nivel global
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: ops-cluster-reader
subjects:
  - kind: Group
    name: "ops-team"
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: cluster-reader
  apiGroup: rbac.authorization.k8s.io
```

```bash
# Comandos rápidos
kubectl create role dev-role \
  --verb=get,list,watch \
  --resource=pods,deployments \
  -n mi-app

kubectl create rolebinding dev-binding \
  --role=dev-role \
  --user=juan@empresa.com \
  -n mi-app

# Verificar permisos de un usuario/serviceaccount
kubectl auth can-i get pods -n mi-app --as=juan@empresa.com
kubectl auth can-i delete deployments -n mi-app --as=juan@empresa.com
kubectl auth can-i '*' '*'   # ¿tengo permisos de admin?

# Ver todos los permisos de un subject
kubectl auth can-i --list --as=juan@empresa.com -n mi-app
```

---

## ServiceAccount — identidad para Pods

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: mi-app-sa
  namespace: mi-app
  annotations:
    # IRSA (AWS) — el SA asume un IAM Role
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789:role/MiAppRole

---
# Asignar el SA al Pod
spec:
  serviceAccountName: mi-app-sa
  automountServiceAccountToken: false   # no montar el token si la app no lo necesita
```

```yaml
# Dar permisos al SA para leer secrets en su namespace
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: secret-reader
  namespace: mi-app
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get", "list"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: mi-app-secret-reader
  namespace: mi-app
subjects:
  - kind: ServiceAccount
    name: mi-app-sa
    namespace: mi-app
roleRef:
  kind: Role
  name: secret-reader
  apiGroup: rbac.authorization.k8s.io
```

---

## Security Context — hardening del Pod

```yaml
spec:
  securityContext:
    runAsNonRoot: true          # falla si la imagen corre como root
    runAsUser: 1000
    runAsGroup: 1000
    fsGroup: 1000               # el volumen montado pertenece a este grupo
    seccompProfile:
      type: RuntimeDefault      # perfil seccomp del runtime

  containers:
    - name: app
      securityContext:
        allowPrivilegeEscalation: false   # no puede obtener más permisos que su padre
        readOnlyRootFilesystem: true       # filesystem de solo lectura
        capabilities:
          drop:
            - ALL               # quitar todas las capabilities de Linux
          add:
            - NET_BIND_SERVICE  # solo agregar las estrictamente necesarias
      volumeMounts:
        - name: tmp
          mountPath: /tmp       # necesario si readOnlyRootFilesystem: true

  volumes:
    - name: tmp
      emptyDir: {}
```

---

## Pod Security Admission (k8s 1.25+)

Reemplaza PodSecurityPolicy. Se configura con labels en el namespace.

```bash
# Niveles: privileged | baseline | restricted
# Modos: enforce (bloquea) | audit (solo loguea) | warn (warning en kubectl)

# Aplicar nivel "restricted" a un namespace
kubectl label namespace mi-app \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/enforce-version=latest \
  pod-security.kubernetes.io/warn=restricted \
  pod-security.kubernetes.io/audit=restricted
```

| Nivel | Qué permite |
|---|---|
| `privileged` | Sin restricciones — para system namespaces |
| `baseline` | Bloquea las configuraciones más peligrosas (hostPID, hostNet, privileged) |
| `restricted` | Hardening completo: non-root, no privilege escalation, seccomp |

---

## Auditar permisos existentes

```bash
# Ver todos los RoleBindings de un namespace
kubectl get rolebindings,clusterrolebindings -A \
  -o custom-columns='BINDING:.metadata.name,NAMESPACE:.metadata.namespace,ROLE:.roleRef.name,SUBJECT:.subjects[*].name'

# Ver qué puede hacer el service account de un Pod
kubectl auth can-i --list \
  --as=system:serviceaccount:mi-app:mi-app-sa \
  -n mi-app

# Herramienta rápida para auditar RBAC
kubectl run rbac-lookup --image=gcr.io/google.com/cloudsdktool/cloud-sdk \
  --rm -it --restart=Never -- \
  kubectl auth can-i --list -n mi-app
```
