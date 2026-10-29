---
title: "Bootstrap de VMs con Terraform: templatefile, cloud-init y PowerShell en Windows"
category: "terraform"
tags: ["cloud-init", "user-data", "templatefile", "windows", "powershell", "bootstrap"]
keywords: ["user_data terraform", "cloud-init terraform", "templatefile", "escapar dolar templatefile", "$$ terraform template", "%% template", "indent templatefile", "write_files runcmd", "user_data windows powershell", "ps1_sysnative", "cloudbase-init", "powershell user_data aws", "openssh windows terraform", "administrators_authorized_keys", "DefaultShell cmd", "ignore_changes user_data", "filebase64"]
description: "Cómo aprovisionar VMs Linux y Windows desde Terraform: templatefile con variables, reglas de escape en templates de cloud-init, write_files/runcmd vs servicios en cada boot, user_data PowerShell en AWS y OCI, y los gotchas reales de OpenSSH en Windows."
---

# Bootstrap de VMs con Terraform

## Opciones

| Técnica | Cuándo |
|---------|--------|
| `user_data` inline (`<<-EOF`) | Scripts cortos |
| `templatefile()` + archivo `.tpl` | Scripts largos con variables (recomendado) |
| `filebase64()` de un script del repo | Incrustar un script tal cual dentro de cloud-init |
| Imagen dorada (Packer) | Bootstrap muy largo o que necesita arrancar rápido |
| Ansible post-apply | Configuración que cambia seguido |

---

## `templatefile` + cloud-init (Linux)

```hcl
resource "oci_core_instance" "host" {
  # ...
  metadata = {
    ssh_authorized_keys = var.ssh_public_key
    user_data = base64encode(templatefile("${path.module}/templates/cloud-init.yaml.tpl", {
      admin_user        = var.admin_user
      ssh_public_key    = var.ssh_public_key
      git_repo_url      = var.git_repo_url
      git_deploy_key    = var.git_deploy_key        # sensitive
      access_key_id     = var.access_key_id         # sensitive
      secret_access_key = var.secret_access_key     # sensitive
    }))
  }

  lifecycle {
    ignore_changes = [metadata["user_data"]]        # cloud-init corre una vez; no recrear la VM
  }
}
```

AWS: `user_data = templatefile(...)` (el provider lo codifica) o `user_data_base64`.

### Template

```yaml
#cloud-config
package_update: true

users:
  - name: ${admin_user}
    groups: [sudo, docker]
    shell: /bin/bash
    sudo: ["ALL=(ALL) NOPASSWD:ALL"]
    ssh_authorized_keys:
      - ${ssh_public_key}

write_files:
  - path: /etc/drp/object-storage.env
    permissions: "0600"
    owner: root:root
    content: |
      AWS_ACCESS_KEY_ID=${access_key_id}
      AWS_SECRET_ACCESS_KEY=${secret_access_key}

  - path: /root/.ssh/iac_deploy_key
    permissions: "0600"
    content: |
      ${indent(6, git_deploy_key)}

  - path: /usr/local/bin/refresh.sh
    permissions: "0755"
    content: |
      #!/bin/bash
      for i in $(seq 1 30); do
          code=$(curl -s -o /dev/null -w "%%{http_code}" http://localhost:8082)
          [ "$${code}" = "200" ] && break
          sleep 10
      done
      bash /home/${admin_user}/projects/iac/scripts/restore.sh

runcmd:
  - apt-get install -y curl unzip rsync git jq
  - curl -fsSL https://get.docker.com | sh
  - usermod -aG docker ${admin_user}
  - GIT_SSH_COMMAND="ssh -i /root/.ssh/iac_deploy_key -o StrictHostKeyChecking=accept-new" git clone ${git_repo_url} /home/${admin_user}/projects/iac
  - systemctl enable --now refresh.service
```

### Reglas de escape en `templatefile`

| Querés en el archivo final | Escribís en el `.tpl` | Motivo |
|----------------------------|-----------------------|--------|
| Variable de Terraform | `${admin_user}` | Interpolación |
| `${VAR}` de bash | `$${VAR}` | `$${` escapa la interpolación |
| `$VAR` / `$(cmd)` de bash | `$VAR`, `$(cmd)` | Sin `{` no hay conflicto |
| `%{http_code}` de curl | `%%{http_code}` | `%{` es directiva de template |
| Bloque multilínea (clave privada) indentado | `${indent(6, var)}` | YAML exige la indentación en cada línea |
| Loop | `%{ for v in list ~}...%{ endfor ~}` | Directiva |

Lista de Terraform → array de PowerShell:

```powershell
foreach ($v in @(${join(", ", formatlist("\"%s\"", dotnet_sdk_versions))})) { ... }
# Renderiza: foreach ($v in @("6.0.428", "8.0.404")) { ... }
```

### Incrustar un script del repo

```hcl
_openvpn_cloud_init = base64encode(<<-EOT
  #cloud-config
  write_files:
    - path: /opt/openvpn/install-fail2ban.sh
      encoding: b64
      permissions: '0755'
      content: ${filebase64("${get_repo_root()}/scripts/ovpn/install-fail2ban.sh")}
  runcmd:
    - bash /opt/openvpn/install-fail2ban.sh
EOT
)
```

`encoding: b64` evita todos los problemas de escape e indentación.

### `runcmd` vs algo que corra en cada boot

| | `runcmd` | Unit systemd (`write_files` + `systemctl enable`) |
|-|----------|----------------------------------------------------|
| Frecuencia | **Una vez por instancia** | Cada arranque |
| Uso | Instalar paquetes, clonar repo, restore inicial | Refrescar datos (último backup), registrar el host |

```ini
[Unit]
Description=Restaurar desde el último backup
After=docker.service network-online.target
Wants=network-online.target
Requires=docker.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/refresh.sh
TimeoutStartSec=1800

[Install]
WantedBy=multi-user.target
```

### Gotchas Linux

- Ubuntu 24.04 ya **no** tiene el paquete `awscli` en apt: si va en el mismo `apt-get install` que el resto, **falla toda la transacción**. Instalar aws-cli v2 con el instalador oficial.
- Paquetes que preguntan (iptables-persistent): `debconf-set-selections` + `DEBIAN_FRONTEND=noninteractive`.
- Docker por TCP solo en loopback (si una herramienta lo exige): override de systemd con `-H fd:// -H tcp://127.0.0.1:2375`, nunca `0.0.0.0`.
- Si un script posterior hace `git pull` como root, dejar configurado `core.sshCommand` con la deploy key y `safe.directory`.

```bash
# Depuración
sudo cloud-init status --long
sudo tail -f /var/log/cloud-init-output.log
sudo cat /var/lib/cloud/instance/user-data.txt     # lo que realmente llegó (contiene secretos)
sudo cloud-init clean --logs && sudo reboot        # re-ejecutar en una VM de prueba
```

---

## Windows

### AWS: `<powershell>` en user_data

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.small"

  user_data = <<-EOF
  <powershell>
  $Password = ConvertTo-SecureString "${var.admin_password}" -AsPlainText -Force
  if (!(Get-LocalUser -Name "devops" -ErrorAction SilentlyContinue)) {
      New-LocalUser "devops" -Password $Password -FullName "DevOps Admin"
      Add-LocalGroupMember -Group "Administrators" -Member "devops"
  }

  Install-WindowsFeature Web-Server, Web-AppInit, Web-Asp-Net45, Web-Mgmt-Console, Web-Scripting-Tools

  Set-ExecutionPolicy Bypass -Scope Process -Force
  [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
  iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
  choco install vcredist140 urlrewrite webdeploy -y

  foreach ($v in "8.0.12","9.0.10") {
      $f = "$env:TEMP\hosting-$v.exe"
      Invoke-WebRequest "https://dotnetcli.azureedge.net/dotnet/aspnetcore/Runtime/$v/dotnet-hosting-$v-win.exe" -OutFile $f
      Start-Process $f -ArgumentList "/install","/quiet","/norestart" -Wait
  }
  iisreset
  </powershell>
  EOF
}
```

Logs: `C:\ProgramData\Amazon\EC2Launch\log\agent.log` (EC2Launch v2).

### OCI: `#ps1_sysnative` (cloudbase-init)

```hcl
metadata = {
  user_data = base64encode(templatefile("${path.module}/templates/bootstrap.ps1.tpl", {
    admin_user     = var.admin_user
    admin_password = var.admin_password
    ssh_public_key = var.ssh_public_key
  }))
}
```

```powershell
#ps1_sysnative
$ErrorActionPreference = "Stop"
$ProgressPreference    = "SilentlyContinue"      # Invoke-WebRequest 10x más rápido
Start-Transcript -Path "C:\bootstrap-log.txt" -Append

try {
    # ... pasos ...
} catch {
    Write-Host "BOOTSTRAP FAILED: $_"
    throw
} finally {
    Stop-Transcript
}
```

La primera línea define el intérprete (`#ps1_sysnative` = PowerShell 64 bits). El transcript es la única forma razonable de ver qué falló.

### OpenSSH Server en Windows (para agentes de CI o Ansible)

```powershell
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0 | Out-Null
Set-Service sshd -StartupType Automatic
Start-Service sshd
New-NetFirewallRule -Name sshd -DisplayName "OpenSSH Server" -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22 -ErrorAction SilentlyContinue

# Claves para cuentas administradoras
$auth = "C:\ProgramData\ssh\administrators_authorized_keys"
Set-Content -Path $auth -Value "${ssh_public_key}" -Encoding ASCII
icacls $auth /inheritance:r | Out-Null
icacls $auth /grant "SYSTEM:F" | Out-Null
icacls $auth /grant "Administrators:F" | Out-Null

# Shell por defecto cmd.exe
New-Item -Path "HKLM:\SOFTWARE\OpenSSH" -Force | Out-Null
New-ItemProperty -Path "HKLM:\SOFTWARE\OpenSSH" -Name DefaultShell -Value "C:\Windows\System32\cmd.exe" -PropertyType String -Force | Out-Null

Restart-Service sshd
```

| Gotcha | Síntoma | Fix |
|--------|---------|-----|
| ACL de `administrators_authorized_keys` con herencia | La key se rechaza silenciosamente | `icacls /inheritance:r` + solo SYSTEM y Administrators |
| `New-ItemProperty` sin la clave padre | Excepción que con `Stop` aborta todo el script | `New-Item -Force` antes |
| DefaultShell PowerShell 5.1 | Herramientas que mandan `cd x && java ...` fallan: *"The token '&&' is not a valid statement separator"* | DefaultShell = `cmd.exe` |
| `Match Group administrators` comentado en `sshd_config` | Se ignora `administrators_authorized_keys` | Descomentar con regex; no basta con buscar el substring (matchea la línea comentada) |
| `known_hosts` del usuario | `Host key verification failed` en el primer `git fetch` | Pre-crear `C:\Users\<user>\.ssh\known_hosts` con `ssh-keyscan` |

### Instaladores: verificar el tipo de archivo

- Adoptium: `/v3/binary/...` devuelve un **zip**; para MSI usar `/v3/installer/...` (msiexec con un zip da *Error 2203*).
- MSI: `Start-Process msiexec.exe -ArgumentList "/i `"$f`" /quiet /norestart" -Wait`.
- Refrescar `PATH` dentro del mismo script después de instalar:
  ```powershell
  $env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User")
  ```
- .NET SDK side-by-side: `dotnet-install.ps1 -Version <v> -InstallDir "C:\Program Files\dotnet"` por cada versión pineada en `global.json`.

---

## Checklist

- [ ] Secretos solo vía variables `sensitive` (ver [Secretos en Terraform](/article/terraform/13-seguridad-state-vault/)).
- [ ] `ignore_changes = [user_data]` si el bootstrap es de una sola vez.
- [ ] Logs de bootstrap persistidos (cloud-init-output, transcript).
- [ ] Scripts idempotentes (`if (!(Get-LocalUser ...))`, `-ErrorAction SilentlyContinue` donde corresponda).
- [ ] Versiones pineadas (JDK, Git, SDKs) para que dos VMs creadas en meses distintos sean iguales.
