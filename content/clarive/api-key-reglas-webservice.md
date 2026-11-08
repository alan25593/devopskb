---
title: "API de Clarive: api_key y reglas webservice"
category: "clarive"
tags: ["clarive", "api", "webservice", "rules", "automatizacion"]
keywords: ["clarive api", "api_key clarive", "rule/json", "regla webservice", "api-key authentication is not enabled for this url"]
description: "Cómo se usa la api_key de Clarive: solo sirve para ejecutar reglas webservice vía /rule/json, no para una API REST genérica de CIs o tópicos."
---

# API de Clarive: api_key y reglas webservice

## Lo importante
La `api_key` de un usuario **no abre una API REST genérica**. Solo autentica la ejecución de reglas por HTTP:

```
GET https://<host-clarive>/rule/json/<nombre_regla>?api_key=<token>
```

Cualquier otra URL (`/ci/...`, `/topic/...`, `/user/...`, `/rule/list`) con `api_key` responde:

```json
{"success":false,"msg":"api-key authentication is not enabled for this url"}
```

## Endpoints por formato de salida
| Endpoint | Devuelve |
|---|---|
| `/rule/ws/<regla>`, `/rule/html/<regla>`, `/rule/raw/<regla>` | `ws_response` tal cual (ideal si la regla arma HTML) |
| `/rule/json/<regla>` | `ws_response` serializado. **Si es un string devuelve `{}`**: hay que asignar un hashref o arrayref |
| `/rule/xml/<regla>` | `ws_response` envuelto en `<clarive>` y escapado |

Los parámetros del query string llegan en `$stash->{ws_params}`, y la regla responde escribiendo `$stash->{ws_response}`.

## Leer reglas por API
En el árbol de una regla, el código vigente de cada nodo está en `attributes.data.code` (Server CODE) o `attributes.data.expr` (SET EXPR). `attributes.code` puede quedar como copia vieja.
Ejemplo de regla webservice de solo lectura: [`ejemplos/api-rule-get.pl`](./ejemplos/api-rule-get.pl).

## Cómo diagnosticar con curl
| Prueba | Resultado | Qué significa |
|---|---|---|
| `/?api_key=<token-falso>` | 401 | El parámetro se valida |
| `/rule/json/<regla>?api_key=<token>` y 500 `Rule X type is invalid: not rulebook, independent or webservice` | Token válido | La regla no existe o no es de un tipo invocable |
| `/ci/list?api_key=<token>` | 401 `api-key authentication is not enabled` | La ruta no acepta api_key |

```bash
curl -sk -w "\n[%{http_code}]\n" "https://<host>/rule/json/<regla>?api_key=$CLARIVE_TOKEN"
```

## Cómo exponer datos por API
1. Crear una regla de tipo **Webservice** en el entorno de desarrollo.
2. Que devuelva JSON con lo necesario (por ejemplo, una consulta a `mdb->topic` de solo lectura).
3. Migrarla a los demás entornos con export/import de profiles (ver [Administración y operaciones](./administracion-operaciones.md)).
4. Llamarla con `/rule/json/<nombre>?api_key=...`.

## Buenas prácticas
- **Crear reglas, CIs, roles y grupos solo en el entorno de desarrollo.** Si se crean directo en test o producción, los IDs de referencia dejan de coincidir entre entornos.
- **No invocar reglas a ciegas:** una regla *independent* o un *rulebook* puede ejecutar acciones con efectos.
- El token es personal y no se commitea: va en una variable de entorno o en un secret store.
- Conviene separar reglas de lectura y de escritura, y no habilitar las de escritura en producción para usuarios técnicos o bots.
