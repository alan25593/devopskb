---
title: "GitLab Self-Managed: Instalación, gitlab.rb y Operación"
category: "gitlab"
tags: ["self-managed", "omnibus", "gitlab-rb", "backups", "upgrades", "operacion"]
keywords: ["gitlab self managed", "instalar gitlab omnibus", "gitlab rb configuracion", "gitlab-ctl reconfigure", "backup y restore gitlab", "gitlab rails console", "upgrade path gitlab", "health check gitlab"]
description: "Operación integral de GitLab Self-Managed: configuración de gitlab.rb, backups, upgrades con ruta requerida y troubleshooting con Rails console."
---

# GitLab Self-Managed: Operación, Configuración y Backups

Operar una instancia propia (**GitLab Self-Managed**) con el paquete Omnibus o Docker requiere comprender sus herramientas de mantenimiento (`gitlab-ctl`), el archivo central de parámetros (`gitlab.rb`), el protocolo de respaldos y el acceso a la consola de administración.

---

## Archivo Central de Configuración: `/etc/gitlab/gitlab.rb`

Cualquier ajuste a nivel de servidor (puertos, certificados SSL, URLs, integración LDAP/Active Directory o almacenamiento en S3) se realiza en este archivo.

### Parámetros Principales Comentados:
```ruby
# URL externa por la cual acceden los desarrolladores y runners
external_url 'https://gitlab.example.com'

# Gestión automática de certificados HTTPS con Let's Encrypt
letsencrypt['enable'] = true
letsencrypt['contact_emails'] = ['devops@example.com']

# Configuración del Container Registry interno
registry_external_url 'https://registry.example.com'
gitlab_rails['registry_enabled'] = true

# Destino de backups automáticos (almacenamiento Object Storage / S3)
gitlab_rails['backup_upload_connection'] = {
  'provider' => 'AWS',
  'region' => 'us-east-1',
  'aws_access_key_id' => 'AKIAIOSFODNN7EXAMPLE',
  'aws_secret_access_key' => 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
}
gitlab_rails['backup_upload_remote_directory'] = 'gitlab-backups-bucket'
gitlab_rails['backup_keep_time'] = 604800 # Conservar backups por 7 días
```

Cada vez que modificás `gitlab.rb`, aplicás los cambios ejecutando:
```bash
sudo gitlab-ctl reconfigure
```

---

## Comandos Operativos de `gitlab-ctl`

| Comando | Función |
|---|---|
| `sudo gitlab-ctl status` | Muestra el estado de salud de todos los servicios internos (Puma, Sidekiq, Gitaly, PostgreSQL, Nginx). |
| `sudo gitlab-ctl restart [servicio]` | Reinicia todos los componentes o uno en particular (ej: `gitlab-ctl restart puma`). |
| `sudo gitlab-ctl tail [servicio]` | Muestra logs en tiempo real (ej: `sudo gitlab-ctl tail gitlab-rails`). |
| `sudo gitlab-ctl reconfigure` | Re-ejecuta las recetas Chef internas para aplicar cambios de `gitlab.rb`. |

---

## Política de Backups y DRP

El proceso de backup oficial se dispara con:
```bash
sudo gitlab-backup create
```
Esto genera un archivo `.tar` en `/var/opt/gitlab/backups/` con la base de datos PostgreSQL, repositorios Git, issues y metadatos.

> [!WARNING]
> **Crítico:** Por razones de seguridad, el archivo de backup **NO incluye** `/etc/gitlab/gitlab.rb` ni `/etc/gitlab/gitlab-secrets.json` (que contiene las claves de cifrado de la base de datos). Estos dos archivos **deben respaldarse de forma manual y cifrada aparte**. Si restaurás una base de datos sin el `gitlab-secrets.json` original, todas las variables CI/CD y tokens quedarán corruptos e ilegibles.

---

## Rails Console: La "Script Console" de GitLab

En Jenkins, ante bloqueos graves, recurrías a la *Script Console* Groovy en `/script`. En GitLab Self-Managed, el equivalente con privilegios de root es **`gitlab-rails console`**:

```bash
sudo gitlab-rails console
```

### Ejemplos útiles en la consola:
```ruby
# Desbloquear usuario administrador
user = User.find_by_username('admin')
user.unlock_access!
user.save!

# Resetear contraseña de root en frío
user = User.find_by(id: 1)
user.password = 'NuevaPasswordCompleja123'
user.password_confirmation = 'NuevaPasswordCompleja123'
user.save!

# Reencolar jobs de Sidekiq trabados
Sidekiq::Queue.new('pipeline_processing').clear
```

---

## Upgrades y Ruta Requerida (*Upgrade Path*)

En GitLab **no podés saltar directamente de una versión mayor antigua a la última versión disponible**. Saltar versiones sin pasar por los *stop-points* requeridos corrompe las migraciones de base de datos en segundo plano (*Background Migrations*).

**Ejemplo de ruta obligatoria:**
$$15.0.0 \longrightarrow 15.4.6 \longrightarrow 15.11.13 \longrightarrow 16.0.8 \longrightarrow 16.3.7 \longrightarrow 16.7.0 \longrightarrow 	ext{Última versión}$$

Siempre consultá la herramienta oficial **GitLab Upgrade Path Tool** antes de actualizar paquetes Omnibus.

---

## Relacionado

- [/article/gitlab/01-fundamentos/](/article/gitlab/01-fundamentos/) — Arquitectura interna de servicios GitLab.
- [/article/gitlab/06-runners/](/article/gitlab/06-runners/) — Instalación y conexión de runners a la instancia.
- [/article/jenkins/09-backup-y-drp/](/article/jenkins/09-backup-y-drp/) — Estrategias de backup en Jenkins.
