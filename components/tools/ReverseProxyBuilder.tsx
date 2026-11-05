'use client'

import { useState, useMemo } from 'react'

const PRESETS = [
  {
    name: 'Next.js / Node App',
    domain: 'app.wiresops.com',
    upstreamHost: '127.0.0.1',
    upstreamPort: 3000,
    websockets: true,
    maxBodySize: '25M',
  },
  {
    name: 'Grafana Dashboard',
    domain: 'grafana.wiresops.com',
    upstreamHost: 'grafana',
    upstreamPort: 3000,
    websockets: true,
    maxBodySize: '10M',
  },
  {
    name: 'WiresDesk / RustDesk WS Relay',
    domain: 'desk.wiresops.com',
    upstreamHost: '127.0.0.1',
    upstreamPort: 21118,
    websockets: true,
    maxBodySize: '50M',
  },
  {
    name: 'Chatwoot Omnichannel',
    domain: 'chat.wiresops.com',
    upstreamHost: '127.0.0.1',
    upstreamPort: 3000,
    websockets: true,
    maxBodySize: '100M',
  },
]

export default function ReverseProxyBuilder() {
  const [domain, setDomain] = useState('app.wiresops.com')
  const [upstreamHost, setUpstreamHost] = useState('127.0.0.1')
  const [upstreamPort, setUpstreamPort] = useState(3000)
  const [enableSsl, setEnableSsl] = useState(true)
  const [forceHttps, setForceHttps] = useState(true)
  const [http2, setHttp2] = useState(true)
  const [websockets, setWebsockets] = useState(true)
  const [securityHeaders, setSecurityHeaders] = useState(true)
  const [gzip, setGzip] = useState(true)
  const [rateLimit, setRateLimit] = useState(false)
  const [maxBodySize, setMaxBodySize] = useState('25M')
  const [activeTab, setActiveTab] = useState<'nginx' | 'traefik' | 'caddy'>('nginx')
  const [copied, setCopied] = useState(false)

  const nginxConfig = useMemo(() => {
    const lines: string[] = []
    if (rateLimit) {
      lines.push(`# Rate limit zone: 10 req/s por IP`)
      lines.push(`limit_req_zone $binary_remote_addr zone=app_limit:10m rate=10r/s;\n`)
    }

    if (enableSsl && forceHttps) {
      lines.push(`server {`)
      lines.push(`    listen 80;`)
      lines.push(`    listen [::]:80;`)
      lines.push(`    server_name ${domain};`)
      lines.push(`    return 301 https://$host$request_uri;`)
      lines.push(`}\n`)
    }

    lines.push(`server {`)
    if (enableSsl) {
      lines.push(`    listen 443 ssl${http2 ? ' http2' : ''};`)
      lines.push(`    listen [::]:443 ssl${http2 ? ' http2' : ''};`)
    } else {
      lines.push(`    listen 80;`)
      lines.push(`    listen [::]:80;`)
    }
    lines.push(`    server_name ${domain};\n`)

    if (enableSsl) {
      lines.push(`    # Certificados TLS (Let's Encrypt / Certbot)`)
      lines.push(`    ssl_certificate /etc/letsencrypt/live/${domain}/fullchain.pem;`)
      lines.push(`    ssl_certificate_key /etc/letsencrypt/live/${domain}/privkey.pem;`)
      lines.push(`    ssl_protocols TLSv1.2 TLSv1.3;`)
      lines.push(`    ssl_prefer_server_ciphers on;\n`)
    }

    if (securityHeaders) {
      lines.push(`    # Security Headers`)
      if (enableSsl) {
        lines.push(`    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;`)
      }
      lines.push(`    add_header X-Frame-Options "SAMEORIGIN" always;`)
      lines.push(`    add_header X-Content-Type-Options "nosniff" always;`)
      lines.push(`    add_header Referrer-Policy "strict-origin-when-cross-origin" always;\n`)
    }

    if (gzip) {
      lines.push(`    gzip on;`)
      lines.push(`    gzip_types text/plain text/css application/json application/javascript text/xml image/svg+xml;`)
      lines.push(`    gzip_min_length 1024;\n`)
    }

    lines.push(`    client_max_body_size ${maxBodySize};\n`)

    lines.push(`    location / {`)
    if (rateLimit) {
      lines.push(`        limit_req zone=app_limit burst=20 nodelay;`)
    }
    lines.push(`        proxy_pass http://${upstreamHost}:${upstreamPort};`)
    lines.push(`        proxy_http_version 1.1;`)
    lines.push(`        proxy_set_header Host $host;`)
    lines.push(`        proxy_set_header X-Real-IP $remote_addr;`)
    lines.push(`        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`)
    lines.push(`        proxy_set_header X-Forwarded-Proto $scheme;`)

    if (websockets) {
      lines.push(`        # Soporte WebSockets`)
      lines.push(`        proxy_set_header Upgrade $http_upgrade;`)
      lines.push(`        proxy_set_header Connection "upgrade";`)
      lines.push(`        proxy_read_timeout 86400s;`)
    }

    lines.push(`    }`)
    lines.push(`}`)

    return lines.join('\n')
  }, [domain, upstreamHost, upstreamPort, enableSsl, forceHttps, http2, websockets, securityHeaders, gzip, rateLimit, maxBodySize])

  const traefikConfig = useMemo(() => {
    const svcSlug = domain.split('.')[0].replace(/[^a-zA-Z0-9]/g, '-') || 'app'
    const lines = [
      `services:`,
      `  ${svcSlug}:`,
      `    image: mi-imagen:latest`,
      `    restart: unless-stopped`,
      `    networks:`,
      `      - traefik-public`,
      `    labels:`,
      `      - "traefik.enable=true"`,
      `      - "traefik.http.routers.${svcSlug}.rule=Host(\`${domain}\`)"`,
      `      - "traefik.http.routers.${svcSlug}.entrypoints=${enableSsl ? 'websecure' : 'web'}"`,
    ]
    if (enableSsl) {
      lines.push(`      - "traefik.http.routers.${svcSlug}.tls.certresolver=letsencrypt"`)
    }
    lines.push(`      - "traefik.http.services.${svcSlug}.loadbalancer.server.port=${upstreamPort}"`)
    if (securityHeaders) {
      lines.push(`      - "traefik.http.middlewares.${svcSlug}-sec.headers.stsSeconds=63072000"`)
      lines.push(`      - "traefik.http.middlewares.${svcSlug}-sec.headers.frameDeny=true"`)
      lines.push(`      - "traefik.http.middlewares.${svcSlug}-sec.headers.contentTypeNosniff=true"`)
      lines.push(`      - "traefik.http.routers.${svcSlug}.middlewares=${svcSlug}-sec"`)
    }
    lines.push(`\nnetworks:`)
    lines.push(`  traefik-public:`)
    lines.push(`    external: true`)
    return lines.join('\n')
  }, [domain, upstreamPort, enableSsl, securityHeaders])

  const caddyConfig = useMemo(() => {
    const lines = [`${domain} {`]
    if (gzip) lines.push(`    encode zstd gzip`)
    if (securityHeaders) {
      lines.push(`    header {`)
      lines.push(`        Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"`)
      lines.push(`        X-Content-Type-Options "nosniff"`)
      lines.push(`        X-Frame-Options "SAMEORIGIN"`)
      lines.push(`    }`)
    }
    lines.push(`    request_body {`)
    lines.push(`        max_size ${maxBodySize}`)
    lines.push(`    }`)
    lines.push(`    reverse_proxy ${upstreamHost}:${upstreamPort}`)
    lines.push(`}`)
    return lines.join('\n')
  }, [domain, upstreamHost, upstreamPort, gzip, securityHeaders, maxBodySize])

  const currentOutput =
    activeTab === 'nginx' ? nginxConfig : activeTab === 'traefik' ? traefikConfig : caddyConfig

  const copyCode = () => {
    navigator.clipboard.writeText(currentOutput)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="space-y-6">
      {/* Presets */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3.5 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-1">
          Presets:
        </span>
        {PRESETS.map(p => (
          <button
            key={p.name}
            type="button"
            onClick={() => {
              setDomain(p.domain)
              setUpstreamHost(p.upstreamHost)
              setUpstreamPort(p.upstreamPort)
              setWebsockets(p.websockets)
              setMaxBodySize(p.maxBodySize)
            }}
            className="text-xs px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-md border border-gray-700 transition-colors"
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls */}
        <div className="lg:col-span-5 bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Parámetros del Proxy
          </h2>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Dominio (Server Name)</label>
            <input
              type="text"
              value={domain}
              onChange={e => setDomain(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 focus:border-green-600 rounded-lg px-3 py-2 text-xs font-mono text-gray-100 outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Host Upstream</label>
              <input
                type="text"
                value={upstreamHost}
                onChange={e => setUpstreamHost(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 focus:border-green-600 rounded-lg px-3 py-2 text-xs font-mono text-gray-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Puerto</label>
              <input
                type="number"
                value={upstreamPort}
                onChange={e => setUpstreamPort(parseInt(e.target.value, 10) || 80)}
                className="w-full bg-gray-950 border border-gray-800 focus:border-green-600 rounded-lg px-3 py-2 text-xs font-mono text-gray-100 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Tamaño máximo de upload (client_max_body_size)</label>
            <input
              type="text"
              value={maxBodySize}
              onChange={e => setMaxBodySize(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 focus:border-green-600 rounded-lg px-3 py-2 text-xs font-mono text-gray-100 outline-none"
            />
          </div>

          <div className="pt-2 border-t border-gray-800 space-y-2.5 text-xs text-gray-300">
            {[
              { label: 'Habilitar HTTPS / TLS 1.3 (Let\'s Encrypt)', state: enableSsl, setter: setEnableSsl },
              { label: 'Redirigir HTTP (80) ➔ HTTPS (443)', state: forceHttps, setter: setForceHttps },
              { label: 'Habilitar HTTP/2', state: http2, setter: setHttp2 },
              { label: 'Soporte WebSockets (Upgrade / Connection)', state: websockets, setter: setWebsockets },
              { label: 'Security Headers (HSTS, X-Frame-Options, nosniff)', state: securityHeaders, setter: setSecurityHeaders },
              { label: 'Compresión Gzip', state: gzip, setter: setGzip },
              { label: 'Rate Limiting (Anti-DDoS / Fuerza Bruta)', state: rateLimit, setter: setRateLimit },
            ].map(opt => (
              <label key={opt.label} className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={opt.state}
                  onChange={e => opt.setter(e.target.checked)}
                  className="accent-green-500 rounded"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Code Preview */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="flex gap-1">
              {[
                { id: 'nginx', label: 'Nginx (nginx.conf)' },
                { id: 'traefik', label: 'Traefik (Docker Labels)' },
                { id: 'caddy', label: 'Caddyfile' },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id as 'nginx' | 'traefik' | 'caddy')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeTab === t.id
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={copyCode}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-xs text-green-400 font-medium transition-colors"
            >
              {copied ? '¡Copiado!' : 'Copiar Configuración'}
            </button>
          </div>

          <pre className="flex-1 min-h-[380px] overflow-auto bg-gray-950 border border-gray-800 rounded-xl p-4 font-mono text-xs text-green-300 leading-relaxed">
            {currentOutput}
          </pre>
        </div>
      </div>
    </div>
  )
}
