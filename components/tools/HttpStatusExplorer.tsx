'use client'

import { useState, useMemo } from 'react'

interface StatusCodeInfo {
  code: number
  title: string
  category: '2xx' | '3xx' | '4xx' | '5xx' | 'Cloudflare / Nginx'
  summary: string
  devopsCause: string
  fixTip: string
}

const STATUS_CODES: StatusCodeInfo[] = [
  {
    code: 200,
    title: 'OK',
    category: '2xx',
    summary: 'La solicitud tuvo éxito y el servidor devolvió el cuerpo esperado.',
    devopsCause: 'Healthcheck exitoso en Kubernetes readinessProbe/livenessProbe o ALB target group.',
    fixTip: 'Asegurate de que el endpoint /healthz verifique conectividad real (DB/Redis) si es readinessProbe.',
  },
  {
    code: 201,
    title: 'Created',
    category: '2xx',
    summary: 'El recurso fue creado exitosamente (típico en POST).',
    devopsCause: 'Respuesta estándar en APIs REST al crear registros.',
    fixTip: 'Incluir el header Location apuntando al nuevo recurso creado.',
  },
  {
    code: 204,
    title: 'No Content',
    category: '2xx',
    summary: 'Solicitud exitosa pero sin contenido en el body (ej. DELETE o preflight CORS OPTIONS).',
    devopsCause: 'Muy usado en respuestas a preflight OPTIONS en Nginx/Ingress.',
    fixTip: 'Verificar que los headers Access-Control-Allow-* estén presentes aunque el body sea vacío.',
  },
  {
    code: 301,
    title: 'Moved Permanently',
    category: '3xx',
    summary: 'Redirección permanente; los navegadores y motores SEO cachean el nuevo destino.',
    devopsCause: 'Redirección HTTP ➔ HTTPS o cambio de dominio canónico.',
    fixTip: 'Al probar cambios en Nginx/Cloudflare, usá curl -I porque el navegador cachea el 301 agresivamente.',
  },
  {
    code: 302,
    title: 'Found (Temporary Redirect)',
    category: '3xx',
    summary: 'Redirección temporal; no se cachea por defecto.',
    devopsCause: 'Flujos de login OAuth2 / OIDC o mantenimientos programados.',
    fixTip: 'Si necesitás preservar el método POST en la redirección, usá 307 en lugar de 302.',
  },
  {
    code: 304,
    title: 'Not Modified',
    category: '3xx',
    summary: 'El recurso en caché del cliente sigue vigente (validación por ETag o If-Modified-Since).',
    devopsCause: 'Ahorro de ancho de banda en assets estáticos servidos por Cloudflare o Nginx.',
    fixTip: 'En deploys inmutables de Next.js (/_next/static/), combiná con Cache-Control: public, max-age=31536000, immutable.',
  },
  {
    code: 400,
    title: 'Bad Request',
    category: '4xx',
    summary: 'El servidor no pudo interpretar la solicitud por sintaxis inválida.',
    devopsCause: 'Payload JSON malformado, header Host ausente o cookie/header demasiado grande para el buffer de Nginx.',
    fixTip: 'Si ocurre con JWTs o cookies grandes en Nginx/Ingress, subí large_client_header_buffers 4 32k;.',
  },
  {
    code: 401,
    title: 'Unauthorized',
    category: '4xx',
    summary: 'Falta autenticación válida (token ausente, vencido o firma inválida).',
    devopsCause: 'JWT expirado, Basic Auth incorrecto o API Key faltante en el header Authorization.',
    fixTip: 'Inspeccioná el token en la herramienta JWT Decoder para verificar el campo exp e iss.',
  },
  {
    code: 403,
    title: 'Forbidden',
    category: '4xx',
    summary: 'El servidor entendió la solicitud pero rechaza autorizarla.',
    devopsCause: 'Regla de WAF en Cloudflare, RBAC insuficiente, IP bloqueada, o permisos de filesystem (chmod) en Nginx.',
    fixTip: 'Revisá el Security Events Log en Cloudflare o que el usuario nginx tenga permiso +x en los directorios padres.',
  },
  {
    code: 404,
    title: 'Not Found',
    category: '4xx',
    summary: 'No se encontró la ruta o recurso solicitado.',
    devopsCause: 'Ruta mal escrita, Ingress path rewrite mal configurado o SPA sin fallback a index.html.',
    fixTip: 'En SPAs servidas con Nginx, agregá try_files $uri $uri/ /index.html;.',
  },
  {
    code: 413,
    title: 'Payload Too Large',
    category: '4xx',
    summary: 'El cuerpo de la petición supera el límite permitido por el servidor o proxy.',
    devopsCause: 'En Nginx el límite por defecto es apenas 1 MB (client_max_body_size 1m).',
    fixTip: 'Agregá client_max_body_size 50M; en nginx.conf o la anotación nginx.ingress.kubernetes.io/proxy-body-size: "50m".',
  },
  {
    code: 429,
    title: 'Too Many Requests',
    category: '4xx',
    summary: 'El cliente superó el límite de peticiones (Rate Limiting).',
    devopsCause: 'limit_req_zone de Nginx, regla de Rate Limit en Cloudflare o throttling de API externa.',
    fixTip: 'Incluí el header Retry-After e implementá exponential backoff en los clientes/workers.',
  },
  {
    code: 499,
    title: 'Client Closed Request (Nginx)',
    category: 'Cloudflare / Nginx',
    summary: 'El cliente cerró la conexión antes de que Nginx recibiera respuesta del upstream.',
    devopsCause: 'El backend (Node/Python/Java) tardó demasiado y el usuario o el timeout de Cloudflare cortó antes.',
    fixTip: 'Optimizá la query lenta en el backend o revisá los timeouts del Load Balancer frontal.',
  },
  {
    code: 500,
    title: 'Internal Server Error',
    category: '5xx',
    summary: 'Excepción no controlada en la aplicación.',
    devopsCause: 'Crash en el código, variable de entorno faltante o fallo de conexión a base de datos.',
    fixTip: 'Revisá los logs del contenedor con kubectl logs -f <pod> o docker logs --tail 100 <container>.',
  },
  {
    code: 502,
    title: 'Bad Gateway',
    category: '5xx',
    summary: 'El reverse proxy (Nginx/Ingress/Cloudflare) recibió una respuesta inválida o nula del upstream.',
    devopsCause: 'El contenedor de la app está caído (CrashLoopBackOff/OOMKilled), escucha en 127.0.0.1 en vez de 0.0.0.0, o el puerto de proxy_pass es incorrecto.',
    fixTip: 'Verificá que la app escuche en 0.0.0.0:PORT y chequeá kubectl get endpoints <service>.',
  },
  {
    code: 503,
    title: 'Service Unavailable',
    category: '5xx',
    summary: 'El servidor no está listo para manejar la petición (sobrecarga o mantenimiento).',
    devopsCause: 'Ningún Pod pasó el readinessProbe en Kubernetes o se agotó el pool de conexiones.',
    fixTip: 'Ejecutá kubectl describe pod <pod> para ver por qué falla el Readiness probe.',
  },
  {
    code: 504,
    title: 'Gateway Timeout',
    category: '5xx',
    summary: 'El reverse proxy esperó más del tiempo máximo sin que el backend respondiera.',
    devopsCause: 'Reporte pesado o llamada sincrónica que supera los 60s por defecto de proxy_read_timeout en Nginx.',
    fixTip: 'Subí proxy_read_timeout 300s; o pasá la tarea pesada a una cola asíncrona.',
  },
  {
    code: 520,
    title: 'Web Server Returned an Unknown Error (Cloudflare)',
    category: 'Cloudflare / Nginx',
    summary: 'El servidor de origen devolvió una respuesta vacía, inesperada o con headers corruptos a Cloudflare.',
    devopsCause: 'Crash abrupto del worker de PHP/Node, keepalive mal calibrado o headers de respuesta > 16 KB.',
    fixTip: 'Revisá los logs de error de Nginx/origen en el segundo exacto del Ray ID de Cloudflare.',
  },
  {
    code: 521,
    title: 'Web Server Is Down (Cloudflare)',
    category: 'Cloudflare / Nginx',
    summary: 'Cloudflare intentó conectar al puerto 80/443 de tu servidor origen pero recibió Connection Refused.',
    devopsCause: 'Nginx/Docker detenido en el VPS, o el firewall (UFW / Security Group) bloquea las IPs de Cloudflare.',
    fixTip: 'Verificá systemctl status nginx y que los rangos IP de Cloudflare estén permitidos en el puerto 443.',
  },
  {
    code: 522,
    title: 'Connection Timed Out (Cloudflare)',
    category: 'Cloudflare / Nginx',
    summary: 'Cloudflare no pudo completar el handshake TCP con el servidor de origen.',
    devopsCause: 'IP mal apuntada en el registro DNS A, paquetes descartados por firewall (DROP) o CPU del host al 100%.',
    fixTip: 'Revisá que la IP en el panel DNS de Cloudflare coincida con la IP pública actual del servidor.',
  },
  {
    code: 524,
    title: 'A Timeout Occurred (Cloudflare)',
    category: 'Cloudflare / Nginx',
    summary: 'La conexión TCP se abrió bien, pero el origen tardó más de 100 segundos en responder el HTTP.',
    devopsCause: 'Cloudflare corta cualquier request HTTP que supere 100s en planes Free/Pro.',
    fixTip: 'Mové el proceso a un job en segundo plano con polling/WebSockets o ejecutalo en un subdominio gris (DNS Only).',
  },
  {
    code: 525,
    title: 'SSL Handshake Failed (Cloudflare)',
    category: 'Cloudflare / Nginx',
    summary: 'Falló la negociación TLS entre Cloudflare y tu servidor de origen.',
    devopsCause: 'Modo SSL en "Full (Strict)" pero el puerto 443 del origen no tiene certificado o los ciphers no coinciden.',
    fixTip: 'Instalál un Cloudflare Origin Certificate en tu Nginx o renová Certbot.',
  },
  {
    code: 526,
    title: 'Invalid SSL Certificate (Cloudflare)',
    category: 'Cloudflare / Nginx',
    summary: 'El modo SSL de Cloudflare está en "Full (Strict)" y el certificado del servidor origen está vencido, autofirmado o no incluye el dominio.',
    devopsCause: 'Certificado Let\'s Encrypt expirado en el servidor o CN/SAN incorrecto.',
    fixTip: 'Ejecutá certbot renew en el servidor o reemplazalo por un Origin Certificate de Cloudflare de 15 años.',
  },
]

export default function HttpStatusExplorer() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('Todos')

  const categories = ['Todos', '2xx', '3xx', '4xx', '5xx', 'Cloudflare / Nginx']

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return STATUS_CODES.filter(item => {
      if (category !== 'Todos' && item.category !== category) return false
      if (!q) return true
      return (
        String(item.code).includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.devopsCause.toLowerCase().includes(q)
      )
    })
  }, [search, category])

  const badgeColor = (code: number) => {
    if (code >= 200 && code < 300) return 'bg-green-950/60 border-green-700 text-green-400'
    if (code >= 300 && code < 400) return 'bg-cyan-950/60 border-cyan-700 text-cyan-400'
    if (code >= 400 && code < 500) return 'bg-amber-950/60 border-amber-700 text-amber-400'
    return 'bg-red-950/60 border-red-700 text-red-400'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gray-900 border border-gray-800 p-4 rounded-xl">
        <div className="flex flex-wrap gap-1.5">
          {categories.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                category === c
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por código (ej: 502, 525, timeout, cors)..."
          className="sm:w-72 bg-gray-950 border border-gray-700 focus:border-green-500 rounded-lg px-3 py-2 text-xs text-gray-100 outline-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(item => (
          <div
            key={item.code}
            className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <span className={`font-mono text-base font-bold px-2.5 py-0.5 rounded border ${badgeColor(item.code)}`}>
                    {item.code}
                  </span>
                  <h2 className="text-sm font-bold text-gray-100">{item.title}</h2>
                </div>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-gray-800 text-gray-400">
                  {item.category}
                </span>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed mb-3">{item.summary}</p>
            </div>

            <div className="space-y-2 pt-3 border-t border-gray-800/80 text-xs">
              <div>
                <span className="text-gray-400 font-semibold">Causa típica en Infra/DevOps: </span>
                <span className="text-gray-300">{item.devopsCause}</span>
              </div>
              <div className="bg-gray-950/70 border border-gray-800 rounded-lg p-2.5 text-green-300/90">
                <strong className="text-green-400">Cómo resolverlo: </strong>
                {item.fixTip}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
