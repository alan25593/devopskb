---
title: "Kubernetes: Arquitectura del Cluster y Componentes"
category: "kubernetes"
tags: ["arquitectura", "control-plane", "worker-nodes", "etcd", "componentes"]
keywords: ["arquitectura kubernetes", "control plane k8s", "que es etcd", "kube-apiserver", "kube-scheduler", "kubelet kube-proxy", "como funciona kubernetes", "componentes kubernetes", "worker node", "container runtime", "jerarquia objetos kubernetes", "namespaces kubernetes"]
description: "Arquitectura interna de Kubernetes: componentes del control plane y worker nodes, cómo se comunican entre sí, jerarquía de objetos y namespaces del sistema."
---

# Arquitectura de Kubernetes

## Contenido

- [El problema que resuelve](#el-problema-que-resuelve)
- [Componentes del Control Plane](#componentes-del-control-plane)
- [Componentes de los Worker Nodes](#componentes-de-los-worker-nodes)
- [Cómo funciona una operación (flujo de kubectl apply)](#cómo-funciona-una-operación-flujo-de-kubectl-apply)
- [Jerarquía de objetos](#jerarquía-de-objetos)
- [Namespaces del sistema](#namespaces-del-sistema)
- [Inspeccionar el cluster](#inspeccionar-el-cluster)
- [etcd — comandos de emergencia](#etcd-—-comandos-de-emergencia)

---

## El problema que resuelve

Kubernetes (k8s) es un orquestador de contenedores: automatiza el despliegue, el escalado y la operación de aplicaciones en contenedores a través de un cluster de máquinas, abstrayendo la infraestructura subyacente.

---

## Componentes del Control Plane

El control plane toma decisiones globales sobre el cluster (scheduling, detección de eventos) y responde a ellos.

| Componente | Función |
|---|---|
| **kube-apiserver** | Único punto de entrada para todas las operaciones. Expone la API REST. Todo (kubectl, controllers, kubelets) habla con él. |
| **etcd** | Base de datos clave-valor distribuida. Es el único almacenamiento persistente del cluster. Si etcd muere, el cluster pierde su estado. |
| **kube-scheduler** | Asigna Pods sin nodo a un worker node, evaluando recursos disponibles, affinity, taints y políticas. |
| **kube-controller-manager** | Ejecuta todos los controllers en un único proceso: Deployment, ReplicaSet, Node, Endpoint, ServiceAccount, etc. |
| **cloud-controller-manager** | Integra con el cloud provider (AWS/GCP/Azure) para gestionar LoadBalancers, nodos y almacenamiento. |

---

## Componentes de los Worker Nodes

Cada nodo donde corren los Pods tiene:

| Componente | Función |
|---|---|
| **kubelet** | Agente que corre en cada nodo. Recibe PodSpecs del API server y asegura que los contenedores definidos estén corriendo y saludables. |
| **kube-proxy** | Mantiene las reglas de red (iptables/IPVS) en el nodo para implementar la abstracción de Service. |
| **Container Runtime** | Software que ejecuta los contenedores: `containerd` (default), `CRI-O`, o `Docker` (deprecado en k8s 1.24+). |

---

## Cómo funciona una operación (flujo de kubectl apply)

```
kubectl apply -f deployment.yaml
        │
        ▼
  kube-apiserver  ←── autentica, valida, persiste en etcd
        │
        ▼
     etcd  ←── guarda el nuevo estado deseado
        │
        ▼
  kube-controller-manager  ←── detecta que no hay ReplicaSet, lo crea
        │
        ▼
  kube-scheduler  ←── detecta Pod sin nodo, elige worker node
        │
        ▼
  kubelet (en el nodo)  ←── recibe el PodSpec, llama al container runtime
        │
        ▼
  containerd  ←── descarga imagen, crea contenedor
```

---

## Jerarquía de objetos

```
Cluster
└── Namespace
    ├── Deployment          → gestiona ReplicaSets
    │   └── ReplicaSet      → mantiene N réplicas de un Pod
    │       └── Pod         → unidad mínima, corre 1..N containers
    ├── StatefulSet         → Pods con identidad estable y almacenamiento
    ├── DaemonSet           → un Pod por nodo
    ├── Job / CronJob       → tareas puntuales o programadas
    ├── Service             → expone Pods como endpoint de red estable
    ├── Ingress             → routing HTTP/HTTPS externo
    ├── ConfigMap           → configuración no sensible
    ├── Secret              → datos sensibles (base64)
    ├── PersistentVolumeClaim → solicitud de almacenamiento
    ├── HorizontalPodAutoscaler → escala Pods por métricas
    └── ServiceAccount      → identidad para Pods (RBAC)

Cluster (sin namespace)
├── Node
├── PersistentVolume
├── StorageClass
├── ClusterRole / ClusterRoleBinding
└── Namespace
```

---

## Namespaces del sistema

```bash
kubectl get namespaces
```

| Namespace | Uso |
|---|---|
| `default` | Recursos sin namespace explícito |
| `kube-system` | Componentes del control plane y add-ons (CoreDNS, metrics-server) |
| `kube-public` | ConfigMaps accesibles sin autenticación (bootstrap info) |
| `kube-node-lease` | Objetos Lease para heartbeat de disponibilidad de nodos |

---

## Inspeccionar el cluster

```bash
# Estado general
kubectl cluster-info
kubectl get nodes -o wide
kubectl get componentstatuses   # estado de los componentes del control plane

# Capacidad y recursos de un nodo
kubectl describe node <nombre-nodo>

# Todos los recursos en todos los namespaces
kubectl get all --all-namespaces

# Consumo de recursos en tiempo real (requiere metrics-server)
kubectl top nodes
kubectl top pods -A

# Versión del cluster y del cliente
kubectl version

# Ver los eventos recientes del cluster
kubectl get events -A --sort-by='.lastTimestamp'
```

---

## etcd — comandos de emergencia

```bash
# Ver el estado de etcd (desde dentro del pod de etcd en kube-system)
kubectl exec -it etcd-<nodo> -n kube-system -- etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  endpoint health

# Snapshot de backup
kubectl exec -it etcd-<nodo> -n kube-system -- etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  snapshot save /tmp/etcd-backup.db
```
