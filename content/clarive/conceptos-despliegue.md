---
title: "Conceptos Core: Topics, Natures y Environments"
category: "clarive"
tags: ["clarive", "topics", "natures", "environments"]
keywords: ["clarive topics", "clarive natures", "entornos clarive", "environments clarive", "despliegues", "changeset deployment", "release deployment"]
description: "Fundamentos teóricos del modelo de despliegue en Clarive: cómo se estructuran los Topics, las Natures tecnológicas y los Entornos (Environments)."
---

# Conceptos Core de Despliegue

A diferencia de otras herramientas CI/CD más lineales, Clarive gestiona las entregas utilizando una abstracción orientada a ALM (Application Lifecycle Management). Su arquitectura de despliegue gira en torno a tres grandes pilares: **Topics**, **Natures** y **Environments**.

## Topics (Tópicos)

Un **Topic** es el contenedor principal de los cambios que se van a integrar y desplegar. Puede representar una funcionalidad, un bugfix, una tarea o un release completo.

### Modalidades de Despliegue con Topics
1. **Changeset-based deployment (Por Cambio)**
   En este enfoque, cada Topic está atado directamente a un *commit* o a un conjunto de *commits* (rama feature). Cuando el Topic avanza en el Kanban o es aprobado, se despliegan exclusivamente esos cambios. Ideal para desarrollo ágil y Continuous Delivery.

2. **Release-based deployment (Por Paquete)**
   Un Topic actúa como contenedor paraguas (Release o Proyecto) agrupando decenas de Topics menores. Permite empaquetar una versión mensual de un sistema monolítico, garantizando que todo el código viaje y se testee en conjunto.

## Natures (Naturalezas Tecnológicas)

Clarive utiliza **Natures** para abstraer la tecnología subyacente. En lugar de escribir un script bash hardcodeado para copiar un archivo o compilar código, se le asigna una "Naturaleza" a la aplicación.

Ejemplos comunes de Natures:
- `Java / Maven`
- `Node.js`
- `Docker / Kubernetes`
- `Mainframe`
- `Base de Datos (SQL)`

### ¿Por qué son útiles?
Al estandarizar los repositorios con Natures, los administradores de DevOps pueden escribir **una única Pipeline global**. Cuando la pipeline se ejecuta, consulta la *Nature* del Topic o aplicación y sabe automáticamente si debe invocar a `mvn clean install`, a `npm run build` o ejecutar scripts SQL. Esto fomenta la reutilización extrema y evita tener cientos de pipelines clonadas.

## Environments (Entornos)

Los **Environments** son las estaciones por donde transita el código (ej: `DEV`, `QA`, `UAT`, `PROD`). Clarive es profundamente consciente del entorno ("Environment-aware").

- **Gestión de variables**: Clarive inyecta automáticamente variables específicas del entorno durante la ejecución de los jobs (ej: credenciales de base de datos para QA distintas a las de PROD).
- **Despliegues condicionales**: Dentro de las reglas del despliegue, se puede especificar que ciertas acciones ocurran exclusivamente en un entorno. Por ejemplo: *"Ejecutar purga de caché de CDN solo si el Environment es PROD"*.

## Soporte Multi-Proyecto (Multi-Repo)

Una de las ventajas competitivas de Clarive frente a CI/CDs tradicionales es su capacidad nativa de coordinar **despliegues orquestados multiplataforma**. 
Un único trabajo de despliegue en Clarive puede coordinar el build de un repositorio Frontend (React), la compilación del Backend (Java) y la actualización de un esquema SQL, todo manejado dentro de un gran Topic orquestador, asegurando consistencia transaccional en el release completo.
