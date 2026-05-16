---
title: "Kubernetes Networking: Services, Ingress, DNS y NetworkPolicy"
category: "kubernetes"
tags: ["networking", "services", "ingress", "dns", "networkpolicy"]
keywords: ["service kubernetes", "clusterip kubernetes", "nodeport kubernetes", "loadbalancer kubernetes", "ingress kubernetes", "dns kubernetes", "comunicacion entre pods", "networkpolicy kubernetes", "exponer aplicacion kubernetes", "headless service", "ingress nginx", "ingress controller", "service mesh"]
description: "Tipos de Services en Kubernetes, routing HTTP con Ingress, DNS interno del cluster y políticas de red para aislar tráfico entre namespaces."
---

# Kubernetes Networking

## Contenido

- [Cómo funciona la red en Kubernetes](#cómo-funciona-la-red-en-kubernetes)
- [Services](#services)
- [DNS interno del cluster](#dns-interno-del-cluster)
- [Ingress — routing HTTP externo](#ingress-—-routing-http-externo)
- [NetworkPolicy — firewall entre Pods](#networkpolicy-—-firewall-entre-pods)
- [Comandos útiles de networking](#comandos-útiles-de-networking)

---

## Cómo funciona la red en Kubernetes

Cada Pod recibe su propia IP. Los Pods pueden comunicarse entre sí directamente, pero esas IPs son efímeras — cuando un Pod muere y se recrea, cambia de IP. Los **Services** resuelven esto: proveen una IP virtual estable y DNS que enruta hacia los Pods que matchean sus labels.

---

## Services

### ClusterIP — acceso interno al cluster (default)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mi-app
  namespace: mi-app
spec:
  type: ClusterIP        # solo accesible dentro del cluster
  selector:
    app: mi-app          # enruta a Pods con este label
  ports:
    - name: http
      port: 80           # puerto del Service
      targetPort: 3000   # puerto del contenedor
      protocol: TCP
```

### NodePort — expone en un puerto de cada nodo

```yaml
spec:
  type: NodePort
  selector:
    app: mi-app
  ports:
    - port: 80
      targetPort: 3000
      nodePort: 30080    # puerto en el host (30000-32767), si no se especifica se asigna uno random
```

Acceso: `http://<IP-del-nodo>:30080` — útil para testing, no para producción.

### LoadBalancer — provisiona un LB externo del cloud

```yaml
spec:
  type: LoadBalancer
  selector:
    app: mi-app
  ports:
    - port: 443
      targetPort: 3000
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
```

### Headless Service — DNS sin IP virtual (para StatefulSets)

```yaml
spec:
  clusterIP: None       # sin IP virtual — el DNS devuelve las IPs de los Pods directamente
  selector:
    app: postgres
  ports:
    - port: 5432
```

Con un headless service, `postgres-0.postgres-headless.databases.svc.cluster.local` resuelve directamente al Pod 0.

### ExternalName — alias DNS a un servicio externo

```yaml
spec:
  type: ExternalName
  externalName: mi-base-de-datos.rds.amazonaws.com
```

---

## DNS interno del cluster

Formato: `<service>.<namespace>.svc.cluster.local`

```bash
# Desde dentro de un Pod, estos son equivalentes:
curl http://mi-app                              # mismo namespace
curl http://mi-app.mi-app                      # namespace explícito
curl http://mi-app.mi-app.svc                  # con svc
curl http://mi-app.mi-app.svc.cluster.local    # FQDN completo

# Verificar DNS desde un Pod de debug
kubectl run dns-debug --image=busybox --rm -it --restart=Never -- nslookup mi-app
kubectl run dns-debug --image=busybox --rm -it --restart=Never -- nslookup kubernetes.default
```

---

## Ingress — routing HTTP externo

El Ingress define reglas de routing HTTP/HTTPS. Necesita un **Ingress Controller** instalado (nginx, Traefik, AWS ALB, etc.).

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mi-app-ingress
  namespace: mi-app
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.empresa.com
      secretName: api-empresa-tls    # cert-manager lo crea automáticamente
  rules:
    - host: api.empresa.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 80
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend-service
                port:
                  number: 80
```

Instalar nginx ingress controller:
```bash
helm upgrade --install ingress-nginx ingress-nginx \
  --repo https://kubernetes.github.io/ingress-nginx \
  --namespace ingress-nginx --create-namespace
```

---

## NetworkPolicy — firewall entre Pods

Por defecto, todos los Pods se comunican entre sí sin restricciones. NetworkPolicy permite definir qué tráfico se permite.

```yaml
# Denegar todo el tráfico entrante al namespace por defecto
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-ingress
  namespace: mi-app
spec:
  podSelector: {}     # aplica a todos los Pods del namespace
  policyTypes:
    - Ingress
  # sin reglas ingress = denegar todo
```

```yaml
# Permitir solo que el namespace "frontend" llegue al "backend"
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: backend
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: frontend
          podSelector:
            matchLabels:
              app: web
      ports:
        - protocol: TCP
          port: 3000
```

```yaml
# Permitir solo salida a la base de datos
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-egress
  namespace: mi-app
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: databases
      ports:
        - protocol: TCP
          port: 5432
    - to:     # permitir DNS
        - namespaceSelector: {}
      ports:
        - protocol: UDP
          port: 53
```

---

## Comandos útiles de networking

```bash
# Ver los endpoints (IPs de Pods) detrás de un Service
kubectl get endpoints mi-app -n mi-app

# Ver las reglas de Ingress
kubectl get ingress -A
kubectl describe ingress mi-app-ingress -n mi-app

# Testear conectividad desde dentro del cluster
kubectl run test --image=curlimages/curl --rm -it --restart=Never -- \
  curl http://mi-app.mi-app.svc.cluster.local/health

# Ver NetworkPolicies activas
kubectl get networkpolicies -A

# Ver los logs del Ingress Controller
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx -f
```
