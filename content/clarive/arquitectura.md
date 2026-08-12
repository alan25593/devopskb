---
title: "Arquitectura y Conceptos Base"
category: "clarive"
tags: ["clarive", "arquitectura", "alm", "devops"]
---

# Arquitectura de Clarive

Clarive es una solución escalable basada en repositorios para DevOps y Application Lifecycle Management (ALM). Entender sus componentes principales es clave para operar la plataforma y diagnosticar problemas.

## Componentes Principales

1. **Automation Server (Dispatcher/Daemon)**
   Es el motor central responsable de la planificación de trabajos, ejecución, gestión de despliegues y comunicación con los agentes. También maneja la integración con herramientas externas (SCM, CMDB, etc.).
   
2. **Web Server**
   Provee la interfaz de usuario principal (Web Client) y expone los servicios SOAP y REST. Está basado en el framework Catalyst (Perl) y puede correr como servicio independiente o bajo servidores web empresariales.

3. **Web Client**
   Es una aplicación SPA (Single-Page Application) dinámica en el navegador para gestionar kanbans, releases y pipelines.

4. **Communication Agents**
   Agentes que facilitan la construcción y despliegue real de las aplicaciones comunicándose con los servidores a través de la red (vía protocolos propietarios o SSH).

5. **Base de Datos (MongoDB)**
   Almacena toda la configuración, los datos del modelo (CIs, Tópicos), los eventos de la cola y los estados.

## Interfaces de Customización
Clarive ofrece una alta flexibilidad para extenderse mediante:
- **APIs & DSL**: Una API robusta (Perl/JavaScript) para programar plugins, módulos de CI y reglas custom.
- **Web Services**: Endpoints REST/SOAP para interactuar desde el exterior.
- **Autenticación**: Soporte estándar para integrarse con LDAP, AD y sistemas SSO (SAML, CAS).
