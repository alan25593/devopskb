---
title: "Trabajo largo en agentes desde un pipeline: el límite de 5 minutos del hilo CPS y las trampas del sandbox"
category: "jenkins"
tags: ["pipeline", "cps", "noncps", "sandbox", "remoting", "shared-library", "limpieza", "troubleshooting"]
keywords: ["jenkins InterruptedException 5 minutos", "CPS VM thread blocked", "NonCPS timeout jenkins", "RemotingDiagnostics executeGroovy pipeline", "script remoto en agente jenkins", "Scripts not permitted to use staticMethod sort", "StringBuilder leftShift sandbox jenkins", "sort closure CPS No such field", "ws JOB_NAME BUILD_NUMBER disco lleno", "carpetas por build jenkins", "limpiar workspaces de todos los agentes", "Files.walk each groovy no itera"]
description: "Por qué un método @NonCPS o un script remoto que tarda más de 5 minutos se corta con InterruptedException, cómo correr el trabajo en un hilo del agente y consultarlo con sleep, y qué métodos rechaza el sandbox del Jenkinsfile."
---

# Trabajo largo en agentes desde un pipeline: el límite de 5 minutos del hilo CPS y las trampas del sandbox

Un job de mantenimiento recorre todos los agentes y borra workspaces viejos. Usa `RemotingDiagnostics.executeGroovy(script, computer.channel)` desde un método `@NonCPS` de la shared library, sin executors ni credenciales. En los agentes chicos anda bien. En uno con 35 GB para borrar, el log muestra:

```
WARN: AGENTE-BUILD-01: java.lang.InterruptedException
```

Y en el disco aparece la mitad del espacio liberado. El borrado siguió en el agente, pero el pipeline se perdió el resultado.

---

## Por qué pasa

Los pipelines corren en el **hilo CPS** del controller. Jenkins interrumpe cualquier tramo de código que lo mantenga ocupado sin ceder más de **5 minutos**: un método `@NonCPS`, un `executeGroovy` remoto o un bucle largo. No importa que el trabajo real esté en otra máquina: mientras la llamada bloquea el hilo, cuenta.

Los steps (`sh`, `bat`, `powershell`, `sleep`) **no** tienen ese problema, porque ceden el hilo mientras esperan.

---

## Patrón: el agente trabaja en su propio hilo y el pipeline consulta

1. **Arrancar:** una llamada corta lanza un `Thread` en la JVM del agente, que escribe el resultado en un archivo temporal y lo renombra al terminar. Así el archivo final aparece solo cuando está completo.
2. **Consultar:** el pipeline hace `sleep(15)` y lee el archivo con otra llamada corta, hasta que existe o se cumple un máximo.

```groovy
// vars/agentJob.groovy (shared library: trusted)
import hudson.util.RemotingDiagnostics
import jenkins.model.Jenkins

Map run(String nodeName, String code, String resultFile, int maxMinutes = 120) {
    start(nodeName, code, resultFile)
    long deadline = System.currentTimeMillis() + maxMinutes * 60000L
    while (true) {
        sleep(time: 15, unit: 'SECONDS')                 // step: cede el hilo CPS
        def r = poll(nodeName, resultFile)
        if (r != null) return r
        if (System.currentTimeMillis() > deadline) return [error: "sin resultado en ${maxMinutes} min"]
    }
}

@NonCPS
void start(String nodeName, String code, String resultFile) {
    def ch = Jenkins.get().getNode(nodeName).toComputer().channel
    String rf = resultFile.replace('\\', '\\\\')
    RemotingDiagnostics.executeGroovy("""
def f = new File('${rf}'); f.delete(); def tmp = new File(f.path + '.tmp')
Thread.start {
  tmp.withPrintWriter('UTF-8') { out ->
    try { ${code} } catch (Throwable t) { out.println 'ERROR=' + t }
  }
  tmp.renameTo(f)
}
println 'STARTED'
""", ch)
}

@NonCPS
Map poll(String nodeName, String resultFile) {
    def ch = Jenkins.get().getNode(nodeName).toComputer().channel
    String rf = resultFile.replace('\\', '\\\\')
    String out = RemotingDiagnostics.executeGroovy("def f = new File('${rf}'); println(f.exists() ? f.text : 'PENDING')", ch)
    if (out.contains('PENDING')) return null
    return [output: out]
}
```

El `code` que se pasa escribe con `out.println` (por ejemplo, una línea `RESULT=<json>`), y el pipeline la parsea.

> **Imports:** si el código remoto usa `import`, tienen que ir al principio del script generado, fuera del `Thread.start { }`.

---

## Trampas del sandbox (Jenkinsfile no trusted)

El Jenkinsfile corre en el sandbox, aunque el método tenga `@NonCPS`. Estas son algunas de las que más aparecen en código de reportes:

| Código | Error | Alternativa |
|---|---|---|
| `def sb = new StringBuilder(); sb << "x"` | `Scripts not permitted to use staticMethod ... leftShift java.lang.StringBuilder` | `String s = ''; s += "x"` |
| `lista.sort(false) { a, b -> ... }` | `Scripts not permitted to use staticMethod ... sort java.util.Collection boolean groovy.lang.Closure` | Mover el orden a la shared library (trusted) |
| `lista.sort { -it.mb }.each { r -> r.node }` en código CPS | `No such field found: field java.lang.Long node` | Lo mismo: con closure, `sort` no funciona bien en CPS. Ordenar en la library |

La regla práctica: **todo lo que sea utilidad (ordenar, armar textos largos, parsear) va en la shared library**, y el Jenkinsfile solo orquesta.

---

## Otras lecciones del mismo job

- **`Files.walk(path).each { }` no itera el `Stream`** en el Groovy de algunos agentes: el closure recibe el stream entero y, con un `catch` silencioso, el tamaño medido da siempre 0. Para medir tamaños, usá `Files.walkFileTree(path, new SimpleFileVisitor<Path>() { ... })`.
- **No borrar subcarpetas de un workspace que no se reconoce.** Si el criterio de "esto es un workspace" falla (por ejemplo, un checkout que solo tiene subcarpetas), es más seguro no tocar nada que tomar una subcarpeta profunda: borrar media carpeta de un build incremental lo rompe. Para reconocer un workspace sirven la hermana `<nombre>@tmp`, que Jenkins crea siempre, y las copias concurrentes `<nombre>@2`.
- **Carpetas por build fuera de `workspace/`:** `ws("${JOB_NAME}-${BUILD_NUMBER}")` crea una carpeta nueva en cada corrida (ver [mantenimiento y limpieza](/article/jenkins/10-mantenimiento-y-limpieza/)). Si algún job no la borra, se acumulan de a cientos y llegan a decenas de GB. En el barrido periódico, recorré también el resto de la raíz del agente (salvo `remoting`, `tools` y `caches`) y tomá solo las carpetas cuyo nombre termina en `-<número>`.
- **Windows y las carpetas "de 1970":** después de un borrado masivo pueden quedar carpetas vacías que siguen apareciendo en el listado con `lastModified = 0`. Algún proceso tiene el handle abierto. No ocupan espacio y desaparecen cuando se libera el handle o al reiniciar.
- **Parámetros nuevos en `properties([...])`** se registran recién cuando corre el build. Para activar un cron o un default nuevo sin efectos, alcanza con una corrida con un filtro que no coincida con ningún agente.
