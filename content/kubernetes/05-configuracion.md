---
title: "Kubernetes Configuración: ConfigMaps, Secrets y Variables de Entorno"
category: "kubernetes"
tags: ["configmap", "secrets", "configuracion", "env", "volumes"]
keywords: ["configmap kubernetes", "secret kubernetes", "variable entorno kubernetes", "montar configmap volumen", "montar secret volumen", "secret base64", "crear secret kubernetes", "crear configmap kubernetes", "env from configmap", "env from secret", "secret tls kubernetes", "secret docker registry", "sealed secrets", "external secrets"]
description: "Gestión de configuración en Kubernetes: creación de ConfigMaps y Secrets, inyección como variables de entorno y montaje como volúmenes, con alternativas seguras para producción."
---

# Configuración en Kubernetes

## Contenido

- [ConfigMap — configuración no sensible](#configmap-—-configuración-no-sensible)
- [Secret — datos sensibles](#secret-—-datos-sensibles)
- [Inyección como variables de entorno](#inyección-como-variables-de-entorno)
- [Montaje como volúmenes](#montaje-como-volúmenes)
- [Alternativas seguras para producción](#alternativas-seguras-para-producción)

---

## ConfigMap — configuración no sensible

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: mi-app
data:
  # Variables simples
  DB_HOST: "postgres.databases.svc.cluster.local"
  DB_PORT: "5432"
  LOG_LEVEL: "info"

  # Archivo de configuración completo
  app.conf: |
    server:
      port: 3000
      timeout: 30s
    cache:
      ttl: 300
      max_size: 1000
```

```bash
# Crear desde archivos
kubectl create configmap app-config \
  --from-file=app.conf \
  --from-file=nginx.conf \
  -n mi-app

# Crear desde valores literales
kubectl create configmap app-config \
  --from-literal=DB_HOST=postgres \
  --from-literal=LOG_LEVEL=info \
  -n mi-app

# Ver el contenido
kubectl get configmap app-config -n mi-app -o yaml
```

---

## Secret — datos sensibles

Los Secrets se almacenan en base64 en etcd. **No es encriptación** — es encoding. Para producción, usar etcd encryption at rest o soluciones externas (Vault, Sealed Secrets, External Secrets).

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: mi-app
type: Opaque
data:
  # Valores en base64: echo -n "valor" | base64
  DB_PASSWORD: c3VwZXJzZWNyZXQxMjM=
  API_KEY: bXktYXBpLWtleS12YWx1ZQ==
stringData:
  # stringData se convierte automáticamente a base64
  JWT_SECRET: "mi-jwt-secret-muy-largo"
```

```bash
# Crear secret desde literales
kubectl create secret generic app-secrets \
  --from-literal=DB_PASSWORD=supersecret \
  --from-literal=API_KEY=mi-api-key \
  -n mi-app

# Crear desde archivo .env
kubectl create secret generic app-secrets \
  --from-env-file=.env \
  -n mi-app

# Secret para registry privado
kubectl create secret docker-registry regcred \
  --docker-server=123456789.dkr.ecr.us-east-1.amazonaws.com \
  --docker-username=AWS \
  --docker-password=$(aws ecr get-login-password) \
  -n mi-app

# Secret para TLS
kubectl create secret tls mi-tls-secret \
  --cert=tls.crt \
  --key=tls.key \
  -n mi-app

# Ver un secret (decodificado)
kubectl get secret app-secrets -n mi-app -o jsonpath='{.data.DB_PASSWORD}' | base64 -d
```

---

## Inyección como variables de entorno

```yaml
spec:
  containers:
    - name: app
      image: mi-app:v1.2.0

      # Variable individual desde ConfigMap
      env:
        - name: DB_HOST
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: DB_HOST

        # Variable individual desde Secret
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: DB_PASSWORD

        # Variable del downward API (info del propio Pod)
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName

      # Todas las variables de un ConfigMap de una vez
      envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets
```

---

## Montaje como volúmenes

Útil para archivos de configuración completos (nginx.conf, app.yaml, etc.).

```yaml
spec:
  volumes:
    - name: config-vol
      configMap:
        name: app-config
    - name: secrets-vol
      secret:
        secretName: app-secrets
        defaultMode: 0400    # permisos del archivo (solo lectura para owner)

  containers:
    - name: app
      volumeMounts:
        # Monta todo el ConfigMap como archivos en /etc/config/
        - name: config-vol
          mountPath: /etc/config
          readOnly: true

        # Monta solo una key específica
        - name: config-vol
          mountPath: /etc/nginx/nginx.conf
          subPath: nginx.conf    # solo esta key, no todo el ConfigMap

        # Monta los secrets
        - name: secrets-vol
          mountPath: /run/secrets
          readOnly: true
```

Los archivos montados desde ConfigMaps/Secrets se actualizan automáticamente cuando el recurso cambia (con un delay de ~1 minuto). Las variables de entorno **no** se actualizan — requieren reinicio del Pod.

---

## Alternativas seguras para producción

### Sealed Secrets (Bitnami)

Encripta los Secrets con una clave del cluster. Se puede commitear el SealedSecret al repo (el Secret solo se puede descifrar dentro del cluster).

```bash
# Instalar kubeseal
brew install kubeseal

# Sellar un secret existente
kubectl create secret generic app-secrets \
  --from-literal=DB_PASSWORD=supersecret \
  --dry-run=client -o yaml \
  | kubeseal --format yaml > sealed-secret.yaml

# Ahora sealed-secret.yaml es seguro para commitear
kubectl apply -f sealed-secret.yaml
```

### External Secrets Operator

Sincroniza Secrets desde AWS Secrets Manager, HashiCorp Vault, GCP Secret Manager, etc.

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
  namespace: mi-app
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: app-secrets
    creationPolicy: Owner
  data:
    - secretKey: DB_PASSWORD
      remoteRef:
        key: prod/mi-app/secrets
        property: db_password
    - secretKey: API_KEY
      remoteRef:
        key: prod/mi-app/secrets
        property: api_key
```
