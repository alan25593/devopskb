---
title: "Seguridad Avanzada: ACLs y Capabilities"
category: "Linux"
tags: ["linux", "security", "acls", "setfacl", "setcap", "capabilities"]
description: "Dale un nivel más de seguridad a tu sistema con ACLs y Linux Capabilities."
---

# Seguridad Avanzada: ACLs y Capabilities

¿Todo bien? Si alguna vez te frustraste porque los permisos estándar (rwx) de usuario, grupo y otros se te quedan cortos, entonces es hora de usar las herramientas de verdad: **ACLs** y **Capabilities**.

## Access Control Lists (ACLs)

Las ACLs te permiten dar permisos a usuarios o grupos específicos sin tener que cambiar el owner o el grupo del archivo.

Para ver las ACLs de un archivo/directorio:
```bash
getfacl /var/www/html
```

Para darle permisos de lectura y escritura al usuario `devops` sobre un archivo que no le pertenece:
```bash
setfacl -m u:devops:rw /var/www/html/config.php
```

Para que todos los archivos nuevos en un directorio hereden una ACL por defecto, usá la `d:` de default:
```bash
setfacl -m d:g:developers:rwx /var/www/proyectos/
```

Y si la pifiaste y querés sacar los permisos:
```bash
setfacl -x u:devops /var/www/html/config.php
```

## Linux Capabilities

Históricamente, si un programa necesitaba permisos especiales (como escuchar en el puerto 80), lo tenías que correr como `root`. Eso es súper peligroso.
Las Capabilities dividen el poder de `root` en piezas chicas.

Por ejemplo, si tenés una app en Node.js o un binario de Go que necesita bindear en el puerto 80 o 443:

```bash
# Le damos permisos al binario de node para hacer bind a puertos < 1024
setcap cap_net_bind_service=+ep /usr/bin/node
```

Ahora podés correr tu server en Node con un usuario sin privilegios y va a poder usar el puerto 80.

Para ver qué capabilities tiene un binario:
```bash
getcap /usr/bin/node
```

Y para removerlas:
```bash
setcap -r /usr/bin/node
```

¡Mantené el root lejos de tus apps y el sistema va a ser mil veces más seguro!
