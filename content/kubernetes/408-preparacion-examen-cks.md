---
title: "Preparación del Examen CKS - Estrategia, Temario y Simulacros"
category: "kubernetes"
description: "Guía definitiva para aprobar el examen CKS (Certified Kubernetes Security Specialist) - temario oficial, estrategia, herramientas (trivy, kube-bench, falco), simuladores y recursos de práctica."
tags:
  - "kubernetes"
  - "CKS"
  - "certificación"
  - "examen"
keywords:
  - "CKS examen"
  - "certified kubernetes security specialist"
  - "preparar CKS"
  - "aprobar CKS"
  - "CKS temario"
  - "killer.sh CKS"
  - "CKS consejos"
  - "trivy kube-bench falco"
  - "certificación seguridad kubernetes"
  - "CKS español"
---

# Preparación del examen CKS

Fin de trayecto de la especialización de seguridad, y del curso completo. El **CKS (Certified Kubernetes Security Specialist)** tiene fama de ser el examen más duro de los tres, y la fama es merecida: presupone que ya somos administradores (la **CKA en vigor es requisito** para presentarse) y añade encima todo el arsenal de seguridad.

## Cómo es el examen
- **Formato**: 100% práctico, ~15-16 ejercicios en **2 horas**, sobre varios clusters.
- **Aprobado**: 67%. Incluye un retake y dos sesiones de killer.sh. Validez de 2 años.
- **Requisito**: certificación CKA activa en el momento de presentarse.
- **Documentación permitida**: kubernetes.io/docs y, además, la documentación oficial de las herramientas del temario: **Trivy, Falco, etcd y el App Armor wiki** (la lista exacta está en las instrucciones del examen; revisémosla porque cambia entre versiones).

La diferencia de carácter: el CKS mezcla ejercicios de Kubernetes con trabajo **en los nodos** (editar configs del kubelet, cargar perfiles AppArmor, ejecutar binarios como kube-bench o trivy). Si el CKAD era velocidad y el CKA administración, el CKS es **amplitud**: muchas herramientas distintas, cada una con su liturgia.

## Temario oficial y dónde lo hemos cubierto
| Dominio | Peso | Capítulos del curso |
|---------|------|---------------------|
| Cluster setup | 15% | [401](/article/kubernetes/401-cis-benchmarks-kube-bench/), [403](/article/kubernetes/403-network-policies-avanzadas/), [112](/article/kubernetes/111-ingress-controllers/), [203](/article/kubernetes/203-apis-tls-seguridad-control-plane/) |
| Cluster hardening | 15% | [120](/article/kubernetes/119-usuarios-y-autenticacion/), [121](/article/kubernetes/120-roles-y-rbac/), [203](/article/kubernetes/203-apis-tls-seguridad-control-plane/), [204](/article/kubernetes/204-certificados-pki-autenticacion/), [201](/article/kubernetes/201-mantenimiento-etcd-backup/) (upgrades) |
| System hardening | 10% | [405](/article/kubernetes/405-apparmor-seccomp-capabilities/), [402](/article/kubernetes/402-runtime-class-gvisor-kata/), [403](/article/kubernetes/403-network-policies-avanzadas/) |
| Minimizar vulnerabilidades de microservicios | 20% | [119](/article/kubernetes/118-seguridad-serviceaccounts/), [404](/article/kubernetes/404-admission-controllers-webhooks/), [407](/article/kubernetes/407-opa-gatekeeper-kyverno/), [115](/article/kubernetes/114-secrets-y-configmaps/), [305](/article/kubernetes/305-service-mesh-istio-linkerd/) (mTLS) |
| Seguridad de la cadena de suministro | 20% | [401](/article/kubernetes/401-cis-benchmarks-kube-bench/) y este capítulo (trivy, validación de imágenes, SBOM) |
| Monitorización, logging y seguridad en runtime | 20% | [406](/article/kubernetes/406-falco-runtime-security/), [124](/article/kubernetes/123-logging-y-monitoreo/), auditoría (este capítulo) |

## Las dos piezas que faltan
Dos temas del examen que no tienen capítulo propio y cierran el temario:

### Escaneo de imágenes con Trivy
[Trivy](https://trivy.dev/), de Aqua Security, es el escáner de vulnerabilidades del examen. Lo que nos pedirán: escanear imágenes y actuar según la severidad.
```bash
# Escanear una imagen buscando vulnerabilidades críticas y altas
trivy image --severity CRITICAL,HIGH nginx:1.19

# El ejercicio típico: de estos deployments, encuentra cuáles usan imágenes con CVEs críticos
kubectl get pods -A -o jsonpath='{range .items[*]}{.spec.containers[*].image}{"\n"}{end}' | sort -u
trivy image --severity CRITICAL <cada-imagen>
```
Completa la foto de cadena de suministro: imágenes mínimas y de registries de confianza ([ImagePolicyWebhook](/article/kubernetes/404-admission-controllers-webhooks/), políticas de [Gatekeeper](/article/kubernetes/407-opa-gatekeeper-kyverno/)), escaneadas (trivy) y, en entornos serios, firmadas (cosign/sigstore, de momento fuera del examen).

### Audit logging del API server
El registro de auditoría graba **quién hizo qué** en la API. Se configura con una *audit policy* y flags del API server:
```yaml
# /etc/kubernetes/audit/policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
- level: Metadata          # None | Metadata | Request | RequestResponse
  resources:
  - group: ""
    resources: ["secrets"]
- level: None
  users: ["system:kube-proxy"]
```
```yaml
# En kube-apiserver.yaml
- --audit-policy-file=/etc/kubernetes/audit/policy.yaml
- --audit-log-path=/var/log/kubernetes/audit/audit.log
- --audit-log-maxage=30
- --audit-log-maxbackup=10
```
Recordemos (¡static pod!) montar los paths con volúmenes hostPath, igual que en [ImagePolicyWebhook](/article/kubernetes/404-admission-controllers-webhooks/). Y practiquemos leer el log: es JSON por línea, `jq` es nuestro amigo.

## Los clásicos que caen (casi) seguro
1. **kube-bench**: ejecutar, interpretar y remediar (API server, kubelet) ([401](/article/kubernetes/401-cis-benchmarks-kube-bench/)).
2. **RBAC de mínimo privilegio**: recortar un rol excesivo, service accounts sin automount ([121](/article/kubernetes/120-roles-y-rbac/), [120](/article/kubernetes/119-usuarios-y-autenticacion/)).
3. **NetworkPolicies**: default-deny + excepciones, metadata service bloqueado ([403](/article/kubernetes/403-network-policies-avanzadas/)).
4. **Pod Security Standards**: etiquetar namespaces con enforce/warn/audit ([119](/article/kubernetes/118-seguridad-serviceaccounts/)).
5. **SecurityContext completo**: runAsNonRoot, readOnlyRootFilesystem, drop ALL ([119](/article/kubernetes/118-seguridad-serviceaccounts/)).
6. **RuntimeClass con gVisor** y verificación con uname ([402](/article/kubernetes/402-runtime-class-gvisor-kata/)).
7. **AppArmor/seccomp**: cargar perfil y aplicarlo a un pod ([405](/article/kubernetes/405-apparmor-seccomp-capabilities/)).
8. **Falco**: identificar el pod ruidoso y ajustar el output de una regla ([406](/article/kubernetes/406-falco-runtime-security/)).
9. **Trivy**: escanear y eliminar/actualizar lo vulnerable (este capítulo).
10. **Audit policy**: configurarla de cero (este capítulo).
11. **Secrets**: leerlos/decodificarlos, cifrado en reposo con EncryptionConfiguration ([115](/article/kubernetes/114-secrets-y-configmaps/), [203](/article/kubernetes/203-apis-tls-seguridad-control-plane/)).
12. **ImagePolicyWebhook**: la cadena completa de ficheros ([404](/article/kubernetes/404-admission-controllers-webhooks/)).
13. **Actualizar el cluster** a una versión parcheada ([201](/article/kubernetes/201-mantenimiento-etcd-backup/)).
14. **Certificados y CSR**: firmar usuarios, revisar caducidades ([204](/article/kubernetes/204-certificados-pki-autenticacion/)).

## Estrategia específica del CKS
- **El tiempo aprieta más que en la CKA**: los ejercicios tocan muchos ficheros del nodo. Memoricemos las rutas: `/etc/kubernetes/manifests/`, `/var/lib/kubelet/config.yaml`, `/etc/falco/`, `/var/lib/kubelet/seccomp/`, `/etc/apparmor.d/`.
- **Cuando toquemos el API server, verifiquemos que vuelve**: tras editar su manifiesto, `watch crictl ps` hasta verlo arriba. Un API server roto nos bloquea el resto de la pregunta (y de las siguientes en ese cluster).
- **Copias de seguridad antes de editar**: `cp kube-apiserver.yaml /tmp/` nos salva el examen cuando un cambio sale mal. Hábito innegociable.
- **No reinventemos Rego ni perfiles**: en el examen, las políticas de Gatekeeper y los perfiles AppArmor vienen casi hechos; nuestro trabajo es completarlos o aplicarlos. Aprendamos a *leerlos* con soltura.
- El resto de la liturgia (triaje, contextos, `$do`) es la misma de [CKA](/article/kubernetes/208-preparacion-examen-cka/) y [CKAD](/article/kubernetes/307-preparacion-examen-ckad/).

## Plan de entrenamiento
1. **Repasemos la especialización entera ejecutando**: cada herramienta (kube-bench, trivy, falco, gatekeeper) instalada y usada al menos dos veces en nuestro laboratorio.
2. **[Killercoda CKS](https://killercoda.com/killer-shell-cks)**: escenarios gratuitos por tema, imprescindibles aquí porque montan las herramientas por nosotros.
3. **[killer.sh CKS](https://killer.sh/)**: las dos sesiones incluidas. En el CKS es especialmente valioso porque reproduce los ejercicios de nodos.
4. **Leamos las guías oficiales**: el [CIS Benchmark](/article/kubernetes/401-cis-benchmarks-kube-bench/), la guía de hardening de la NSA/CISA y los security checklists de kubernetes.io alimentan directamente las preguntas.

## El día del examen
Misma logística que las anteriores (proctor, identificación, sala despejada). Específico del CKS: respiremos cuando entremos en los nodos por SSH; medio examen ocurre fuera de kubectl y es donde los nervios pierden exámenes. Ficheros → backup → editar → verificar → siguiente.

Y ya está. Si hemos llegado hasta aquí con las tres certificaciones (o sin ellas, pero con todo el curso practicado), tenemos un perfil que muy pocos equipos dejarían escapar: sabemos desplegar, administrar y **asegurar** Kubernetes. Gracias por navegar hasta el final, almirante. ⚓

---
