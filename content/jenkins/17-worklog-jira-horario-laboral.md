---
title: "Worklog de Jira en horario laboral y en el primer hueco libre (shared library)"
category: "jenkins"
tags: ["jira", "worklog", "shared-library", "groovy", "java-time", "automatizacion"]
keywords: ["jira worklog started api", "cargar horas jira automatico", "jira worklog horario laboral", "worklog jira dia habil", "jira worklogAuthor worklogDate jql", "shared library java.time", "NonCPS java.time jenkins", "feriados argentina groovy", "jenkins cargar horas jira", "worklog secuencial jira"]
description: "Helper de shared library que calcula el 'started' de un worklog de Jira dentro del horario laboral (días hábiles, sin feriados) y en el primer hueco libre del día de la persona, leyendo sus worklogs existentes."
---

# Worklog de Jira en horario laboral y en el primer hueco libre

Cuando un pipeline carga horas en Jira (por ejemplo, una remediación automática que corre un sábado a la madrugada), usar la hora actual como `started` deja registros fuera de horario y superpuestos con lo que la persona ya cargó. Este helper resuelve las dos cosas:

- **Horario laboral**: lunes a viernes, sin feriados, dentro de una franja (por ejemplo 06:00–14:00).
- **Secuencial**: lee los worklogs que la persona ya tiene ese día y usa el **primer hueco libre** donde entre la duración. Si a las 06:00 ya hay uno de 15 minutos, el nuevo va a las 06:15.

| Momento de la ejecución | `started` (15 min) |
|---|---|
| Sábado 23:30 | Lunes 06:00 (o el primer hueco libre del lunes) |
| Lunes 05:10 | Lunes 06:00 |
| Lunes 10:00, con 06:00–06:30 ocupado | Lunes 06:30 |
| Viernes 15:00, lunes feriado | Martes 06:00 |
| Día lleno hasta las 14:00 | Próximo día hábil |

---

## Por qué en la shared library

El cálculo usa `java.time` (zonas horarias, `DayOfWeek`, formateo). En un Jenkinsfile con sandbox muchas de esas llamadas requieren aprobación de script. En `vars/` de una **shared library global (confiable)** corren sin sandbox, y los cálculos puros se marcan `@NonCPS`.

---

## `vars/jiraWorklogStart.groovy`

```groovy
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

/*
 * 'started' para un worklog de Jira: día hábil, dentro de [fromHour, toHour) en la zona indicada,
 * en el primer hueco libre del día de accountId (si se pasa).
 *
 * config:
 *   durationSeconds (int)    — default 900
 *   zone            (String) — default 'America/Argentina/Buenos_Aires'
 *   fromHour/toHour (int)    — franja laboral, default 6 y 14
 *   holidays        (List)   — 'yyyy-MM-dd'
 *   accountId, jiraUrl, credentialsId — para leer los worklogs existentes (opcional)
 */
def call(Map config = [:]) {
    int secs = (config.durationSeconds ?: 900) as int
    String zone = config.zone ?: 'America/Argentina/Buenos_Aires'
    int fromH = (config.fromHour ?: 6) as int
    int toH = (config.toHour ?: 14) as int
    List holidays = (config.holidays ?: []) as List

    String day = firstCandidateDay(ZonedDateTime.now(ZoneId.of(zone)), holidays, toH)
    for (int i = 0; i < 15; i++) {
        List busy = []
        if (config.accountId) {
            try {
                busy = busyIntervals(config, day, zone)
            } catch (e) {
                echo "WARN: no se pudieron leer los worklogs de ${day} (${e.message}); se asume el día libre"
            }
        }
        String slot = findSlot(day, secs, busy, zone, fromH, toH)
        if (slot) { return slot }
        day = nextBusinessDay(day, holidays)
    }
    return findSlot(day, secs, [], zone, fromH, toH)
}

// Worklogs de accountId en 'day' -> [[inicioEpochSeg, finEpochSeg], ...]
def busyIntervals(Map config, String day, String zone) {
    def r = dayRange(day, zone)   // [desdeMs, hastaMs, díaAnterior, díaSiguiente]
    def jql = "worklogAuthor = \"${config.accountId}\" AND worklogDate >= \"${r[2]}\" AND worklogDate <= \"${r[3]}\""
    def keys = []
    String token = null
    for (int page = 0; page < 10; page++) {
        def body = [jql: jql.toString(), fields: ['key'], maxResults: 100]
        if (token) { body.nextPageToken = token }
        def res = jira(config, 'POST', '/rest/api/3/search/jql', body)
        for (i in (res.issues ?: [])) { keys << i.key.toString() }
        token = res.nextPageToken ? res.nextPageToken.toString() : null
        if (!token) { break }
    }
    def out = []
    for (k in keys) {
        def w = jira(config, 'GET', "/rest/api/2/issue/${k}/worklog?startedAfter=${r[0]}&startedBefore=${r[1]}&maxResults=1000", null)
        for (x in (w.worklogs ?: [])) {
            if (x.author?.accountId?.toString() == config.accountId.toString()) {
                long st = parseJiraDate(x.started.toString())
                out << [st, st + (x.timeSpentSeconds as long)]
            }
        }
    }
    return out
}

def jira(Map config, String method, String path, Map body) {
    def args = [url: config.jiraUrl + path, httpMode: method, authentication: config.credentialsId,
                acceptType: 'APPLICATION_JSON', validResponseCodes: '200:299', quiet: true]
    if (body != null) {
        args.contentType = 'APPLICATION_JSON_UTF8'
        args.requestBody = groovy.json.JsonOutput.toJson(body)
    }
    return readJSON(text: httpRequest(args).content)
}

// ---------------------------------------------------------------- cálculo puro

@NonCPS
static boolean isBusinessDay(LocalDate d, List holidays) {
    return d.getDayOfWeek() != DayOfWeek.SATURDAY && d.getDayOfWeek() != DayOfWeek.SUNDAY && !holidays.contains(d.toString())
}

@NonCPS
static String firstCandidateDay(ZonedDateTime now, List holidays, int toH) {
    LocalDate d = now.toLocalDate()
    if (isBusinessDay(d, holidays) && now.toLocalTime().isBefore(LocalTime.of(toH, 0))) { return d.toString() }
    d = d.plusDays(1)
    while (!isBusinessDay(d, holidays)) { d = d.plusDays(1) }
    return d.toString()
}

@NonCPS
static String nextBusinessDay(String day, List holidays) {
    LocalDate d = LocalDate.parse(day).plusDays(1)
    while (!isBusinessDay(d, holidays)) { d = d.plusDays(1) }
    return d.toString()
}

@NonCPS
static List dayRange(String day, String zone) {
    LocalDate d = LocalDate.parse(day)
    ZoneId z = ZoneId.of(zone)
    return [d.atStartOfDay(z).toInstant().toEpochMilli(), d.plusDays(1).atStartOfDay(z).toInstant().toEpochMilli(),
            d.minusDays(1).toString(), d.plusDays(1).toString()]
}

@NonCPS
static long parseJiraDate(String s) {
    return ZonedDateTime.parse(s, DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSZ")).toEpochSecond()
}

// Primer hueco de 'secs' entre fromH y toH, o null si no entra.
@NonCPS
static String findSlot(String day, int secs, List busy, String zone, int fromH, int toH) {
    ZoneId z = ZoneId.of(zone)
    LocalDate d = LocalDate.parse(day)
    long winStart = d.atTime(fromH, 0).atZone(z).toEpochSecond()
    long winEnd = d.atTime(toH, 0).atZone(z).toEpochSecond()
    List sorted = new ArrayList(busy)
    sorted.sort { a, b -> (a[0] as long) <=> (b[0] as long) }
    long cursor = winStart
    for (iv in sorted) {
        long s = iv[0] as long
        long e = iv[1] as long
        if (e <= cursor) { continue }
        if (s >= winEnd) { break }
        if (s - cursor >= secs) { break }   // hay hueco antes de este worklog
        cursor = Math.max(cursor, e)
    }
    if (winEnd - cursor < secs) { return null }
    return Instant.ofEpochSecond(cursor).atZone(z).format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSZ"))
}
```

---

## Uso desde un pipeline

```groovy
def secs = 900
def wl = [timeSpentSeconds: secs, comment: 'Liberación de espacio en SERVER-01']
try {
    wl.started = jiraWorklogStart(durationSeconds: secs, accountId: '<accountId>',
                                  jiraUrl: 'https://tu-sitio.atlassian.net', credentialsId: 'jira-cred',
                                  holidays: ['2026-12-08', '2026-12-25'])
} catch (e) {
    echo "WARN: ${e.message}; el worklog se registra con la hora actual"
}
httpRequest(url: 'https://tu-sitio.atlassian.net/rest/api/2/issue/OPS-123/worklog', httpMode: 'POST',
            authentication: 'jira-cred', contentType: 'APPLICATION_JSON_UTF8',
            requestBody: groovy.json.JsonOutput.toJson(wl), validResponseCodes: '200:299')
```

---

## Detalles que importan

- **Formato de `started`**: Jira exige `yyyy-MM-dd'T'HH:mm:ss.SSSZ` (por ejemplo `2026-11-09T06:15:00.000-0300`). Con otro formato responde 400.
- **`worklogDate` en JQL usa la zona horaria del usuario del token**, que puede ser distinta de la franja laboral. Por eso se busca de "día anterior" a "día siguiente" y después se filtra por `startedAfter`/`startedBefore` en milisegundos.
- **Filtrar por autor**: `/issue/{key}/worklog` devuelve los worklogs de todos. Hay que quedarse con los de `accountId`.
- **Worklogs a futuro**: Jira acepta un `started` futuro (por ejemplo, el lunes cuando el job corre el sábado).
- **Feriados**: mantener la lista actualizada cada año, o leerla de un archivo en `resources/`.
- **Probar sin Jenkins**: las funciones `@NonCPS` se pueden pegar en la *Script Console* (sin `static` ni anotaciones) y llamar con intervalos de prueba.

Relacionado: [Shared libraries](/article/jenkins/03-shared-libraries/), [Remediación automática de alertas de disco](/article/jenkins/16-remediacion-alertas-disco-alertmanager-jira/).
