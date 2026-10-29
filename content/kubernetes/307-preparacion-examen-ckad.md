---
title: "Preparación del Examen CKAD - Estrategia, Temario y Simulacros"
category: "kubernetes"
description: "Guía definitiva para aprobar el examen CKAD (Certified Kubernetes Application Developer) - temario oficial, estrategia de examen, comandos imperativos, simuladores y recursos de práctica."
tags:
  - "kubernetes"
  - "CKAD"
  - "certificación"
  - "examen"
keywords:
  - "CKAD examen"
  - "certified kubernetes application developer"
  - "preparar CKAD"
  - "aprobar CKAD"
  - "CKAD temario"
  - "killer.sh CKAD"
  - "CKAD consejos"
  - "CKAD simulacro"
  - "certificación kubernetes desarrolladores"
  - "CKAD español"
---

# Preparación del examen CKAD

Cierre de la especialización de desarrollo: el plan de ataque para el **CKAD (Certified Kubernetes Application Developer)**. Si venimos de leer la [guía del CKA](/article/kubernetes/208-preparacion-examen-cka/), buena parte de la logística es idéntica; aquí nos centramos en lo que hace al CKAD diferente: es el examen más **rápido** de los tres.

## Cómo es el examen
- **Formato**: 100% práctico, 15-20 ejercicios en **2 horas**, sobre varios clusters reales.
- **Puntuación**: se aprueba con un 66%; cada pregunta indica su peso.
- **Documentación permitida**: una pestaña con [kubernetes.io/docs](https://kubernetes.io/docs/) y los sitios oficiales (incluida la doc de Helm).
- **Incluye**: un retake gratuito y dos sesiones del simulador killer.sh. Validez de 2 años.
- **Sin requisitos previos** (a diferencia de la CKS, que exige la CKA).

La diferencia de carácter con el CKA: menos administración de cluster (no hay etcd, ni kubeadm, ni nodos rotos) y más volumen de ejercicios cortos de crear y configurar recursos. El CKAD se gana con **dedos rápidos**.

## Temario oficial y dónde lo hemos cubierto
| Dominio | Peso | Capítulos del curso |
|---------|------|---------------------|
| Diseño y construcción de aplicaciones | 20% | [106](/article/kubernetes/105-pods/), [109](/article/kubernetes/108-daemonsets-y-statefulsets/), [110](/article/kubernetes/109-jobs-y-cronjobs/), [301](/article/kubernetes/301-pods-initcontainers/), [302](/article/kubernetes/302-multicontainer-sidecars/), [116](/article/kubernetes/115-almacenamiento-pv-pvc/) |
| Despliegue de aplicaciones | 20% | [108](/article/kubernetes/107-deployments/), [303](/article/kubernetes/303-canary-blue-green-deployments/), [125](/article/kubernetes/124-helm-package-manager/) |
| Observabilidad y mantenimiento | 15% | [114](/article/kubernetes/113-probes-healthchecks/), [124](/article/kubernetes/123-logging-y-monitoreo/), [306](/article/kubernetes/306-troubleshooting-aplicaciones/), [203](/article/kubernetes/203-apis-tls-seguridad-control-plane/) (deprecaciones de API) |
| Configuración y entorno de aplicaciones | 25% | [115](/article/kubernetes/114-secrets-y-configmaps/), [117](/article/kubernetes/116-limitranges-y-resourcequotas/), [118](/article/kubernetes/117-autoscaling-hpa-vpa/), [120](/article/kubernetes/119-usuarios-y-autenticacion/) (service accounts), [119](/article/kubernetes/118-seguridad-serviceaccounts/) (security context) |
| Servicios y redes | 20% | [111](/article/kubernetes/110-services/), [112](/article/kubernetes/111-ingress-controllers/), [304](/article/kubernetes/304-coredns-resolucion-dns/), [119](/article/kubernetes/118-seguridad-serviceaccounts/) (network policies) |

Fijémonos en que gran parte del CKAD vive en la **parte común** del curso: si la trabajamos bien, ya tenemos el 70% hecho.

## La estrategia: imperativo por defecto
En el CKAD, escribir YAML a mano es perder el examen. La secuencia mental para cada ejercicio:

1. ¿Puedo resolverlo **entero** con un comando? (`kubectl run`, `create`, `expose`, `set`, `scale`, `label`, `annotate`...)
2. Si no, genero el esqueleto con `$do` y edito solo lo necesario.
3. Si el recurso no se puede generar (NetworkPolicy, PVC, Ingress...), plantilla de la documentación.

El repertorio imperativo que debe salir solo (todo visto en el curso):
```bash
export do="--dry-run=client -o yaml"

k run nginx --image=nginx --port=80 --env=MODE=prod --labels=app=web $do
k create deployment web --image=nginx --replicas=3 $do
k expose deployment web --port=80 --target-port=8080 --type=NodePort
k create job pi --image=perl -- perl -Mbignum=bpi -wle 'print bpi(100)'
k create cronjob backup --image=busybox --schedule="0 2 * * *" -- sh -c "echo backup"
k create configmap cfg --from-literal=k=v --from-file=app.properties
k create secret generic s --from-literal=pass=1234
k create sa mi-app
k create role r --verb=get,list --resource=pods
k create rolebinding rb --role=r --serviceaccount=default:mi-app
k autoscale deployment web --min=2 --max=8 --cpu-percent=70
k set image deployment/web nginx=nginx:1.27
k set env deployment/web MODE=debug
k set sa deployment/web mi-app
k rollout status/history/undo deployment web
```

Y los tres comandos de inspección que resuelven cualquier duda sin salir de la terminal:
```bash
k explain pod.spec.containers.securityContext   # La spec exacta de cualquier campo
k api-resources                                  # Nombres, grupos y abreviaturas
k get pod x -o yaml | less                       # Qué hay realmente desplegado
```

## Los clásicos que caen (casi) seguro
1. **Pod multi-contenedor con volumen compartido** ([302](/article/kubernetes/302-multicontainer-sidecars/)): app + sidecar sobre un `emptyDir`.
2. **Init container** que prepara algo para el principal ([301](/article/kubernetes/301-pods-initcontainers/)).
3. **ConfigMap/Secret consumido como env y como volumen** ([115](/article/kubernetes/114-secrets-y-configmaps/)).
4. **Probes**: añadir liveness/readiness a un deployment existente ([114](/article/kubernetes/113-probes-healthchecks/)).
5. **Arreglar un pod roto**: CrashLoopBackOff, imagen errónea, OOMKilled ([306](/article/kubernetes/306-troubleshooting-aplicaciones/)).
6. **Canary con dos deployments** y reparto por réplicas ([303](/article/kubernetes/303-canary-blue-green-deployments/)).
7. **SecurityContext**: runAsUser, capabilities, readOnlyRootFilesystem ([119](/article/kubernetes/118-seguridad-serviceaccounts/)).
8. **NetworkPolicy** que permita solo cierto tráfico ([119](/article/kubernetes/118-seguridad-serviceaccounts/)).
9. **Ingress** para un service existente ([112](/article/kubernetes/111-ingress-controllers/)).
10. **Job/CronJob** con completions, parallelism o schedule ([110](/article/kubernetes/109-jobs-y-cronjobs/)).
11. **Service account en un deployment** + RBAC básico ([120](/article/kubernetes/119-usuarios-y-autenticacion/), [121](/article/kubernetes/120-roles-y-rbac/)).
12. **Helm**: instalar, actualizar o hacer rollback de una release ([125](/article/kubernetes/124-helm-package-manager/)).
13. **Deprecaciones de API**: actualizar un manifiesto con apiVersion antigua ([203](/article/kubernetes/203-apis-tls-seguridad-control-plane/)).

## Plan de entrenamiento
1. **Práctica diaria corta**: el CKAD premia la memoria muscular. Mejor 30 minutos al día de ejercicios imperativos que un atracón semanal.
2. **[Killercoda CKAD](https://killercoda.com/killer-shell-ckad)**: escenarios gratuitos por tema.
3. **[killer.sh](https://killer.sh/)**: las dos sesiones incluidas. Más difícil que el examen real: usémoslo para calibrar tiempos, no para hundirnos la moral.
4. **Cronometra todo**: si un ejercicio básico (deployment + service + probe) nos lleva más de 4-5 minutos, repitámoslo hasta que no.

## El día del examen
Los mismos consejos logísticos del [CKA](/article/kubernetes/208-preparacion-examen-cka/) aplican (proctor, identificación, sala). Específicos del CKAD:
- **Contexto y namespace**: cada pregunta indica ambos. `kubectl config set-context --current --namespace=<ns>` nada más empezar el ejercicio.
- **Triaje agresivo**: con tantos ejercicios cortos, saltar rápido lo que se atasca es aún más rentable que en el CKA.
- **Verifica el estado final**: pod `Running`, endpoints poblados, rollout completado. Es lo que puntúa.

¡A por ello! Y si después queremos el cinturón completo: [CKA](/article/kubernetes/208-preparacion-examen-cka/) para administrar el cluster y [CKS](/article/kubernetes/408-preparacion-examen-cks/) para asegurarlo.

---
