---
title: "Autoscaling de Nodos"
category: "Kubernetes"
tags: ["Autoscaling", "Karpenter", "Cluster Autoscaler", "AWS"]
description: "Cómo escalar tu infraestructura de Kubernetes automáticamente con Karpenter y Cluster Autoscaler."
---

# Autoscaling de Nodos (Karpenter y Cluster Autoscaler)

¡Ey! A ver, Kubernetes hace un excelente trabajo escalando tus Pods con el HPA (Horizontal Pod Autoscaler). Pero... ¿qué pasa cuando el HPA pide más Pods y tus nodos ya están al 100% de capacidad? Esos Pods se quedan en estado `Pending`. 

Ahí es donde entra el autoscaling de *infraestructura*. Necesitamos que K8s le pida a la nube (AWS, GCP, Azure) que le compre más máquinas virtuales al vuelo.

## Cluster Autoscaler: El Clásico

El **Cluster Autoscaler** es la herramienta estándar. Básicamente, se queda mirando si hay Pods en estado `Pending` porque no entran en ningún nodo. Si los hay, habla con las APIs de tu proveedor de nube y pide que se agregue un nodo al Auto Scaling Group (o Node Pool).

- **Pro:** Es maduro, estable y funciona en casi todas las nubes.
- **Contra:** Depende de los Node Groups predefinidos. A veces tarda un par de minutos en reaccionar.

## Karpenter: La bestia moderna (AWS)

Karpenter es un proyecto de código abierto iniciado por AWS (aunque ya está en donación a la CNCF y busca ser multi-cloud). ¡Y es una locura lo rápido que es!

En vez de depender de los Node Groups o ASGs rígidos de la nube, Karpenter mira los requerimientos de tus Pods `Pending` (CPU, RAM, GPUs, tolerations) y le pide a AWS exactamente la instancia de EC2 que mejor encaja en ese momento, provisionándola en segundos.

### ¿Cómo funciona Karpenter?

Defines un `NodePool` (antes llamado Provisioner) que dicta las reglas. Por ejemplo, decirle a Karpenter que puede usar instancias Spot (más baratas) y de ciertas familias.

```yaml
apiVersion: karpenter.sh/v1beta1
kind: NodePool
metadata:
  name: default
spec:
  template:
    spec:
      requirements:
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["spot", "on-demand"]
        - key: node.kubernetes.io/instance-type
          operator: In
          values: ["c5.large", "m5.large", "r5.large"]
  limits:
    cpu: "1000"
  disruption:
    consolidationPolicy: WhenUnderutilized
    expireAfter: 720h # Reciclar nodos cada 30 días
```

Fíjate en `consolidationPolicy: WhenUnderutilized`. ¡Esto es magia! Si Karpenter ve que tienes 5 nodos trabajando al 20%, los va a apagar y moverá todos los pods a 1 o 2 nodos nuevos y más eficientes. Así ahorras un dineral a fin de mes.

## HPA vs VPA vs Cluster Autoscaler

Para que te quede claro cómo encajan las piezas:
- **HPA (Horizontal Pod Autoscaler):** Agrega o quita réplicas de tus *Pods*.
- **VPA (Vertical Pod Autoscaler):** Sube o baja la CPU/RAM asignada a tus *Pods* (menos usado).
- **Cluster Autoscaler / Karpenter:** Agrega o quita *Nodos* (las VMs) del cluster.

## Consejos del Techlead

1. **Usa `requests` y `limits` correctos:** Ningún autoscaler de nodos va a funcionar bien si no defines bien cuánta memoria y CPU piden tus pods (`resources.requests`). El autoscaler hace los cálculos matemáticos basándose en eso.
2. **Karpenter > Cluster Autoscaler (en AWS):** Si estás en EKS (AWS), cámbiate a Karpenter sin dudarlo. El ahorro en costos por la consolidación y el uso eficiente de instancias Spot es brutal.
3. **Graceful Shutdown:** Configura bien los `lifecycle` hooks y el `terminationGracePeriodSeconds` en tus apps, porque Karpenter va a estar matando nodos constantemente para ahorrar plata, y no quieres perder peticiones de usuarios.
