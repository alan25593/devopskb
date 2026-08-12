---
title: "DevOps: Rulebooks y Pipeline Rules"
category: "clarive"
tags: ["clarive", "ci-cd", "rulebooks", "pipelines"]
keywords: ["clarive rulebooks", "clarive.yml", "pipeline rules", "ci cd clarive", "clarive devops", "despliegues automaticos"]
description: "Cómo implementar Integración y Entrega Continua (CI/CD) en Clarive usando Rulebooks (.clarive.yml) y Reglas de Pipeline basadas en eventos."
---

# CI/CD: Rulebooks y Pipeline Rules

La automatización de DevOps en Clarive se define a través de **reglas basadas en eventos** y archivos de configuración estructurados. El motor de CI/CD es capaz de detectar cambios en el código, transiciones en el tablero Kanban y gatillar despliegues automáticos.

## Rulebooks (`.clarive.yml`)

El corazón de la automatización por repositorio es el **Rulebook**. Funciona como un contrato de infraestructura como código (Pipeline-as-Code).

- Al alojar un archivo `.clarive.yml` en la raíz de tu repositorio, defines exactamente qué operaciones deben ejecutarse para construir, testear y desplegar ese código.
- **Agnóstico al lenguaje**: Los Rulebooks de Clarive pueden ejecutar lógicas programadas en diversos lenguajes (JavaScript, Python, Perl, Bash), lo que permite que los equipos usen las herramientas con las que se sientan más cómodos.
- **Herencia y Reutilización**: Los Rulebooks pueden heredar reglas globales configuradas por el equipo de plataforma en la interfaz web de Clarive. Esto garantiza que todos los microservicios cumplan con escaneos de seguridad obligatorios, sin necesidad de duplicar ese código en cada repo.

## Pipeline Rules

Mientras que el Rulebook define *el qué*, las **Pipeline Rules** definen *el cuándo*. Son los eventos (triggers) que inician un ciclo de trabajo.

Tipos comunes de Pipeline Rules en Clarive:

### 1. Continuous Integration (CI)
Son reglas que se gatillan ante cada `git push` realizado por los desarrolladores.
- Generalmente están configuradas para ejecutarse únicamente cuando el Topic (Issue) se encuentra en estado "In Progress" o "Code Review".
- Disparan procesos como: *Linting*, *Unit Tests*, *SonarQube/SAST*.

### 2. Nightly Builds (Integración Periódica)
Reglas calendarizadas por cron. Se utilizan habitualmente en las ramas de integración (`develop` o `release/vX`) durante la madrugada para correr:
- End-to-end tests (E2E).
- Análisis de vulnerabilidades profundos.
- Compilación de entornos de testeo para que QA los encuentre listos a la mañana siguiente.

### 3. On-Demand Deployment (Despliegues a demanda)
Son reglas que se disparan mediante acciones manuales o cambios de estado del ciclo de vida.
- **Ejemplo**: Cuando un QA aprueba un Topic y lo mueve a la columna "Listo para PROD", Clarive captura ese evento y despliega automáticamente el artefacto en el servidor de producción.
- Clarive suele instanciar contenedores efímeros (Docker) gestionados internamente para ejecutar estos procesos sin ensuciar el Automation Server.

## Estructura típica de una Regla

El motor de Clarive, de manera predeterminada, agrupa las operaciones en tres grandes bloques semánticos:
1. **Build**: Descargar código, compilar, resolver dependencias, linting, tests unitarios y generar artefacto (ej. `.war` o imagen Docker).
2. **Test**: Desplegar a un entorno efímero o de integración y correr pruebas E2E o de humo.
3. **Deploy**: Enviar los archivos finales a los servidores de destino (vía agentes SSH, llamadas a APIs Cloud, o copias directas) e invocar reinicios de servicios.
