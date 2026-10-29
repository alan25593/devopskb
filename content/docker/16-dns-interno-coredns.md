---
title: "DNS Interno Split-Horizon con CoreDNS en Docker"
category: "docker"
tags: ["coredns", "dns", "split-horizon", "hosts", "alta-disponibilidad"]
keywords: ["coredns docker", "dns interno docker", "split horizon dns", "corefile", "coredns hosts fallthrough", "dns interno sin active directory", "resolver nombres internos", "coredns reload", "coredns prometheus", "dns primario secundario", "nxdomain dns interno", "coredns forward"]
description: "Montar un DNS interno con CoreDNS en Docker que resuelve nombres internos y deja pasar el resto al DNS público (split-horizon con hosts + fallthrough), con recarga en caliente, métricas y despliegue primario/secundario."
---

# DNS Interno Split-Horizon con CoreDNS

Problema: los servicios internos (`vault.int.miorg.com`, `jenkins.int.miorg.com`) deben resolver a la IP interna de Traefik, pero el resto de la zona `miorg.com` (web pública, MX, etc.) vive en el DNS público y **no** se quiere duplicar.

```text
cliente ──► CoreDNS (primario / secundario)
              ├─ *.miorg.com ─► miorg.com.hosts ── si no está (fallthrough) ─► DNS público
              └─ todo lo demás ─────────────────────────────────────────────► DNS público
```

---

## compose.yaml

```yaml
services:
  coredns:
    image: coredns/coredns:1.12.1
    container_name: coredns
    restart: unless-stopped
    command: ["-conf", "/etc/coredns/Corefile"]
    ports:
      # Solo en la IP LAN: 0.0.0.0:53 choca con systemd-resolved (127.0.0.53:53)
      - "${DNS_BIND_IP:?DNS_BIND_IP no definido}:53:53/udp"
      - "${DNS_BIND_IP}:53:53/tcp"
      - "9153:9153"                       # métricas Prometheus
    volumes:
      # Directorio completo (no archivos sueltos) → CoreDNS ve los cambios y recarga solo
      - /etc/coredns:/etc/coredns:ro
```

> Montar el **directorio** y no el archivo: los editores reemplazan el archivo (inode nuevo) y un bind mount de archivo sigue apuntando al inode viejo, así que el contenedor nunca ve el cambio.

---

## Corefile

```text
(upstream) {
    forward . 1.1.1.1 9.9.9.9
}

(common) {
    errors
    prometheus :9153
}

miorg.com {
    hosts /etc/coredns/miorg.com.hosts {
        ttl 60
        fallthrough          # si no está en el archivo, seguir al siguiente plugin (forward)
    }
    import upstream
    cache 30
    log
    import common
}

. {
    import upstream
    cache 300
    health :8080
    ready
    reload                   # recarga el Corefile al cambiar
    import common
}
```

### `miorg.com.hosts`

Formato `/etc/hosts` (`IP nombre [alias...]`):

```text
10.0.0.10  traefik.miorg.com
10.0.0.10  vault.miorg.com jenkins.miorg.com
10.0.0.10  nexus.miorg.com nexus-registry.miorg.com
```

### ¿Por qué `hosts` + `fallthrough` y no una zona autoritativa?

| Enfoque | Resultado para `www.miorg.com` (no cargado internamente) |
|---------|----------------------------------------------------------|
| Zona autoritativa `file db.miorg.com` | **NXDOMAIN** → se rompe todo lo que no se haya copiado |
| `hosts` + `fallthrough` + `forward` | Respuesta del DNS público (lo mismo que fuera de la red) |

El plugin `hosts` recarga el archivo automáticamente (cada ~5 s); no hace falta reiniciar.

---

## Alta disponibilidad: primario y secundario

- Misma config en dos hosts; los clientes (DHCP, `/etc/resolv.conf`, VPN) reciben ambas IPs.
- Deploy **secuencial** con abort ante falla: si el primario falla, el secundario sigue con la versión anterior y nunca caen los dos (ver [Deploy de Compose con Jenkins](/article/docker/14-deploy-compose-con-jenkins/)).

---

## Integración con Traefik y certificados

1. Registro en `.hosts` apuntando a la IP de Traefik.
2. Router en Traefik para ese `Host()`.
3. Certificado: un wildcard ACME DNS-01 cubre todos los nombres de un nivel (ver [Traefik](/article/docker/11-standalone-deployments/)).

> Un **Cloudflare Origin Certificate** solo lo valida el proxy de Cloudflare. Los clientes internos que llegan directo a Traefik por split-horizon lo rechazan. Para nombres internos usar un certificado público (Let's Encrypt) o una CA interna distribuida.

---

## Verificación

```bash
dig @10.0.0.53 vault.miorg.com +short         # IP interna
dig @10.0.0.53 www.miorg.com +short           # misma respuesta que el DNS público
dig @1.1.1.1  vault.miorg.com +short          # vacío/NXDOMAIN: no existe afuera
curl -s http://10.0.0.53:9153/metrics | grep coredns_dns_requests_total | head
docker logs coredns --tail 50
```

| Síntoma | Causa |
|---------|-------|
| `address already in use` en :53 | Publicado en `0.0.0.0` con systemd-resolved activo |
| Cambios en `.hosts` no impactan | Se montó el archivo, no el directorio; o caché del cliente (`ttl`) |
| NXDOMAIN para nombres públicos | Falta `fallthrough` o se usó zona autoritativa |
| Clientes Windows no resuelven | Revisar sufijo DNS y orden de interfaces; `Resolve-DnsName vault.miorg.com -Server 10.0.0.53` |
