---
title: "Policy as Code con OPA y Terraform"
category: "Terraform"
tags: ["terraform", "opa", "policy-as-code", "security"]
description: "Cómo implementar reglas de gobernanza en tu infra con Open Policy Agent (OPA)."
---

¡Hola! Cuando el equipo crece, no puedes estar revisando cada PR de Terraform a mano para ver si alguien dejó el puerto 22 abierto a todo el mundo. Aquí entra **Policy as Code**.

### ¿Qué es OPA (Open Policy Agent)?

OPA es una herramienta open-source que te permite escribir políticas usando un lenguaje llamado **Rego**. Básicamente, OPA evalúa tu plan de Terraform en formato JSON y te dice si cumple o no con las reglas de la empresa.

### El flujo normalito

1. Haces tus cambios en Terraform.
2. Generas el plan y lo conviertes a JSON:
   ```bash
   terraform plan -out=tfplan
   terraform show -json tfplan > tfplan.json
   ```
3. OPA evalúa ese JSON contra tus políticas:
   ```bash
   opa eval --data policies/ --input tfplan.json "data.terraform.deny"
   ```

### Ejemplo de Política en Rego

Vamos a escribir una política sencilla que deniega la creación de buckets de S3 que no tengan tags, o que falte el tag de "Environment".

```rego
package terraform

deny[msg] {
    # Iteramos sobre todos los recursos que se van a crear
    resource := input.resource_changes[_]
    resource.type == "aws_s3_bucket"
    resource.change.actions[_] == "create"
    
    # Revisamos si tiene tags
    tags := resource.change.after.tags
    not tags["Environment"]
    
    msg = sprintf("El bucket S3 '%v' debe tener el tag 'Environment'. ¡No seas flojo!", [resource.name])
}
```

Lo genial de esto es que lo puedes meter en tu pipeline de CI/CD. Si OPA dice que hay un `deny`, el pipeline falla y el PR no se puede mergear. ¡Automatización FTW!
