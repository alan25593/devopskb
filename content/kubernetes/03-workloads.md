---
title: "Kubernetes Workloads: Pod, Deployment, StatefulSet, DaemonSet, Jobs"
category: "kubernetes"
tags: ["workloads", "pod", "deployment", "statefulset", "daemonset", "job", "cronjob"]
keywords: ["pod kubernetes", "deployment kubernetes", "statefulset kubernetes", "daemonset kubernetes", "job kubernetes", "cronjob kubernetes", "replicaset", "crear deployment", "actualizar deployment", "rollout deployment", "pod spec", "init containers", "sidecar container", "liveness probe", "readiness probe"]
description: "Tipos de workloads en Kubernetes: Pod, Deployment, StatefulSet, DaemonSet, Job y CronJob. Cuándo usar cada uno y cómo configurarlos para producción."
---

# Kubernetes Workloads

## Contenido

- [Pod — la unidad mínima](#pod-—-la-unidad-mínima)
- [Deployment — workload stateless](#deployment-—-workload-stateless)
- [StatefulSet — workload stateful](#statefulset-—-workload-stateful)
- [DaemonSet — un Pod por nodo](#daemonset-—-un-pod-por-nodo)
- [Job — tarea puntual](#job-—-tarea-puntual)
- [CronJob — tarea programada](#cronjob-—-tarea-programada)
- [Probes — health checks](#probes-—-health-checks)

---

## Pod — la unidad mínima

Un Pod es uno o más contenedores que comparten red (misma IP) y almacenamiento. En producción nunca se crea un Pod directamente — siempre a través de un controller (Deployment, StatefulSet, etc.).

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: mi-pod
  namespace: mi-app
  labels:
    app: mi-app
    version: v1
spec:
  containers:
    - name: app
      image: mi-app:v1.2.0
      ports:
        - containerPort: 3000
      resources:
        requests:
          cpu: "100m"
          memory: "128Mi"
        limits:
          cpu: "500m"
          memory: "512Mi"
      env:
        - name: DB_HOST
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: db_host
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: db_password
      livenessProbe:
        httpGet:
          path: /health
          port: 3000
        initialDelaySeconds: 15
        periodSeconds: 10
        failureThreshold: 3
      readinessProbe:
        httpGet:
          path: /ready
          port: 3000
        initialDelaySeconds: 5
        periodSeconds: 5
```

### Init Containers

Corren antes que los containers principales. El Pod no arranca hasta que todos los init containers terminan con éxito.

```yaml
spec:
  initContainers:
    - name: wait-for-db
      image: busybox
      command: ['sh', '-c', 'until nc -z postgres 5432; do sleep 2; done']
    - name: run-migrations
      image: mi-app:v1.2.0
      command: ['node', 'migrate.js']
  containers:
    - name: app
      image: mi-app:v1.2.0
```

### Sidecar Containers (k8s 1.29+)

```yaml
spec:
  initContainers:
    - name: log-collector
      image: fluent-bit:latest
      restartPolicy: Always    # lo que lo convierte en sidecar nativo
  containers:
    - name: app
      image: mi-app:v1.2.0
```

---

## Deployment — workload stateless

El controller más usado. Gestiona ReplicaSets para garantizar N réplicas de un Pod, con rolling updates y rollback.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mi-app
  namespace: mi-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mi-app
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1     # máximo de pods no disponibles durante el update
      maxSurge: 1           # máximo de pods adicionales durante el update
  template:
    metadata:
      labels:
        app: mi-app
        version: v1.2.0
    spec:
      containers:
        - name: app
          image: mi-app:v1.2.0
          resources:
            requests:
              cpu: "100m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 15
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
      terminationGracePeriodSeconds: 30
```

Estrategias de deployment:

| Estrategia | Comportamiento | Cuándo usarla |
|---|---|---|
| `RollingUpdate` | Reemplaza pods gradualmente | Default, zero-downtime |
| `Recreate` | Baja todos los pods, luego levanta los nuevos | Apps que no toleran 2 versiones simultáneas |

---

## StatefulSet — workload stateful

Para aplicaciones que necesitan identidad estable (hostname fijo) y almacenamiento persistente por réplica: bases de datos, caches, Kafka, Elasticsearch.

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: databases
spec:
  serviceName: postgres-headless   # headless service requerido
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:16-alpine
          env:
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: password
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: gp3
        resources:
          requests:
            storage: 20Gi
```

Diferencias clave vs Deployment:
- Los pods se nombran con índice fijo: `postgres-0`, `postgres-1`, `postgres-2`
- Se crean y destruyen en orden (0 → 1 → 2 para crear, 2 → 1 → 0 para destruir)
- Cada pod tiene su propio PVC que se mantiene aunque el pod se recree

---

## DaemonSet — un Pod por nodo

Garantiza que todos (o algunos) nodos corran una copia del Pod. Ideal para agentes de monitoreo, log collectors, plugins de red.

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: node-exporter
  template:
    metadata:
      labels:
        app: node-exporter
    spec:
      tolerations:
        - key: node-role.kubernetes.io/control-plane
          effect: NoSchedule    # también en nodos master
      hostPID: true
      hostNetwork: true
      containers:
        - name: node-exporter
          image: prom/node-exporter:latest
          ports:
            - containerPort: 9100
              hostPort: 9100
          volumeMounts:
            - name: proc
              mountPath: /host/proc
              readOnly: true
      volumes:
        - name: proc
          hostPath:
            path: /proc
```

---

## Job — tarea puntual

Crea uno o más Pods y garantiza que un número específico complete exitosamente.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
  namespace: mi-app
spec:
  completions: 1
  parallelism: 1
  backoffLimit: 3         # reintentos antes de marcar como failed
  activeDeadlineSeconds: 300   # timeout total del job
  template:
    spec:
      restartPolicy: OnFailure  # Never o OnFailure (no Always)
      containers:
        - name: migration
          image: mi-app:v1.2.0
          command: ["node", "migrate.js"]
          env:
            - name: DB_HOST
              valueFrom:
                configMapKeyRef:
                  name: app-config
                  key: db_host
```

---

## CronJob — tarea programada

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup-diario
  namespace: databases
spec:
  schedule: "0 2 * * *"          # todos los días a las 2am
  concurrencyPolicy: Forbid       # no lanzar nuevo si el anterior sigue corriendo
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  startingDeadlineSeconds: 60     # cancelar si no arranca en 60s
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: backup
              image: postgres:16-alpine
              command:
                - sh
                - -c
                - pg_dump -h $DB_HOST -U $DB_USER $DB_NAME | gzip > /backup/$(date +%Y%m%d).sql.gz
```

```bash
# Disparar un CronJob manualmente (crear un Job desde su template)
kubectl create job backup-manual \
  --from=cronjob/backup-diario \
  -n databases
```

---

## Probes — health checks

| Probe | Cuándo falla | Consecuencia |
|---|---|---|
| `livenessProbe` | La app está bloqueada o en estado irrecuperable | Kubernetes reinicia el contenedor |
| `readinessProbe` | La app está iniciando o temporalmente no puede atender | Se saca del load balancer (sin reinicio) |
| `startupProbe` | La app tarda mucho en arrancar | Desactiva liveness/readiness hasta que pase |

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 15
  periodSeconds: 10
  failureThreshold: 3
  timeoutSeconds: 5

readinessProbe:
  httpGet:
    path: /ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
  failureThreshold: 3

startupProbe:
  httpGet:
    path: /health
    port: 3000
  failureThreshold: 30    # 30 * 10s = 5 min para arrancar
  periodSeconds: 10
```
