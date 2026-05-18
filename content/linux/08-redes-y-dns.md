---
title: "Linux: Redes, DNS y Diagnóstico de Conectividad"
category: "linux"
tags: ["redes", "dns", "networking", "tcpdump", "curl"]
keywords: ["ver ip del servidor", "ip addr", "ip route", "tabla de ruteo", "dig dns", "nslookup", "resolver dominio", "tcpdump capturar trafico", "tcpdump puerto", "curl headers", "curl tiempo respuesta", "curl verbose", "traceroute", "mtr", "netstat", "ifconfig reemplazo", "diagnostico red linux", "ver interfaz de red", "curl write-out", "dns no resuelve"]
description: "Herramientas de red en Linux: comando ip moderno, diagnóstico DNS con dig, captura de tráfico con tcpdump, curl avanzado para testing de APIs y trazado de rutas con mtr."
---

# Redes y diagnóstico de conectividad

## Contenido

- [Comando ip: interfaces, IPs y rutas](#comando-ip-interfaces-ips-y-rutas)
- [Diagnóstico DNS con dig y nslookup](#diagnóstico-dns-con-dig-y-nslookup)
- [Captura de tráfico con tcpdump](#captura-de-tráfico-con-tcpdump)
- [curl avanzado para testing de APIs](#curl-avanzado-para-testing-de-apis)
- [Trazado de ruta con mtr y traceroute](#trazado-de-ruta-con-mtr-y-traceroute)
- [netstat: referencia para sistemas sin ss](#netstat-referencia-para-sistemas-sin-ss)

---

## Comando ip: interfaces, IPs y rutas

`ip` es el reemplazo moderno de `ifconfig`, `route` y `arp`. Disponible en todas las distros actuales.

```bash
# Ver todas las interfaces de red con sus IPs
ip addr
ip addr show eth0    # solo una interfaz

# Ver la tabla de ruteo
ip route
ip route show

# Ver la ruta que tomaría un paquete hacia una IP específica
ip route get 8.8.8.8

# Ver interfaces y su estado (UP/DOWN) sin detalles de IP
ip link show

# Levantar o bajar una interfaz (requiere root)
ip link set eth0 up
ip link set eth0 down

# Agregar una IP secundaria a una interfaz
ip addr add 192.168.1.100/24 dev eth0

# Agregar una ruta estática
ip route add 10.0.0.0/8 via 192.168.1.1

# Ver tabla ARP (IP → MAC)
ip neigh show
```

---

## Diagnóstico DNS con dig y nslookup

### dig — el estándar para troubleshooting DNS

```bash
# Resolver un dominio (devuelve registro A por defecto)
dig google.com

# Ver solo la respuesta limpia (sin metadata)
dig google.com +short

# Consultar un tipo de registro específico
dig google.com A         # IPv4
dig google.com AAAA      # IPv6
dig google.com MX        # Mail exchanger
dig google.com TXT       # Texto (SPF, DKIM, etc.)
dig google.com CNAME     # Alias
dig google.com NS        # Name servers autoritativos

# Consultar contra un servidor DNS específico (sin usar el del sistema)
dig @8.8.8.8 google.com
dig @1.1.1.1 mi-dominio-interno.com

# Hacer una consulta de zona completa (si el servidor lo permite)
dig axfr dominio.com @ns1.dominio.com

# Ver el path completo de resolución DNS (trace)
dig +trace google.com

# Consulta inversa: de IP a nombre de dominio (PTR)
dig -x 8.8.8.8
```

### nslookup — alternativa interactiva

```bash
# Consulta básica
nslookup google.com

# Contra un servidor DNS específico
nslookup google.com 8.8.8.8

# Modo interactivo
nslookup
> server 8.8.8.8
> set type=MX
> google.com
> exit
```

### Archivos de configuración DNS del sistema

```bash
# Ver qué servidores DNS está usando el sistema
cat /etc/resolv.conf

# Ver las reglas de resolución de nombres (DNS, /etc/hosts, etc.)
cat /etc/nsswitch.conf

# Forzar resolución local para un host (útil para dev/testing)
# Agregar en /etc/hosts:
# 127.0.0.1  mi-api.local
cat /etc/hosts
```

---

## Captura de tráfico con tcpdump

`tcpdump` captura paquetes en tiempo real. Indispensable para verificar que el tráfico llega/sale cuando los logs no son suficientes.

```bash
# Capturar en la interfaz eth0 (Ctrl+C para parar)
tcpdump -i eth0

# Especificar interfaz y mostrar IPs numéricas (más rápido, sin resolución DNS)
tcpdump -i eth0 -n

# Capturar solo tráfico de un puerto específico
tcpdump -i eth0 port 5432

# Capturar tráfico hacia/desde una IP
tcpdump -i eth0 host 10.0.0.5

# Combinar filtros: tráfico TCP al puerto 80 desde una IP
tcpdump -i eth0 tcp and port 80 and src 10.0.0.5

# Ver el contenido del payload en ASCII (útil para HTTP sin TLS)
tcpdump -i eth0 -A port 80

# Limitar la cantidad de paquetes capturados
tcpdump -i eth0 -c 100 port 443

# Guardar captura a un archivo para analizar después con Wireshark
tcpdump -i eth0 -w /tmp/captura.pcap

# Leer un archivo de captura
tcpdump -r /tmp/captura.pcap

# Capturar en todas las interfaces
tcpdump -i any port 8080
```

Filtros más usados:

| Filtro | Qué captura |
|---|---|
| `port 80` | TCP y UDP al puerto 80 |
| `tcp port 443` | Solo TCP al 443 |
| `host 10.0.0.1` | Tráfico hacia o desde esa IP |
| `src 10.0.0.1` | Solo tráfico que sale de esa IP |
| `dst 10.0.0.1` | Solo tráfico que llega a esa IP |
| `net 10.0.0.0/24` | Toda la subred |
| `icmp` | Solo ping |

---

## curl avanzado para testing de APIs

```bash
# GET básico
curl https://api.ejemplo.com/health

# Ver headers de respuesta
curl -I https://api.ejemplo.com          # solo headers (HEAD request)
curl -i https://api.ejemplo.com          # headers + body

# Verbose: ver request y response completos (ideal para debug)
curl -v https://api.ejemplo.com/endpoint

# POST con JSON
curl -X POST https://api.ejemplo.com/users \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Alan", "rol": "admin"}'

# Con autenticación Bearer
curl -H "Authorization: Bearer mi-token-jwt" https://api.ejemplo.com/me

# Con autenticación básica
curl -u usuario:password https://api.ejemplo.com/admin

# Seguir redirects
curl -L https://acortador.com/enlace

# Guardar la respuesta en un archivo
curl -o respuesta.json https://api.ejemplo.com/data

# Ignorar errores de certificado SSL (solo para testing, nunca en producción)
curl -k https://servidor-con-cert-invalido.com

# Medir los tiempos de cada fase de la conexión
curl -o /dev/null -s -w "
DNS:          %{time_namelookup}s
Conexión TCP: %{time_connect}s
TLS:          %{time_appconnect}s
TTFB:         %{time_starttransfer}s
Total:        %{time_total}s
HTTP status:  %{http_code}
" https://api.ejemplo.com/health

# Enviar un archivo como body
curl -X POST -H "Content-Type: application/json" \
  -d @payload.json https://api.ejemplo.com/bulk

# Probar con timeout (útil en scripts de health check)
curl --connect-timeout 5 --max-time 10 https://api.ejemplo.com/health
```

---

## Trazado de ruta con mtr y traceroute

### mtr — la mejor herramienta para diagnosticar latencia de red

`mtr` combina `traceroute` y `ping` en una vista en tiempo real que muestra pérdida de paquetes y latencia por salto.

```bash
# Modo interactivo (se actualiza en tiempo real)
mtr google.com

# Solo reporte (útil para pegar en un ticket de soporte)
mtr --report google.com
mtr -r -c 100 google.com    # 100 paquetes, más preciso

# Con IPs numéricas (evita resolución DNS lenta)
mtr -n google.com

# Especificar protocolo (útil cuando ICMP está bloqueado)
mtr --tcp --port 443 google.com
mtr --udp google.com
```

### traceroute — alternativa clásica

```bash
# Trazar la ruta a un host
traceroute google.com

# Usando TCP en lugar de UDP (funciona mejor en redes con firewall)
traceroute -T -p 443 google.com

# Con IPs numéricas
traceroute -n google.com
```

---

## netstat: referencia para sistemas sin ss

En sistemas viejos (o imágenes Docker mínimas) `ss` puede no estar disponible.

```bash
# Ver todos los puertos escuchando
netstat -tlnp      # TCP listening, numérico, con proceso

# Ver conexiones establecidas
netstat -tnp

# Ver estadísticas de interfaces de red
netstat -i

# Ver tabla de ruteo
netstat -r

# Equivalencias netstat → ss
# netstat -tlnp  →  ss -tlnp
# netstat -tnp   →  ss -tnp
# netstat -r     →  ip route
```
