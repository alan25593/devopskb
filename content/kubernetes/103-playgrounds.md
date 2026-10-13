---
title: "Kubernetes Playgrounds - Minikube, k3s, Docker Desktop y Entornos de Prueba"
category: "kubernetes"
description: "Aprende a instalar Kubernetes en entornos locales y playgrounds gratuitos - Minikube, k3s, Docker Desktop, Rancher Desktop, Play with Kubernetes y más."
tags:
  - "kubernetes"
  - "- minikube"
  - "- k3s"
  - "- playground"
  - "- desarrollo"
keywords:
  - "kubernetes minikube"
  - "- k3s kubernetes"
  - "- docker desktop kubernetes"
  - "- rancher desktop kubernetes"
  - "- play with kubernetes"
  - "- kubernetes playground gratis"
  - "- kubernetes local desarrollo"
  - "- instalar minikube"
  - "- k3s instalación"
  - "- kind kubernetes"
  - "- entorno kubernetes local"
  - "- probar kubernetes gratis"
---

# Instalaciones para pocos recursos o entornos de pruebas gratuitos
En este capítulo veremos opciones centradas en desplegar rápidamente clusters de Kubernetes, principalmente orientadas a entornos de pruebas o desarrollo.

En el capítulo anterior está [la guía de instalación para entornos productivos y de mayor tamaño](./103.Instalacion.md).

De todas las opciones que veremos, solo k3s es recomendable para entornos de producción (pequeños). Minikube, Docker Desktop y similares no están pensados para producción.

Además, si nuestro equipo no cumple los requisitos, o queremos seguir el curso sin instalar nada, podemos usar entornos de "playground", que nos ofrecen un cluster de Kubernetes en la nube de forma gratuita.

## Playgrounds y minikube
Para empezar, podemos usar entornos de "playground" que nos ofrecen un cluster de Kubernetes en la nube de forma gratuita. Ya sé que no es un método de instalación, pero es una forma de empezar a trastear sin tener que montar nada y quería mencionarlo. El más popular es [Killercoda](https://killercoda.com/playgrounds), que además es el entorno en el que se basan los simuladores de los exámenes de certificación.

Aquí cabe destacar también una de las formas más sencillas de tener un cluster de Kubernetes en nuestro equipo: minikube. Minikube es una herramienta que permite ejecutar un cluster de Kubernetes en un único nodo, ideal para entornos de desarrollo o pruebas. Además de ser multiplataforma, tiene una capa de addons que permite añadir funcionalidades extra al cluster (como el dashboard o un registry) de forma muy sencilla.

## Docker Desktop
¿Kubernetes en Docker? Pues claro, ¿por qué no? Ya hemos visto que los propios servicios de Kubernetes también se ejecutan en contenedores (salvo el kubelet), así que no es en absoluto descabellado.

También podríamos usar Rancher Desktop o Podman Desktop. Con cualquiera de ellos, con un solo click, podemos tener un cluster de Kubernetes en nuestro equipo sin mucha complicación.

## k3s
Por último, veremos k3s, una distribución de Kubernetes ligera y fácil de instalar, ideal para entornos de producción pequeños o entornos de pruebas.

Esta distribución nos permite tener un cluster de múltiples nodos en varios equipos. ---
