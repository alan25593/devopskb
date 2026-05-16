---
title: "kubectl: Comandos Esenciales, Contexts y Output"
category: "kubernetes"
tags: ["kubectl", "comandos", "contexts", "namespaces", "output"]
keywords: ["kubectl comandos", "cambiar cluster kubectl", "kubectl context", "kubectl namespace", "kubectl get", "kubectl describe", "kubectl apply", "kubectl delete", "kubectl logs", "kubectl exec", "formato json kubectl", "jsonpath kubectl", "alias kubectl", "kubectx kubens", "kubectl rollout", "kubectl scale"]
description: "Referencia completa de kubectl: gestión de contexts y namespaces, comandos de lectura y escritura, formatos de output, rollouts y aliases para el día a día."
---

# kubectl — Referencia Completa

## Contenido

- [Contexts — cambiar de cluster](#contexts-—-cambiar-de-cluster)
- [Namespaces](#namespaces)
- [Comandos de lectura](#comandos-de-lectura)
- [Comandos de escritura](#comandos-de-escritura)
- [Rollouts](#rollouts)
- [Ejecutar comandos en Pods](#ejecutar-comandos-en-pods)
- [Port-forward — acceder a un servicio sin exponerlo](#port-forward-—-acceder-a-un-servicio-sin-exponerlo)
- [Formatos de output](#formatos-de-output)
- [Comandos de recursos y nodos](#comandos-de-recursos-y-nodos)
- [Aliases y productividad](#aliases-y-productividad)
- [kubectl explain — documentación inline](#kubectl-explain-—-documentación-inline)

---

## Contexts — cambiar de cluster

```bash
# Ver todos los contexts configurados
kubectl config get-contexts

# Cambiar de cluster
kubectl config use-context mi-cluster-prod

# Ver el context actual
kubectl config current-context

# Renombrar un context
kubectl config rename-context nombre-viejo nombre-nuevo

# Ver la config completa de kubeconfig
kubectl config view
kubectl config view --minify   # solo el context activo
```

---

## Namespaces

```bash
# Listar namespaces
kubectl get namespaces

# Crear namespace
kubectl create namespace mi-app

# Cambiar el namespace por defecto para la sesión actual
kubectl config set-context --current --namespace=mi-app

# Correr un comando en un namespace específico
kubectl get pods -n kube-system

# Ver recursos en todos los namespaces
kubectl get pods -A
kubectl get pods --all-namespaces
```

---

## Comandos de lectura

```bash
# Listar recursos
kubectl get pods
kubectl get pods -o wide            # con IP y nodo
kubectl get deployments
kubectl get services
kubectl get all                     # pods, services, deployments, replicasets

# Describir un recurso (la herramienta de debug más importante)
kubectl describe pod mi-pod
kubectl describe node mi-nodo
kubectl describe service mi-svc

# Ver el YAML completo de un recurso en el cluster
kubectl get pod mi-pod -o yaml
kubectl get deployment mi-deploy -o yaml

# Buscar por label
kubectl get pods -l app=mi-app
kubectl get pods -l env=prod,tier=frontend

# Ver logs
kubectl logs mi-pod
kubectl logs mi-pod -c mi-container   # contenedor específico en un Pod multi-container
kubectl logs -f mi-pod                # follow
kubectl logs --tail=100 mi-pod
kubectl logs --since=1h mi-pod
kubectl logs --previous mi-pod        # logs del crash anterior
```

---

## Comandos de escritura

```bash
# Aplicar un manifiesto (create o update)
kubectl apply -f deployment.yaml
kubectl apply -f ./k8s/               # aplicar todo un directorio
kubectl apply -f https://raw.githubusercontent.com/org/repo/main/deploy.yaml

# Eliminar recursos
kubectl delete -f deployment.yaml
kubectl delete pod mi-pod
kubectl delete pod mi-pod --grace-period=0 --force   # forzado inmediato
kubectl delete pods -l app=mi-app     # por label

# Escalar un deployment
kubectl scale deployment mi-deploy --replicas=5

# Editar un recurso en vivo (abre el editor)
kubectl edit deployment mi-deploy

# Patch — modificar un campo sin editar el YAML completo
kubectl patch deployment mi-deploy -p '{"spec":{"replicas":3}}'
```

---

## Rollouts

```bash
# Ver estado del rollout
kubectl rollout status deployment/mi-deploy

# Historial de revisiones
kubectl rollout history deployment/mi-deploy
kubectl rollout history deployment/mi-deploy --revision=3

# Rollback a la revisión anterior
kubectl rollout undo deployment/mi-deploy

# Rollback a una revisión específica
kubectl rollout undo deployment/mi-deploy --to-revision=2

# Pausar / reanudar un rollout
kubectl rollout pause deployment/mi-deploy
kubectl rollout resume deployment/mi-deploy

# Forzar un rollout sin cambiar el spec (útil para recargar secrets/configmaps)
kubectl rollout restart deployment/mi-deploy
```

---

## Ejecutar comandos en Pods

```bash
# Shell interactiva
kubectl exec -it mi-pod -- bash
kubectl exec -it mi-pod -- sh

# Comando puntual
kubectl exec mi-pod -- env
kubectl exec mi-pod -- cat /etc/config/app.conf

# Contenedor específico en un Pod multi-container
kubectl exec -it mi-pod -c mi-contenedor -- bash
```

---

## Port-forward — acceder a un servicio sin exponerlo

```bash
# Forwarding a un pod directamente
kubectl port-forward pod/mi-pod 8080:3000

# Forwarding a un servicio
kubectl port-forward svc/mi-servicio 8080:80

# En background
kubectl port-forward svc/mi-servicio 8080:80 &
```

---

## Formatos de output

```bash
# YAML completo
kubectl get pod mi-pod -o yaml

# JSON
kubectl get pod mi-pod -o json

# Solo los nombres
kubectl get pods -o name

# Tabla custom
kubectl get pods -o custom-columns=\
'NOMBRE:.metadata.name,STATUS:.status.phase,NODE:.spec.nodeName'

# JSONPath — extraer campos específicos
kubectl get pod mi-pod -o jsonpath='{.status.podIP}'
kubectl get pods -o jsonpath='{.items[*].metadata.name}'
kubectl get pods -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.phase}{"\n"}{end}'

# Go template
kubectl get pods -o go-template='{{range .items}}{{.metadata.name}}{{"\n"}}{{end}}'
```

---

## Comandos de recursos y nodos

```bash
# Ver uso de CPU/RAM de pods (requiere metrics-server)
kubectl top pods
kubectl top pods -A --sort-by=memory
kubectl top nodes

# Ver cuánto está allocado en un nodo
kubectl describe node mi-nodo | grep -A 10 "Allocated resources"

# Cordon — marcar nodo como no-schedulable (sin afectar pods que ya corren)
kubectl cordon mi-nodo

# Drain — evacuar todos los pods de un nodo antes de mantenimiento
kubectl drain mi-nodo --ignore-daemonsets --delete-emptydir-data

# Uncordon — volver a habilitar el nodo
kubectl uncordon mi-nodo
```

---

## Aliases y productividad

```bash
# Aliases fundamentales
alias k='kubectl'
alias kgp='kubectl get pods'
alias kgpa='kubectl get pods -A'
alias kgs='kubectl get services'
alias kgd='kubectl get deployments'
alias kd='kubectl describe'
alias kl='kubectl logs -f'
alias kx='kubectl exec -it'
alias kns='kubectl config set-context --current --namespace'
alias kctx='kubectl config use-context'

# Ver todos los recursos de un namespace de un vistazo
alias kall='kubectl get all,configmaps,secrets,ingress,pvc'

# Función para cambiar de namespace rápido
kn() { kubectl config set-context --current --namespace=$1; }
```

---

## kubectl explain — documentación inline

```bash
# Qué campos tiene un recurso
kubectl explain pod
kubectl explain pod.spec
kubectl explain pod.spec.containers
kubectl explain deployment.spec.strategy
```
