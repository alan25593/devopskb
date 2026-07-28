---
title: "Service Mesh: Istio y Linkerd"
category: "Kubernetes"
tags: ["Service Mesh", "Istio", "Linkerd", "mTLS", "Networking"]
description: "Implementación de Service Mesh, mTLS y gestión de tráfico avanzado en K8s."
---

# Service Mesh (Istio / Linkerd)

¡Qué pasa equipo! Hoy toca un tema avanzado. Cuando pasas de tener 5 microservicios a tener 50, te empiezas a volver loco con algunas preguntas: 
- ¿Quién está llamando a quién?
- ¿Cómo cifro el tráfico entre el servicio A y el servicio B?
- ¿Cómo hago despliegues Canary sin romper producción?

Para todo eso, usamos un **Service Mesh**.

## ¿Qué demonios es un Service Mesh?

Un Service Mesh es una capa de infraestructura dedicada a manejar las comunicaciones servicio a servicio. Lo logra inyectando un contenedor proxy (normalmente Envoy) como *sidecar* en cada uno de tus Pods. 

Tus aplicaciones no saben nada de esto. Tu app en Java hace una llamada HTTP a http://mi-backend. El proxy sidecar intercepta la llamada, le pone cifrado (mTLS), hace balanceos de carga inteligentes, saca métricas y se lo manda al proxy del otro pod. ¡Pura magia negra de networking!

## Istio: El peso pesado

Istio es probablemente el Service Mesh más popular, tiene de todo, pero también puede ser un dolor de cabeza administrarlo al principio.

**Características top:**
- **Traffic Routing avanzado:** Puedes rutear tráfico por headers, cookies, pesos (ej: 90% a V1, 10% a V2).
- **Chaos Engineering:** Puedes inyectar delays o errores HTTP 500 a propósito para ver cómo reacciona tu sistema.
- **Circuit Breakers y Retries:** Evitas fallos en cascada.

### Ejemplo: Despliegue Canary con Istio (VirtualService)

Con Istio usas `VirtualServices` y `DestinationRules`. Así se ve un ruteo donde mandamos el 10% del tráfico a la nueva versión canaria:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: mi-servicio-routing
spec:
  hosts:
  - mi-backend
  http:
  - route:
    - destination:
        host: mi-backend
        subset: v1
      weight: 90
    - destination:
        host: mi-backend
        subset: v2-canary
      weight: 10
```

## Linkerd: El rápido y furioso

Si Istio te parece mucho monstruo, **Linkerd** es tu mejor amigo. Es ultraliviano (sus proxies están escritos en Rust, no usan Envoy), su enfoque es "que funcione fuera de la caja en 5 minutos" y el dashboard que trae por defecto es una delicia.

Se instala súper rápido:
```bash
# Instala el CLI
curl --proto '=https' --tlsv1.2 -sSfL https://run.linkerd.io/install | sh

# Chequea que tu cluster esté listo
linkerd check --pre

# Instálalo
linkerd install --crds | kubectl apply -f -
linkerd install | kubectl apply -f -
```

Y para inyectarlo en tus namespaces, solo agregas una label:
`kubectl annotate namespace prod linkerd.io/inject=enabled`

## mTLS por defecto (Zero Trust)

Una de las razones más grandes por las que Seguridad (SecOps) nos obliga a meter un Mesh es el **mTLS (Mutual TLS)**. 
Con Istio o Linkerd, el tráfico entre tus Pods viaja encriptado. Si un atacante entra a tu red e intenta sniffear el tráfico, solo verá basura cifrada. Todo sin que tú toques una sola línea de código en tus aplicaciones.

## Consejos del Techlead

1. **No lo uses si no lo necesitas:** ¿Tienes un monolito o 3 servicios simples? Huye del Service Mesh. Añade latencia (mínima, pero añade), consumo de recursos y complejidad operativa.
2. **Cuidado con los recursos:** Recuerda que ahora CADA pod tiene un contenedor extra corriendo a su lado. Ajusta los limits y requests del proxy.
3. **Observabilidad gratis:** Aprovecha que el proxy intercepta todo. Conéctalo a Jaeger/Zipkin y a Grafana para tener Distributed Tracing y ver exactamente dónde está el cuello de botella.
