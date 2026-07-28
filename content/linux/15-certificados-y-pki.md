---
title: "Certificados SSL y OpenSSL en CLI"
category: "Linux"
tags: ["linux", "ssl", "tls", "openssl", "security"]
description: "Guía rápida de supervivencia para lidiar con certificados usando openssl."
---

# Certificados SSL y OpenSSL en CLI

Buenas. Todo el mundo odia lidiar con certificados hasta que te aprendés un par de comandos mágicos. Con `openssl` podés revisar, crear y validar todo.

## Chequear certificados

¿Te olvidaste cuándo vence un certificado que te pasaron? No lo instales a ciegas, fijate así:

```bash
openssl x509 -in certificado.crt -text -noout
```

Para ver solamente la fecha de expiración:
```bash
openssl x509 -in certificado.crt -noout -enddate
```

Si querés ver el certificado de un servidor que ya está corriendo en producción:
```bash
echo | openssl s_client -connect mi-dominio.com:443 2>/dev/null | openssl x509 -noout -dates
```

## Generar claves y CSR

Si necesitas pedir un certificado de verdad a una CA, vas a necesitar un CSR (Certificate Signing Request) y tu clave privada.

```bash
openssl req -new -newkey rsa:2048 -nodes -keyout midominio.key -out midominio.csr
```
Te va a hacer un par de preguntas (Organización, País, etc). El `Common Name (CN)` tiene que ser tu dominio (ej: `www.midominio.com`).

## Certificados Auto-Firmados (Para dev local)

Si estás armando un entorno de dev y querés HTTPS rápido, armate un auto-firmado de 10 años:

```bash
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 -keyout mi-local.key -out mi-local.crt
```

## Verificar que todo haga match

Si tenés un error de que el certificado no coincide con la llave, podés validar los hashes:

```bash
openssl rsa -noout -modulus -in midominio.key | openssl md5
openssl x509 -noout -modulus -in midominio.crt | openssl md5
```
Ambos outputs tienen que ser **exactamente iguales**. Si no, agarraste la key de otro lado. ¡Suerte con eso!
