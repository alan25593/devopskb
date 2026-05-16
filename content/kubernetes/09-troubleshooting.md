---
title: "Kubernetes Troubleshooting: CrashLoop, OOM, Pending y Debug"
category: "kubernetes"
tags: ["troubleshooting", "debug", "crashloopbackoff", "oomkilled", "pending", "errores"]
keywords: ["crashloopbackoff kubernetes", "pod no arranca kubernetes", "oomkilled kubernetes", "pod pending kubernetes", "imagepullbackoff kubernetes", "pod stuck terminating", "debug kubernetes", "pod error", "contenedor reiniciando", "evicted pod", "nodo not ready", "servicio no responde kubernetes", "endpoint no disponible", "kubernetes troubleshooting", "pod describe", "eventos kubernetes"]
description: "Diagnóstico sistemático de los problemas más comunes en Kubernetes: CrashLoopBackOff, OOMKilled, Pending, ImagePullBackOff, nodos caídos y servicios sin respuesta."
---

# Kubernetes Troubleshooting

## Contenido

- [Flujo de diagnóstico general](#flujo-de-diagnóstico-general)
- [CrashLoopBackOff](#crashloopbackoff)
- [OOMKilled (exit code 137)](#oomkilled-exit-code-137)
- [ImagePullBackOff / ErrImagePull](#imagepullbackoff-/-errimagepull)
- [Pod en estado Pending](#pod-en-estado-pending)
- [Pod stuck en Terminating](#pod-stuck-en-terminating)
- [Nodo NotReady](#nodo-notready)
- [Servicio sin respuesta / Endpoints vacíos](#servicio-sin-respuesta-/-endpoints-vacíos)
- [Pods evicted](#pods-evicted)
- [Contenedor de debug temporal](#contenedor-de-debug-temporal)
- [Checklist de troubleshooting](#checklist-de-troubleshooting)

---

## Flujo de diagnóstico general

```bash
# 1. Ver el estado de los Pods
kubectl get pods -n mi-app

# 2. Describe del Pod — la fuente más completa de información
kubectl describe pod <pod> -n mi-app

# 3. Logs del contenedor
kubectl logs <pod> -n mi-app
kubectl logs <pod> -n mi-app --previous   # logs del crash anterior

# 4. Eventos del namespace (ordenados por tiempo)
kubectl get events -n mi-app --sort-by='.lastTimestamp'
```

---

## CrashLoopBackOff

El contenedor arranca, falla, y Kubernetes lo reinicia en bucle con backoff exponencial.

```bash
kubectl describe pod <pod> -n mi-app   # ver "Last State" y exit code
kubectl logs <pod> -n mi-app --previous
```

Exit codes comunes:

| Code | Causa |
|---|---|
| `1` | Error genérico de la aplicación |
| `137` | OOMKilled — el proceso fue matado por falta de memoria |
| `139` | Segmentation fault |
| `143` | SIGTERM — shutdown graceful (normal en rollouts) |
| `255` | Error de entrypoint o de script de inicio |

Causas frecuentes:
- Comando o entrypoint incorrecto en el Dockerfile
- Variable de entorno faltante o incorrecta
- ConfigMap o Secret referenciado que no existe
- Falta de permisos en el filesystem (`readOnlyRootFilesystem: true` sin tmpfs)
- La aplicación no puede conectarse a la base de datos al arrancar

```bash
# Debug: sobreescribir el entrypoint para abrir una shell
kubectl run debug \
  --image=mi-app:v1.2.0 \
  --rm -it --restart=Never \
  --command -- sh
```

---

## OOMKilled (exit code 137)

La aplicación superó el memory limit. Kubernetes mata el proceso.

```bash
# Confirmar OOMKilled
kubectl describe pod <pod> -n mi-app | grep -A5 "Last State"
# Salida: Reason: OOMKilled

# Ver uso real de memoria
kubectl top pod <pod> -n mi-app
```

Soluciones:
1. Aumentar el memory limit en el Deployment
2. Investigar memory leak con profiler de la app
3. Ajustar el JVM heap si es Java: `-Xmx` debe ser < memory limit

---

## ImagePullBackOff / ErrImagePull

Kubernetes no puede descargar la imagen.

```bash
kubectl describe pod <pod> -n mi-app | grep -A10 "Events"
```

Causas y soluciones:

```bash
# 1. Imagen o tag inexistente
# → Verificar que el tag existe en el registry

# 2. Registry privado sin credenciales
kubectl create secret docker-registry regcred \
  --docker-server=123456789.dkr.ecr.us-east-1.amazonaws.com \
  --docker-username=AWS \
  --docker-password=$(aws ecr get-login-password --region us-east-1) \
  -n mi-app

# Agregar el secret al ServiceAccount o directamente al Pod
kubectl patch serviceaccount default -n mi-app \
  -p '{"imagePullSecrets": [{"name": "regcred"}]}'

# 3. El nodo no tiene acceso de red al registry
kubectl exec -n mi-app <pod> -- wget -qO- https://registry.empresa.com/v2/
```

---

## Pod en estado Pending

El Pod no se pudo schedulear en ningún nodo.

```bash
kubectl describe pod <pod> -n mi-app
# Buscar en la sección "Events": "0/3 nodes are available..."
```

Causas comunes:

```bash
# Sin recursos suficientes en los nodos
kubectl describe nodes | grep -A10 "Allocated resources"
kubectl top nodes

# PVC sin Bound (PV no disponible)
kubectl get pvc -n mi-app

# NodeSelector o Affinity que no matchea ningún nodo
# → Revisar spec.nodeSelector y spec.affinity en el Pod

# Taints sin toleration
kubectl describe nodes | grep Taint
# → Agregar tolerations correspondientes al Pod
```

---

## Pod stuck en Terminating

El Pod no termina después de `kubectl delete`.

```bash
# Forzar eliminación inmediata
kubectl delete pod <pod> -n mi-app --force --grace-period=0
```

Causas: finalizers no resueltos, volumen no desmontado, webhook mutante fallando.

```bash
# Ver y quitar finalizers manualmente
kubectl get pod <pod> -n mi-app -o yaml | grep finalizers
kubectl patch pod <pod> -n mi-app \
  -p '{"metadata":{"finalizers":[]}}' \
  --type=merge
```

---

## Nodo NotReady

```bash
# Ver estado de los nodos
kubectl get nodes
kubectl describe node <nodo>   # buscar en "Conditions" y "Events"

# Ver los Pods del nodo problemático
kubectl get pods -A --field-selector=spec.nodeName=<nodo>

# SSH al nodo y revisar kubelet
journalctl -u kubelet -f
systemctl status kubelet

# Presión de recursos en el nodo
kubectl describe node <nodo> | grep -E "MemoryPressure|DiskPressure|PIDPressure"
```

---

## Servicio sin respuesta / Endpoints vacíos

```bash
# Ver si hay Endpoints (IPs de Pods) detrás del Service
kubectl get endpoints mi-servicio -n mi-app

# Si ENDPOINTS es <none>:
# 1. Los labels del Service no matchean los Pods
kubectl get pods -n mi-app --show-labels
kubectl get svc mi-servicio -n mi-app -o yaml | grep selector

# 2. Los Pods no pasan el readinessProbe
kubectl describe pod <pod> -n mi-app | grep -A10 "Readiness"

# Test de conectividad al Service desde dentro del cluster
kubectl run test --image=curlimages/curl --rm -it --restart=Never -- \
  curl -v http://mi-servicio.mi-app.svc.cluster.local/health
```

---

## Pods evicted

```bash
# Ver Pods evicted
kubectl get pods -A | grep Evicted

# Limpiar todos los Pods evicted de un namespace
kubectl get pods -n mi-app | grep Evicted \
  | awk '{print $1}' \
  | xargs kubectl delete pod -n mi-app

# Por qué se evictan: presión de memoria o disco en el nodo
kubectl describe node <nodo> | grep -E "eviction|pressure|threshold"
```

---

## Contenedor de debug temporal

```bash
# Pod de debug efímero con herramientas de red
kubectl run debug \
  --image=nicolaka/netshoot \
  --rm -it --restart=Never \
  -n mi-app \
  -- bash

# Desde adentro:
nslookup mi-servicio.mi-app.svc.cluster.local
curl http://mi-servicio/health
tcpdump -i eth0 port 5432

# Debug ephemeral container (k8s 1.23+) — adjuntar al Pod en producción sin reiniciarlo
kubectl debug -it <pod> -n mi-app \
  --image=nicolaka/netshoot \
  --target=mi-contenedor
```

---

## Checklist de troubleshooting

```
1. kubectl get pods -n <ns>           → estado y restarts
2. kubectl describe pod <pod> -n <ns> → eventos y condiciones
3. kubectl logs <pod> --previous       → logs del crash anterior
4. kubectl get events -n <ns> --sort-by=lastTimestamp
5. kubectl top pods / top nodes        → presión de recursos
6. kubectl get endpoints <svc> -n <ns> → tráfico llega al Pod?
7. kubectl exec -it <pod> -- sh        → debug desde dentro
```
