---
title: "Kubernetes Escalado y Scheduling: HPA, VPA, Affinity y Taints"
category: "kubernetes"
tags: ["escalado", "hpa", "vpa", "scheduling", "affinity", "taints", "resources"]
keywords: ["hpa kubernetes", "horizontal pod autoscaler", "vpa kubernetes", "vertical pod autoscaler", "resource limits kubernetes", "resource requests kubernetes", "affinity kubernetes", "node affinity", "pod affinity", "taints tolerations kubernetes", "priority class kubernetes", "escalado automatico kubernetes", "oom killed kubernetes", "cpu throttling kubernetes"]
description: "Configuración de resources requests/limits, escalado automático con HPA y VPA, scheduling avanzado con affinity y taints/tolerations para controlar dónde y cómo corre cada workload."
---

# Escalado y Scheduling en Kubernetes

## Contenido

- [Resources: Requests y Limits](#resources-requests-y-limits)
- [HPA — Horizontal Pod Autoscaler](#hpa-—-horizontal-pod-autoscaler)
- [VPA — Vertical Pod Autoscaler](#vpa-—-vertical-pod-autoscaler)
- [Node Affinity — atraer Pods a ciertos nodos](#node-affinity-—-atraer-pods-a-ciertos-nodos)
- [Pod Affinity y Anti-Affinity](#pod-affinity-y-anti-affinity)
- [Taints y Tolerations](#taints-y-tolerations)
- [PodDisruptionBudget — proteger la disponibilidad](#poddisruptionbudget-—-proteger-la-disponibilidad)
- [PriorityClass — prioridad de scheduling](#priorityclass-—-prioridad-de-scheduling)

---

## Resources: Requests y Limits

Los resources son la base del scheduler y del autoscaler. **Siempre definirlos en producción.**

```yaml
resources:
  requests:
    cpu: "100m"       # 100 millicores = 0.1 CPU — lo que el scheduler reserva
    memory: "256Mi"   # lo que el scheduler reserva en el nodo
  limits:
    cpu: "500m"       # máximo que puede usar — si supera, se throttlea (no se mata)
    memory: "512Mi"   # máximo — si supera, OOMKilled
```

| | CPU | Memoria |
|---|---|---|
| **Request** | Reserva en el nodo, garantía mínima | Reserva en el nodo |
| **Limit** | Throttling si supera (proceso ralentizado) | OOMKilled si supera (proceso muerto) |

```bash
# Ver el consumo real de CPU/RAM
kubectl top pods -n mi-app
kubectl top pods -n mi-app --sort-by=memory

# Ver OOMKilled en el historial
kubectl describe pod mi-pod -n mi-app | grep -A5 "Last State"
```

### QoS Classes

Kubernetes asigna una clase de QoS a cada Pod según sus resources:

| Clase | Condición | Cuándo se evicta |
|---|---|---|
| `Guaranteed` | requests == limits en todos los containers | Último en evictarse |
| `Burstable` | requests < limits | Intermedio |
| `BestEffort` | Sin requests ni limits | Primero en evictarse |

---

## HPA — Horizontal Pod Autoscaler

Escala el número de réplicas de un Deployment en base a métricas.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: mi-app-hpa
  namespace: mi-app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: mi-app
  minReplicas: 2
  maxReplicas: 20
  metrics:
    # Por CPU
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70    # escala cuando CPU promedio > 70% del request

    # Por memoria
    - type: Resource
      resource:
        name: memory
        target:
          type: AverageValue
          averageValue: 400Mi

    # Por métrica custom (requiere custom metrics adapter)
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "100"

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60     # espera 60s antes de otro scale up
      policies:
        - type: Pods
          value: 4
          periodSeconds: 60              # máximo 4 pods por minuto
    scaleDown:
      stabilizationWindowSeconds: 300    # espera 5 min antes de scale down
      policies:
        - type: Percent
          value: 25
          periodSeconds: 60             # máximo 25% por minuto
```

```bash
# Ver estado del HPA
kubectl get hpa -n mi-app
kubectl describe hpa mi-app-hpa -n mi-app
```

---

## VPA — Vertical Pod Autoscaler

Ajusta automáticamente los requests/limits de CPU y memoria según el uso real.

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: mi-app-vpa
  namespace: mi-app
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: mi-app
  updatePolicy:
    updateMode: "Auto"    # Off (solo recomendaciones) | Initial | Auto
  resourcePolicy:
    containerPolicies:
      - containerName: app
        minAllowed:
          cpu: "50m"
          memory: "64Mi"
        maxAllowed:
          cpu: "2"
          memory: "2Gi"
```

```bash
# Ver las recomendaciones del VPA
kubectl describe vpa mi-app-vpa -n mi-app
```

> HPA y VPA no se usan juntos sobre CPU (conflicto). Usar HPA para CPU/requests custom y VPA en modo `Off` para recomendaciones.

---

## Node Affinity — atraer Pods a ciertos nodos

```yaml
spec:
  affinity:
    nodeAffinity:
      # Regla obligatoria — Pod no se schedula si no hay match
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
          - matchExpressions:
              - key: kubernetes.io/arch
                operator: In
                values: ["amd64"]
              - key: topology.kubernetes.io/zone
                operator: In
                values: ["us-east-1a", "us-east-1b"]

      # Regla preferencial — intenta pero no obliga
      preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 80
          preference:
            matchExpressions:
              - key: node.kubernetes.io/instance-type
                operator: In
                values: ["m5.large", "m5.xlarge"]
```

---

## Pod Affinity y Anti-Affinity

```yaml
spec:
  affinity:
    # Anti-affinity: distribuir réplicas en distintos nodos
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchLabels:
              app: mi-app
          topologyKey: kubernetes.io/hostname   # un pod por nodo

    # Affinity: colocar junto con otro servicio (reducir latencia)
    podAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 100
          podAffinityTerm:
            labelSelector:
              matchLabels:
                app: cache
            topologyKey: kubernetes.io/hostname
```

---

## Taints y Tolerations

Los taints en nodos **repelen** Pods. Las tolerations en Pods **permiten** que soporten ciertos taints.

```bash
# Taint un nodo — solo Pods con la toleration correcta pueden schedularse
kubectl taint nodes mi-nodo-gpu gpu=true:NoSchedule
kubectl taint nodes mi-nodo-spot spot=true:NoExecute   # evicta Pods que ya estén

# Efectos: NoSchedule | PreferNoSchedule | NoExecute

# Quitar un taint
kubectl taint nodes mi-nodo-gpu gpu=true:NoSchedule-
```

```yaml
# Toleration en el Pod para aceptar el taint
spec:
  tolerations:
    - key: "gpu"
      operator: "Equal"
      value: "true"
      effect: "NoSchedule"

    # Tolerar cualquier taint de spot por 120s (para graceful shutdown)
    - key: "spot"
      operator: "Equal"
      value: "true"
      effect: "NoExecute"
      tolerationSeconds: 120
```

---

## PodDisruptionBudget — proteger la disponibilidad

Garantiza que durante un drain o update del cluster siempre haya un mínimo de réplicas disponibles.

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: mi-app-pdb
  namespace: mi-app
spec:
  minAvailable: 2         # siempre al menos 2 pods disponibles
  # maxUnavailable: 1     # alternativa: máximo 1 no disponible
  selector:
    matchLabels:
      app: mi-app
```

---

## PriorityClass — prioridad de scheduling

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: alta-prioridad
value: 1000000
globalDefault: false
description: "Para workloads críticos de producción"

---
# Usar en el Pod
spec:
  priorityClassName: alta-prioridad
```

Los Pods de alta prioridad pueden desplazar (preemptar) Pods de menor prioridad si no hay recursos disponibles.
