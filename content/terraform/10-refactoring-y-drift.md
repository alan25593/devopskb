---
title: "Refactorización y Drift Management con Terraform"
category: "Terraform"
tags: ["terraform", "refactoring", "drift", "moved block"]
description: "Cómo usar el bloque moved para refactorizar sin romper nada y lidiar con el drift."
---

¡Qué onda! Si alguna vez te tocó renombrar un recurso en Terraform y te diste cuenta de que te lo quería destruir y volver a crear, sabes que es un dolor de cabeza. Para eso existe el bloque `moved`. 

### El bloque `moved`

Antes, si querías cambiar el nombre de un recurso en tu código sin que Terraform lo destruyera, tenías que usar comandos de CLI tipo `terraform state mv`. Ahora, la onda es usar el bloque `moved` directo en tu código. Es más limpio, queda registrado en el historial de git y tus compas pueden ver qué pasó.

**Ejemplo clásico:**
Imagina que tienes una instancia EC2 con un nombre medio feo:

```hcl
resource "aws_instance" "servidor_web_1" {
  ami           = "ami-123456"
  instance_type = "t3.micro"
}
```

Y lo quieres cambiar a `web_primary`. En lugar de solo cambiar el nombre y rezar, haces esto:

```hcl
resource "aws_instance" "web_primary" {
  ami           = "ami-123456"
  instance_type = "t3.micro"
}

moved {
  from = aws_instance.servidor_web_1
  to   = aws_instance.web_primary
}
```

Cuando corras el `terraform plan`, te va a decir que el recurso se movió, no que se destruye. ¡Magia pura y cero downtime!

### Drift Management

El "drift" pasa cuando alguien (cof cof, un dev apurado) cambia algo directo en la consola de AWS saltándose Terraform. Para arreglar esto:

1. Corre `terraform plan`. Ahí vas a ver exactamente qué cambió afuera.
2. Si el cambio en la consola era necesario, actualiza tu código para que coincida.
3. Si el cambio fue un error, corre `terraform apply` y Terraform va a planchar los cambios manuales y dejar todo como dice el código.

¡No dejes que el drift se acumule, arréglalo rápido antes de que sea inmanejable!
