---
title: "Submodules y Subtrees"
category: "Git Avanzado"
tags: ["git", "submodules", "subtrees", "iac", "modulos"]
description: "Estrategias para compartir código o módulos de Infraestructura como Código (IaC) entre repositorios."
---

# Git Submodules y Subtrees 📦

Cuando empezamos a escalar la IaC (Terraform, Ansible, etc.), nos damos cuenta de que copiamos y pegamos mucho código. Queremos tener un repo central con "Módulos Core" y consumirlos en repos de proyectos específicos. Git nos da dos herramientas nativas para esto: **Submodules** y **Subtrees**. 

Veamos cuál te conviene usar.

## Git Submodules (El puntero estricto)

Un submodule es un repositorio Git anidado dentro de otro. El repo "padre" no guarda los archivos del submodule, solo guarda la URL del repo y el hash exacto del commit que estás usando.

**Ideal para:** Módulos de Terraform mantenidos por otro equipo, donde querés estar anclado a una versión específica y no mezclar historiales.

### Agregar un submodule
```bash
# git submodule add <url> <ruta-local>
git submodule add git@github.com:tu-org/tf-modules.git infra/modules/core
git commit -m "build: agregar submódulo tf-modules"
```

### Clonar un repo que tiene submodules
Si clonas normal, la carpeta del submódulo viene vacía. Tenés que inicializarlos:
```bash
git clone --recurse-submodules git@github.com:tu-org/mi-proyecto.git

# O si ya clonaste sin saber:
git submodule update --init --recursive
```

### Actualizar el submodule
```bash
cd infra/modules/core
git fetch
git checkout v2.1.0 # Te anclas a un tag o rama
cd ../../../
git commit -am "build: bump tf-modules a v2.1.0"
```

> [!WARNING]
> Los submodules pueden ser un dolor de cabeza en CI/CD si no configuras los permisos correctamente (tu runner necesita acceso a ambos repos). Además, es fácil olvidarse de pushear el repo hijo antes de actualizar el puntero en el repo padre.

## Git Subtree (La copia integrada)

A diferencia de los submodules, un subtree copia los archivos y el historial del repo hijo directamente en el repo padre. 

**Ideal para:** Módulos compartidos donde vos mismo haces cambios frecuentes y querés todo integrado de forma transparente (si alguien clona, ya tiene todo sin comandos extra).

### Agregar un subtree
```bash
# git subtree add --prefix <ruta> <url> <rama> --squash
git subtree add --prefix infra/modulos-compartidos git@github.com:tu-org/ansible-roles.git master --squash
```
El `--squash` comprime todo el historial del repo externo en un solo commit para no ensuciarte tu propio log.

### Traer cambios externos (Pull)
Si el equipo de `ansible-roles` actualizó el código:
```bash
git subtree pull --prefix infra/modulos-compartidos git@github.com:tu-org/ansible-roles.git master --squash
```

### Enviar cambios (Push)
Si arreglaste algo del rol dentro de tu repo padre y querés devolverle el favor al repo original:
```bash
git subtree push --prefix infra/modulos-compartidos git@github.com:tu-org/ansible-roles.git fix/bug-nginx
```

**Resumen de Techlead:** Si el módulo es de terceros o estrictamente inmutable, usá **Submodules**. Si vas a tocar el código seguido y querés que clonar sea rápido para los jrs, meté **Subtrees**.
