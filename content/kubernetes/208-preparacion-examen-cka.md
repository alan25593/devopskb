---
title: "Preparación del Examen CKA - Estrategia, Temario y Simulacros"
category: "kubernetes"
description: "Guía definitiva para aprobar el examen CKA (Certified Kubernetes Administrator) - temario oficial, estrategia de examen, trucos de kubectl, simuladores y recursos de práctica."
tags:
  - "kubernetes"
  - "CKA"
  - "certificación"
  - "examen"
keywords:
  - "CKA examen"
  - "certified kubernetes administrator"
  - "preparar CKA"
  - "aprobar CKA"
  - "CKA temario"
  - "killer.sh CKA"
  - "CKA consejos"
  - "CKA simulacro"
  - "certificación kubernetes"
  - "CKA español"
---

# Preparación del examen CKA

Hemos llegado al final de la especialización de administración. Este capítulo es el plan de batalla para el examen **CKA (Certified Kubernetes Administrator)** de la Linux Foundation/CNCF: qué entra, cómo es el formato y, sobre todo, cómo no tirar el dinero del intento.

## Cómo es el examen
- **Formato**: 100% práctico. Una terminal remota con varios clusters reales y 15-20 ejercicios a resolver en **2 horas**.
- **Puntuación**: se aprueba con un 66%. Cada pregunta indica su peso (4-13%).
- **Supervisión**: online con proctor, webcam y escritorio compartido. Necesitaremos DNI/pasaporte y una sala despejada.
- **Documentación permitida**: una pestaña con [kubernetes.io/docs](https://kubernetes.io/docs/) (y sus blogs/subdominios oficiales). Nada más.
- **Validez e intentos**: la compra incluye **un retake gratuito** y dos sesiones del simulador killer.sh. La certificación dura 2 años.
- **Versión**: el examen corre sobre una versión reciente de Kubernetes (se indica al registrarse); este curso está alineado con ella.

## Temario oficial y dónde lo hemos cubierto
| Dominio | Peso | Capítulos del curso |
|---------|------|---------------------|
| Troubleshooting | 30% | [202](/article/kubernetes/202-troubleshooting-cluster/), [124](/article/kubernetes/123-logging-y-monitoreo/), [114](/article/kubernetes/113-probes-healthchecks/) |
| Arquitectura, instalación y configuración del cluster | 25% | [102](/article/kubernetes/102-arquitectura/), [103](/article/kubernetes/103-instalacion/), [201](/article/kubernetes/201-mantenimiento-etcd-backup/), [204](/article/kubernetes/204-certificados-pki-autenticacion/), [207](/article/kubernetes/207-alta-disponibilidad-ha-dr/) |
| Servicios y redes | 20% | [111](/article/kubernetes/110-services/), [112](/article/kubernetes/111-ingress-controllers/), [113](/article/kubernetes/112-gateway-api/), [119](/article/kubernetes/118-seguridad-serviceaccounts/) |
| Workloads y scheduling | 15% | [106](/article/kubernetes/105-pods/), [108](/article/kubernetes/107-deployments/), [117](/article/kubernetes/116-limitranges-y-resourcequotas/), [118](/article/kubernetes/117-autoscaling-hpa-vpa/), [122](/article/kubernetes/121-scheduling-labels-affinity/), [123](/article/kubernetes/122-taints-y-tolerations/) |
| Almacenamiento | 10% | [116](/article/kubernetes/115-almacenamiento-pv-pvc/), [205](/article/kubernetes/205-almacenamiento-avanzado-csi/) |

## La estrategia: velocidad y triaje
El CKA no se suspende por falta de conocimiento, se suspende por falta de **tiempo**. Toda la preparación debe orientarse a resolver rápido.

### Gestión del tiempo
1. **Triaje**: las preguntas no van en orden de dificultad. Si una pregunta pesa 4% y pinta laboriosa, la marcamos (el examen tiene un sistema de flags) y seguimos. Volvemos al final.
2. **No nos enroquemos**: máximo ~7 minutos por pregunta en la primera pasada. Una pregunta de 13% sin empezar duele más que una de 4% a medias.
3. **Verificamos en 10 segundos**: tras cada ejercicio, un `kubectl get` rápido para confirmar que lo creado está `Running`/`Ready`. Los puntos se dan por el estado final del cluster.
4. **¡Contexto!**: cada pregunta nos indica el comando de cambio de contexto (`kubectl config use-context k8s-c1`). Lo ejecutamos **siempre**. Resolver la pregunta en el cluster equivocado es la forma más tonta de perder puntos.

### El setup de los primeros 60 segundos
El entorno ya trae `alias k=kubectl` y autocompletado. Añadimos solo lo que usemos de verdad:
```bash
export do="--dry-run=client -o yaml"   # k run nginx --image=nginx $do > pod.yaml
export now="--force --grace-period=0"  # k delete pod x $now
```

Y configuramos vim para YAML (el `~/.vimrc` del examen ya suele traerlo):
```vim
set tabstop=2 shiftwidth=2 expandtab
```

### Generamos YAML, no lo escribimos
La regla de oro de todo el curso: **nunca escribamos un manifiesto desde cero**.
```bash
k run nginx --image=nginx $do > pod.yaml
k create deployment web --image=nginx --replicas=3 $do > deploy.yaml
k expose deployment web --port=80 $do > svc.yaml
k create job backup --image=busybox $do -- /bin/sh -c "echo hola" > job.yaml
```
Y para lo que no se puede generar (PV, PVC, NetworkPolicy, PDB...), copiamos la plantilla de la documentación oficial: aterrizamos en la página correcta buscando en Google-style dentro de kubernetes.io ("persistent volume", "network policy").

### Domina la documentación oficial
Practicamos navegar kubernetes.io/docs hasta que encontremos cualquier plantilla en menos de 30 segundos. Páginas que conviene tener fichadas:
- [PV/PVC](https://kubernetes.io/docs/concepts/storage/persistent-volumes/), [NetworkPolicy](https://kubernetes.io/docs/concepts/services-networking/network-policies/), [Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/), [RBAC](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- El [cheatsheet de kubectl](https://kubernetes.io/docs/reference/kubectl/quick-reference/)
- [Upgrade de kubeadm](https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/) y [backup de etcd](https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/)

## Los clásicos que caen (casi) seguro
Si dominamos esta lista con los ojos cerrados, el aprobado está cerca. Todos están desarrollados en los capítulos de la especialización:

1. **Backup y restore de etcd** ([201](/article/kubernetes/201-mantenimiento-etcd-backup/)): el clásico entre los clásicos.
2. **Upgrade de un nodo con kubeadm** ([201](/article/kubernetes/201-mantenimiento-etcd-backup/)): drain → upgrade → uncordon.
3. **Nodo NotReady** ([202](/article/kubernetes/202-troubleshooting-cluster/)): SSH, `journalctl -u kubelet`, arreglar, verificar.
4. **Crear usuario con CSR + RBAC** ([204](/article/kubernetes/204-certificados-pki-autenticacion/) y [121](/article/kubernetes/120-roles-y-rbac/)).
5. **PV + PVC + pod que lo monta** ([116](/article/kubernetes/115-almacenamiento-pv-pvc/)): cuidado con accessModes y storageClassName.
6. **NetworkPolicy** ([119](/article/kubernetes/118-seguridad-serviceaccounts/)): default-deny + permitir un origen concreto.
7. **Service + Ingress** ([111](/article/kubernetes/110-services/), [112](/article/kubernetes/111-ingress-controllers/)): exponer un deployment existente.
8. **Scheduling**: nodeSelector, taints/tolerations, pods en Pending por recursos ([122](/article/kubernetes/121-scheduling-labels-affinity/), [123](/article/kubernetes/122-taints-y-tolerations/)).
9. **Static pods** ([202](/article/kubernetes/202-troubleshooting-cluster/)): crear uno o arreglar un manifiesto roto en `/etc/kubernetes/manifests/`.
10. **Componentes del control plane caídos** ([202](/article/kubernetes/202-troubleshooting-cluster/)): API server que no responde, scheduler parado.

## Plan de entrenamiento
1. **Repasamos haciendo**: montamos y rompemos nuestro propio cluster con kubeadm ([103](/article/kubernetes/103-instalacion/)). Cada concepto del curso, ejecutado al menos una vez.
2. **[Killercoda](https://killercoda.com/killer-shell-cka)**: escenarios gratuitos de práctica por tema, en el mismo tipo de entorno del examen.
3. **[killer.sh](https://killer.sh/)**: el simulador oficial incluido con el examen. Es deliberadamente **más difícil** que el examen real: si lo terminamos con un 60-70%, vamos sobrados. Usamos la primera sesión 2-3 semanas antes y la segunda en la última semana.
4. **Cronometrémonos**: resolvemos series de ejercicios contrarreloj. La técnica sin velocidad no aprueba.

## El día del examen
- Conexión estable, sala despejada y documento de identidad a mano. Hacemos el check-in 30 minutos antes.
- Leemos cada pregunta **dos veces**: namespace, nombre exacto, cluster. Los nombres tienen que coincidir literalmente.
- Si algo no sale, flag y siguiente. La pasada final recupera más puntos que el orgullo.
- Respiramos: con el retake incluido, el primer intento nos lo podemos tomar como el mejor simulacro posible.

¡Mucha suerte, almirante! Y cuando la tengamos: la CKA es requisito para presentarse a la [CKS](/article/kubernetes/401-cis-benchmarks-kube-bench/), por si nos quedamos con ganas de más.

---
