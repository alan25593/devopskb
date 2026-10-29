---
title: "Credenciales y Secretos en Jenkins: withCredentials, Vault y Enmascarado de Logs"
category: "jenkins"
tags: ["credenciales", "secretos", "vault", "withCredentials", "seguridad", "logs"]
keywords: ["withCredentials", "jenkins credentials", "usernamePassword jenkins", "sshUserPrivateKey", "string credential", "aws credentials binding", "hashicorp vault jenkins", "vault token jenkins", "ocultar password log jenkins", "set +x", "bat @", "mask password jenkins", "secret texto plano", "credentials.xml", "descifrar credencial jenkins"]
description: "Cómo manejar secretos en pipelines Jenkins: tipos de credenciales y withCredentials, lectura de secretos desde HashiCorp Vault con referencias vault:path#key, y técnicas para que nunca aparezcan en los logs."
---

# Credenciales y Secretos en Jenkins

## Regla base

Ningún secreto vive en el Jenkinsfile, en `resources/` ni en scripts versionados. Las opciones válidas son:

1. **Credenciales de Jenkins** (`credentials.xml`, cifradas con las claves de `secrets/`), consumidas con `withCredentials`.
2. **Un secret manager** (HashiCorp Vault) consultado en runtime, con el token guardado como credencial de Jenkins.

---

## Tipos de credenciales y binding

```groovy
withCredentials([
    usernamePassword(credentialsId: 'db-admin', usernameVariable: 'DB_USER', passwordVariable: 'DB_PASS'),
    string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN'),
    sshUserPrivateKey(credentialsId: 'devopsSSH', keyFileVariable: 'SSH_KEY', usernameVariable: 'SSH_USER'),
    file(credentialsId: 'kubeconfig-qa', variable: 'KUBECONFIG')
]) {
    sh 'sqlplus -s "$DB_USER/$DB_PASS@ORCL" @script.sql'   // comillas simples: Groovy NO interpola
}
```

Credencial tipo *AWS Credentials* (sirve también para APIs S3-compatibles, como OCI Object Storage con Customer Secret Keys):

```groovy
withCredentials([[
    $class: 'AmazonWebServicesCredentialsBinding',
    credentialsId: 'oci-s3-compat',
    accessKeyVariable: 'AWS_ACCESS_KEY_ID',
    secretKeyVariable: 'AWS_SECRET_ACCESS_KEY'
]]) {
    sh 'aws s3 ls s3://mi-bucket/ --endpoint-url "$S3_ENDPOINT"'
}
```

> Los nombres de las variables destino pueden ser dinámicos, por ejemplo para configurar rclone solo con env vars: `accessKeyVariable: "RCLONE_CONFIG_${REMOTE.toUpperCase()}_ACCESS_KEY_ID"`.

### Comillas: simples vs dobles

```groovy
sh "curl -u ${USER}:${PASS} ..."   // MAL: Groovy interpola → el secreto queda en el script y puede filtrarse
sh 'curl -u $USER:$PASS ...'       // BIEN: lo expande el shell; Jenkins lo enmascara con ****
```

Jenkins muestra la advertencia *"A secret was passed to "sh" using Groovy String interpolation"* cuando detecta el primer caso.

---

## Secretos desde HashiCorp Vault (sin plugin)

Con el plugin *HTTP Request* y el token de Vault como credencial `string`:

```groovy
// vars/vault.groovy
def getVaultSecrets(String secretPath) {
    withCredentials([string(credentialsId: 'vault-token', variable: 'VAULT_TOKEN')]) {
        def response = httpRequest(
            url: "${env.VAULT_ADDR}${secretPath}",
            httpMode: 'GET',
            customHeaders: [[name: 'X-Vault-Token', value: VAULT_TOKEN, maskValue: true]],
            validResponseCodes: '100:599',
            consoleLogResponseBody: false          // nunca loguear el body
        )
        if (response.status == 404) error "Vault path not found: ${secretPath}"
        if (response.status == 403) error "Access denied to Vault path: ${secretPath}"
        if (response.status != 200) error "Vault HTTP ${response.status}"
        return readJSON(text: response.content)
    }
}

// KV v2 devuelve data.data; KV v1 devuelve data
def getVaultSecretsData(String path) {
    def s = getVaultSecrets(path)
    return s?.data?.data ?: s?.data
}

def getVaultSecret(String path, String key) {
    def data = getVaultSecretsData(path)
    if (!data?.containsKey(key)) error "Key '${key}' not found in ${path}"
    return data[key]
}
```

### Referencias `vault:<path>#<key>` en la configuración

Los JSON de entorno guardan **referencias**, no valores; el pipeline las resuelve al usarlas:

```json
{ "qa": { "core": { "dbPassword": "vault:/v1/kv/data/application/qa#DB_PASSWORD" } } }
```

```groovy
def resolveVaultReference(def value) {
    if (!(value instanceof String) || !value.startsWith('vault:')) return value
    def parts = value.substring('vault:'.length()).split('#', 2)
    if (parts.size() != 2) error "Invalid Vault reference. Expected 'vault:<path>#<key>'"
    return getVaultSecret(parts[0].trim(), parts[1].trim())
}

def dbPassword = vault.resolveVaultReference(envData.core.dbPassword)
```

---

## Evitar que el secreto aparezca en el log

`withCredentials` enmascara solo los valores que él mismo inyecta. Si el secreto viene de Vault, de un JSON o se transforma (Base64, URL-encode), **no** se enmascara automáticamente.

| Técnica | Ejemplo |
|---------|---------|
| Linux: desactivar trazado | `sh "set +x; tool --password '${pass}'"` |
| Windows: no hacer eco del comando | `bat "@sc.exe config MySvc password= ${pass}"` |
| Loguear una versión enmascarada | `echo "Ejecutando: tool -p ******"` y luego `bat "@tool -p ${pass}"` |
| Plugins que loguean valores | `fileContentReplaceItemConfig(search: 'password=(\\w*)', replace: pass, verbose: false)` |
| `httpRequest` | `maskValue: true` en headers, `consoleLogResponseBody: false` |
| Enmascarar valores arbitrarios | Plugin *Mask Passwords*: `wrap([$class: 'MaskPasswordsBuildWrapper', varPasswordPairs: [[password: pass]]]) { ... }` |

Filtrar automáticamente claves sensibles antes de un reemplazo masivo:

```groovy
for (item in replaceConfigs) {
    def k = item.search.toUpperCase()
    if (['PASSWORD', 'KEY', 'SECRET', 'TOKEN'].any { k.contains(it) }) {
        item.verbose = false
    }
}
```

Verificación: revisar el *consoleText* de un build de prueba y confirmar que el archivo destino (`appsettings.json`, `Web.config`) sí tiene el valor real.

---

## Descifrar una credencial (emergencia, Script Console)

Solo administradores, para recuperar un valor perdido:

```groovy
import com.cloudbees.plugins.credentials.CredentialsProvider
import com.cloudbees.plugins.credentials.common.StandardUsernamePasswordCredentials

CredentialsProvider.lookupCredentials(StandardUsernamePasswordCredentials, jenkins.model.Jenkins.instance)
    .findAll { it.id == 'db-admin' }
    .each { println "${it.id}: ${it.username} / ${it.password.plainText}" }
```

> Todo lo que se ejecuta en la Script Console tiene acceso total. Restringir *Overall/Administer* a muy pocas personas.

---

## Crear/actualizar credenciales por código

```groovy
import com.cloudbees.plugins.credentials.CredentialsScope
import com.cloudbees.plugins.credentials.SystemCredentialsProvider
import com.cloudbees.plugins.credentials.domains.Domain
import com.cloudbees.plugins.credentials.impl.UsernamePasswordCredentialsImpl

def store = SystemCredentialsProvider.getInstance().getStore()
def cred  = new UsernamePasswordCredentialsImpl(CredentialsScope.GLOBAL, 'svc-deploy', 'Deploy user', user, pass)
def existing = store.getCredentials(Domain.global()).find { it.id == 'svc-deploy' }
existing ? store.updateCredentials(Domain.global(), existing, cred) : store.addCredentials(Domain.global(), cred)
```

---

## Checklist

- [ ] Ningún secret de agente (`-secret`), password o token en el repo — revisar también scripts de arranque y `.env`.
- [ ] `withCredentials` con comillas simples en `sh`/`bat`.
- [ ] Secretos de Vault/JSON nunca impresos (`set +x`, `@`, `verbose: false`).
- [ ] `credentials.xml` y `secrets/` respaldados juntos y con acceso restringido.
- [ ] Rotar credenciales que alguna vez estuvieron en un repo o un log.
