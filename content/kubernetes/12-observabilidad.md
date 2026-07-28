---
title: "Observabilidad Full-Stack"
category: "Kubernetes"
tags: ["Observability", "Prometheus", "Grafana", "Loki", "Monitoring"]
description: "Monitorización y observabilidad en Kubernetes con kube-prometheus-stack y Loki."
---

# Observabilidad Full-Stack (Prometheus, Grafana, Loki)

¡Buenas! A ver, tener un cluster de K8s corriendo está genial, pero si no tienes ni idea de qué está pasando por debajo, estás pilotando a ciegas. Cuando las cosas exploten (y van a explotar), vas a necesitar logs, métricas y traces. A eso le llamamos **Observabilidad**.

## Kube-Prometheus-Stack: Todo en uno

La forma más rápida y estándar en la industria para monitorear un cluster es instalando el Helm chart de `kube-prometheus-stack`. Esto te despliega de un plumazo:
- **Prometheus:** El cerebro que recolecta las métricas (uso de CPU, memoria, red).
- **Grafana:** El dashboard bonito para visualizar lo que junta Prometheus.
- **Alertmanager:** El encargado de mandarte un mensaje por Slack a las 3 AM cuando el nodo se queda sin disco.
- **Node Exporter & Kube State Metrics:** Agentes que extraen las métricas de los nodos y del estado del cluster.

### Instalación rápida

```bash
# Añadimos el repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Instalamos el stack (crea un namespace de monitoreo)
helm install kube-prometheus prometheus-community/kube-prometheus-stack -n monitoring --create-namespace
```

Ya con eso, entras a Grafana (haces un port-forward o configuras el Ingress) y tienes dashboards pre-armados para ver el estado de tus pods y nodos.

## Custom Metrics y ServiceMonitors

En el mundo de Prometheus + Operator, la forma de decirle a Prometheus que lea las métricas de tu aplicación es usando un CRD llamado `ServiceMonitor`.

Ejemplo para tu app:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: mi-app-monitor
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: mi-app
  endpoints:
  - port: web
    path: /metrics
    interval: 15s
```
Solo asegúrate de que tu app exponga métricas en el path `/metrics` (formato Prometheus) y listo, empezarán a fluir a Grafana.

## Logs centralizados con Loki

Tener métricas es el paso uno. El paso dos es leer logs sin tener que andar haciendo `kubectl logs pod-xyz` como cavernícola.

Aquí entra **Loki**. Está diseñado por Grafana y funciona súper parecido a Prometheus pero para logs. Es muy liviano comparado con ElasticSearch.

Lo instalas junto con **Promtail** (un agente que va en cada nodo agarrando los logs de los contenedores y mandándolos a Loki).

### Configurando Promtail

Normalmente Promtail se despliega como un `DaemonSet`. Captura todo en `/var/log/containers/` y le pone los mismos labels de K8s (namespace, pod_name, container_name) antes de mandarlo a Loki. Así, en Grafana, puedes buscar logs fácilmente:

```logql
# Un query de Loki para buscar errores en el namespace prod:
{namespace="prod"} |= "ERROR" | json | line_format "{{.message}}"
```

## Resumen del Techlead

1. **Usa el stack oficial:** No intentes instalar Prometheus y Grafana por separado a mano. Usa el kube-prometheus-stack.
2. **Afina tus alertas:** No mandes alertas por cualquier pavada. Si te llegan 100 alertas al día, vas a ignorar la número 101, que será la que tire producción. Alerta solo sobre síntomas reales (latencia alta, tasa de errores alta, saturación).
3. **Métricas + Logs = ♥:** En Grafana puedes hacer que al ver un pico de errores en una gráfica, le des clic y te lleve directamente a los logs de Loki de ese instante de tiempo. Configura eso, te salva la vida en los incidentes.
