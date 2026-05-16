---
title: "Kubernetes Almacenamiento: PV, PVC, StorageClass y Volúmenes"
category: "kubernetes"
tags: ["storage", "persistentvolume", "pvc", "storageclass", "volumes"]
keywords: ["persistent volume kubernetes", "pvc kubernetes", "storageclass kubernetes", "almacenamiento kubernetes", "volumen kubernetes", "crear pvc", "pv pvc diferencia", "storage class aws", "ebs kubernetes", "efs kubernetes", "readwritemany kubernetes", "statefulset storage", "emptydir", "hostpath"]
description: "Gestión de almacenamiento persistente en Kubernetes: PersistentVolumes, PersistentVolumeClaims, StorageClasses y tipos de volúmenes para distintos casos de uso."
---

# Almacenamiento en Kubernetes

## Contenido

- [Conceptos clave](#conceptos-clave)
- [StorageClass](#storageclass)
- [PersistentVolumeClaim](#persistentvolumeclaim)
- [Usar un PVC en un Pod](#usar-un-pvc-en-un-pod)
- [Expandir un PVC](#expandir-un-pvc)
- [Tipos de volúmenes efímeros](#tipos-de-volúmenes-efímeros)
- [EFS (NFS/ReadWriteMany) en AWS](#efs-nfs/readwritemany-en-aws)
- [Snapshot de un volumen](#snapshot-de-un-volumen)

---

## Conceptos clave

| Recurso | Qué es |
|---|---|
| **PersistentVolume (PV)** | Pieza de almacenamiento físico en el cluster. Creado por el admin o dinámicamente por el provisioner. Sin namespace. |
| **PersistentVolumeClaim (PVC)** | Solicitud de almacenamiento de un usuario/Pod. Namespaced. Se bindea a un PV que cumpla sus requisitos. |
| **StorageClass** | Define cómo provisionar PVs dinámicamente (tipo de disco, IOPS, replicación). |

Flujo con provisioning dinámico (el más común en producción):

```
Pod → PVC → StorageClass → provisioner → PV (creado automáticamente)
```

---

## StorageClass

```yaml
# StorageClass para EBS gp3 en AWS
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gp3
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
  encrypted: "true"
reclaimPolicy: Retain       # Retain (conserva datos) o Delete (borra el disco)
volumeBindingMode: WaitForFirstConsumer   # espera hasta que el Pod esté scheduled
allowVolumeExpansion: true
```

```bash
# Ver StorageClasses disponibles
kubectl get storageclass

# Ver cuál es la default
kubectl get storageclass | grep default
```

---

## PersistentVolumeClaim

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
  namespace: databases
spec:
  accessModes:
    - ReadWriteOnce     # solo un nodo puede escribir a la vez
  storageClassName: gp3
  resources:
    requests:
      storage: 20Gi
```

Access modes:

| Modo | Descripción | Cuándo usarlo |
|---|---|---|
| `ReadWriteOnce` (RWO) | Un nodo puede leer y escribir | Bases de datos, aplicaciones stateful |
| `ReadOnlyMany` (ROX) | Múltiples nodos pueden leer | Assets estáticos |
| `ReadWriteMany` (RWX) | Múltiples nodos pueden leer y escribir | Shared filesystem (EFS, NFS) |
| `ReadWriteOncePod` | Solo un Pod puede leer y escribir | k8s 1.22+, aislamiento estricto |

```bash
# Ver PVCs y su estado
kubectl get pvc -n databases

# Estados posibles: Pending (sin PV), Bound (OK), Lost (PV desapareció)
kubectl describe pvc postgres-data -n databases

# Ver PVs del cluster
kubectl get pv
```

---

## Usar un PVC en un Pod

```yaml
spec:
  volumes:
    - name: postgres-storage
      persistentVolumeClaim:
        claimName: postgres-data

  containers:
    - name: postgres
      image: postgres:16-alpine
      volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
```

---

## Expandir un PVC

```bash
# 1. La StorageClass debe tener allowVolumeExpansion: true
# 2. Editar el PVC
kubectl edit pvc postgres-data -n databases
# cambiar spec.resources.requests.storage de 20Gi a 40Gi

# 3. El resize ocurre automáticamente (puede requerir reiniciar el Pod)
kubectl describe pvc postgres-data -n databases
```

---

## Tipos de volúmenes efímeros

### emptyDir — volumen temporal en memoria o disco

Se crea cuando el Pod arranca y se destruye cuando el Pod termina. Compartido entre todos los containers del mismo Pod.

```yaml
spec:
  volumes:
    - name: cache
      emptyDir:
        medium: Memory    # en RAM (tmpfs) — para /tmp, caches
        sizeLimit: 256Mi

    - name: work-dir
      emptyDir: {}        # en disco del nodo

  containers:
    - name: app
      volumeMounts:
        - name: cache
          mountPath: /tmp/cache
```

### hostPath — acceso al filesystem del nodo

Acceso directo a un path del nodo. Usado por DaemonSets y herramientas de sistema.

```yaml
spec:
  volumes:
    - name: docker-sock
      hostPath:
        path: /var/run/docker.sock
        type: Socket

    - name: logs
      hostPath:
        path: /var/log/mi-app
        type: DirectoryOrCreate
```

---

## EFS (NFS/ReadWriteMany) en AWS

Para compartir almacenamiento entre múltiples Pods en distintos nodos:

```yaml
# StorageClass para EFS
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: efs-sc
provisioner: efs.csi.aws.com
parameters:
  provisioningMode: efs-ap
  fileSystemId: fs-0123456789abcdef
  directoryPerms: "700"
reclaimPolicy: Retain

---
# PVC con RWX
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-assets
  namespace: mi-app
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: efs-sc
  resources:
    requests:
      storage: 5Gi
```

---

## Snapshot de un volumen

```yaml
# Crear snapshot
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: postgres-snapshot-20240115
  namespace: databases
spec:
  volumeSnapshotClassName: ebs-vsc
  source:
    persistentVolumeClaimName: postgres-data
```

```yaml
# Restaurar desde snapshot
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data-restored
  namespace: databases
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: gp3
  resources:
    requests:
      storage: 20Gi
  dataSource:
    name: postgres-snapshot-20240115
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
```

```bash
# Ver snapshots disponibles
kubectl get volumesnapshot -n databases
```
