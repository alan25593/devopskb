---
title: "Seguridad Runtime y Policy Engine"
category: "Kubernetes"
tags: ["Security", "Kyverno", "OPA", "Falco", "DevSecOps"]
description: "Asegurando tu cluster en tiempo real con Kyverno, OPA Gatekeeper y Falco."
---

# Seguridad en Runtime y Policy Engines

¡Hola equipo! El cluster de Kubernetes por defecto es como una casa con las puertas abiertas. Los developers a veces hacen cosas que no deberían: levantan contenedores como `root`, bajan imágenes de registries públicos dudosos o no le ponen límites a la CPU. 

Para evitar que nos tiren el cluster (o nos hackeen), necesitamos poner reglas de juego. Y para vigilar, necesitamos cámaras de seguridad. Vamos a hablar de **Policy Engines** (Kyverno/OPA) y **Seguridad en Runtime** (Falco).

## Policy Engines: El Guardia de Seguridad en la Puerta

Los Admission Controllers en Kubernetes interceptan la llamada a la API *antes* de que el Pod se cree. Los Policy Engines se enganchan ahí para decir "¡Alto! Este manifiesto incumple las reglas de la empresa".

### OPA Gatekeeper

OPA (Open Policy Agent) es el estándar súper flexible, pero la curva de aprendizaje es durilla porque tienes que aprender un lenguaje nuevo llamado `Rego`.

### Kyverno: El favorito del pueblo

Kyverno es la gloria. Está diseñado específicamente para Kubernetes, y las políticas se escriben en YAML puro y duro, nada de lenguajes raros. Puedes **Validar**, **Mutar** (modificar al vuelo) o **Generar** recursos.

**Ejemplo: Forzar a que ningún contenedor corra como Root**

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: disallow-root-user
spec:
  validationFailureAction: Enforce # "Audit" si solo quieres avisar sin bloquear
  rules:
  - name: validate-runAsNonRoot
    match:
      any:
      - resources:
          kinds:
          - Pod
    validate:
      message: "¡Eh! Está prohibido correr contenedores como root. Define runAsNonRoot: true"
      pattern:
        spec:
          securityContext:
            runAsNonRoot: true
          =(containers):
          - =(securityContext):
              =(runAsNonRoot): true
```

Si alguien hace `kubectl apply` con un Pod que es root, Kyverno le escupe un error en la terminal y bloquea la creación. Hermoso.

## Seguridad en Runtime: Las Cámaras de Vigilancia

Si una imagen maligna logra entrar a tu cluster (o un atacante explota una vulnerabilidad web), necesitas saber qué está haciendo ese contenedor en tiempo real.

### Falco (El proyecto de Sysdig)

Falco escucha directamente a nivel del Kernel de Linux (usando eBPF) y mira TODAS las llamadas de sistema (syscalls) que hacen los contenedores. 

Viene con reglas por defecto. Si un contenedor hace algo raro, Falco dispara una alerta de seguridad (a Slack, Datadog, Splunk, etc.).

**Cosas que Falco detecta por defecto:**
- Alguien hace un `kubectl exec -it pod -- bash` y abre una terminal.
- Un contenedor lee `/etc/shadow` o archivos sensibles.
- Un contenedor de Nginx de repente lanza un proceso `curl` para bajar mineros de criptomonedas.
- Modificación de binarios dentro del contenedor en ejecución.

**Ejemplo de regla de Falco:**
```yaml
- rule: Terminal shell in container
  desc: A shell was used as the entrypoint/exec point of a container with an attached terminal.
  condition: >
    spawned_process and container
    and shell_procs and proc.tty != 0
    and container_entrypoint
  output: >
    A shell was spawned in a container with an attached terminal (user=%user.name container_id=%container.id
    image=%container.image.repository)
  priority: NOTICE
```

## Consejos del Techlead

1. **Implementa en modo Auditoría (Audit) primero:** Si instalas Kyverno o Falco en modo `Enforce` en un cluster productivo, vas a romper medio mundo. Ponlos en modo auditoría unas semanas, revisa qué se está bloqueando, avisa a los devs que corrijan sus charts, y luego activa el modo bloqueo.
2. **Shift Left:** Todo esto de las políticas de Kyverno/OPA también debes checkearlo en el pipeline de CI/CD (con herramientas como *Conftest* o el CLI de Kyverno). Es mejor avisarle al dev en su PR, que bloquearle el deploy en Producción y hacerlo sufrir.
3. **Imágenes inmutables:** Obliga a que los root filesystems de tus contenedores sean `readOnlyRootFilesystem: true`. Evita el 90% del malware moderno.
