'use client'

import { useState, useMemo } from 'react'
import yaml from 'js-yaml'

const PRESETS = [
  {
    name: 'Nginx + SSL Volumes',
    cmd: `docker run -d --name nginx-proxy \\
  --restart unless-stopped \\
  -p 80:80 -p 443:443 \\
  -v ./nginx.conf:/etc/nginx/nginx.conf:ro \\
  -v certs-data:/etc/letsencrypt \\
  -e TZ=America/Argentina/Buenos_Aires \\
  --network frontend-net \\
  nginx:1.27-alpine`,
  },
  {
    name: 'PostgreSQL 16',
    cmd: `docker run -d --name postgres-db \\
  --restart always \\
  -p 5432:5432 \\
  -e POSTGRES_USER=wiresops \\
  -e POSTGRES_PASSWORD=supersecret \\
  -e POSTGRES_DB=production \\
  -v pgdata:/var/lib/postgresql/data \\
  --memory 1g --cpus 1.5 \\
  postgres:16-alpine`,
  },
  {
    name: 'Grafana OSS',
    cmd: `docker run -d --name grafana \\
  --restart unless-stopped \\
  -p 3000:3000 \\
  -e GF_SECURITY_ADMIN_PASSWORD=admin \\
  -e GF_USERS_ALLOW_SIGN_UP=false \\
  -v grafana-storage:/var/lib/grafana \\
  --network monitoring \\
  grafana/grafana-oss:latest`,
  },
]

function tokenizeCommand(cmd: string): string[] {
  const cleaned = cmd.replace(/\\\r?\n/g, ' ').trim()
  const tokens: string[] = []
  let current = ''
  let quote: '"' | "'" | null = null

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i]
    if (quote) {
      if (ch === quote) {
        quote = null
      } else {
        current += ch
      }
    } else {
      if (ch === '"' || ch === "'") {
        quote = ch
      } else if (/\s/.test(ch)) {
        if (current) {
          tokens.push(current)
          current = ''
        }
      } else {
        current += ch
      }
    }
  }
  if (current) tokens.push(current)
  return tokens
}

function dockerRunToCompose(cmd: string): { yaml: string; error?: string } {
  const tokens = tokenizeCommand(cmd)
  if (tokens.length === 0) return { yaml: '' }

  let idx = 0
  if (tokens[idx] === 'sudo') idx++
  if (tokens[idx] === 'docker') idx++
  if (tokens[idx] === 'container') idx++
  if (tokens[idx] === 'run') idx++

  const service: Record<string, unknown> = {}
  let serviceName = 'app'
  const ports: string[] = []
  const volumes: string[] = []
  const environment: string[] = []
  const envFiles: string[] = []
  const networks: string[] = []
  const labels: string[] = []
  const extraHosts: string[] = []
  const capAdd: string[] = []
  const namedVolumes = new Set<string>()
  let memoryLimit = ''
  let cpuLimit = ''

  while (idx < tokens.length) {
    const t = tokens[idx]
    if (!t.startsWith('-')) {
      // Found the image
      service.image = t
      idx++
      if (idx < tokens.length) {
        const commandArgs = tokens.slice(idx)
        service.command = commandArgs.length === 1 ? commandArgs[0] : commandArgs.join(' ')
      }
      break
    }

    if (t === '-d' || t === '--detach' || t === '-it' || t === '-i' || t === '-t') {
      if (t.includes('i')) service.stdin_open = true
      if (t.includes('t') && t !== '--detach') service.tty = true
      idx++
    } else if (t === '--rm') {
      idx++
    } else if (t === '--privileged') {
      service.privileged = true
      idx++
    } else if ((t === '--name' || t.startsWith('--name=')) && idx < tokens.length) {
      const val = t.includes('=') ? t.split('=')[1] : tokens[++idx]
      if (val) {
        serviceName = val.replace(/[^a-zA-Z0-9_-]/g, '_')
        service.container_name = val
      }
      idx++
    } else if (t === '-p' || t === '--publish' || t.startsWith('-p=') || t.startsWith('--publish=')) {
      const val = t.includes('=') ? t.split('=')[1] : tokens[++idx]
      if (val) ports.push(val)
      idx++
    } else if (t === '-v' || t === '--volume' || t.startsWith('-v=') || t.startsWith('--volume=')) {
      const val = t.includes('=') ? t.split('=')[1] : tokens[++idx]
      if (val) {
        volumes.push(val)
        const hostPart = val.split(':')[0]
        if (hostPart && !hostPart.startsWith('.') && !hostPart.startsWith('/') && !hostPart.includes('\\')) {
          namedVolumes.add(hostPart)
        }
      }
      idx++
    } else if (t === '-e' || t === '--env' || t.startsWith('-e=') || t.startsWith('--env=')) {
      const val = t.includes('=') && t.startsWith('--env=') ? t.slice(6) : tokens[++idx]
      if (val) environment.push(val)
      idx++
    } else if (t === '--env-file') {
      const val = tokens[++idx]
      if (val) envFiles.push(val)
      idx++
    } else if (t === '--restart' || t.startsWith('--restart=')) {
      const val = t.includes('=') ? t.split('=')[1] : tokens[++idx]
      if (val) service.restart = val
      idx++
    } else if (t === '--network' || t === '--net' || t.startsWith('--network=')) {
      const val = t.includes('=') ? t.split('=')[1] : tokens[++idx]
      if (val) {
        if (val === 'host') service.network_mode = 'host'
        else networks.push(val)
      }
      idx++
    } else if (t === '-w' || t === '--workdir') {
      service.working_dir = tokens[++idx]
      idx++
    } else if (t === '-u' || t === '--user') {
      service.user = tokens[++idx]
      idx++
    } else if (t === '--entrypoint') {
      service.entrypoint = tokens[++idx]
      idx++
    } else if (t === '-m' || t === '--memory') {
      memoryLimit = tokens[++idx]
      idx++
    } else if (t === '--cpus') {
      cpuLimit = tokens[++idx]
      idx++
    } else if (t === '-l' || t === '--label') {
      const val = tokens[++idx]
      if (val) labels.push(val)
      idx++
    } else if (t === '--add-host') {
      const val = tokens[++idx]
      if (val) extraHosts.push(val)
      idx++
    } else if (t === '--cap-add') {
      const val = tokens[++idx]
      if (val) capAdd.push(val)
      idx++
    } else {
      idx++
    }
  }

  if (!service.image) {
    return { yaml: '', error: 'No se detectó el nombre de la imagen en el comando docker run.' }
  }

  if (ports.length > 0) service.ports = ports
  if (environment.length > 0) service.environment = environment
  if (envFiles.length > 0) service.env_file = envFiles
  if (volumes.length > 0) service.volumes = volumes
  if (networks.length > 0) service.networks = networks
  if (labels.length > 0) service.labels = labels
  if (extraHosts.length > 0) service.extra_hosts = extraHosts
  if (capAdd.length > 0) service.cap_add = capAdd

  if (memoryLimit || cpuLimit) {
    const limits: Record<string, string> = {}
    if (cpuLimit) limits.cpus = String(cpuLimit)
    if (memoryLimit) limits.memory = memoryLimit
    service.deploy = { resources: { limits } }
  }

  const composeObj: Record<string, unknown> = {
    services: {
      [serviceName]: service,
    },
  }

  if (namedVolumes.size > 0) {
    const vols: Record<string, Record<string, never>> = {}
    namedVolumes.forEach(v => {
      vols[v] = {}
    })
    composeObj.volumes = vols
  }

  if (networks.length > 0) {
    const nets: Record<string, { external: boolean }> = {}
    networks.forEach(n => {
      nets[n] = { external: true }
    })
    composeObj.networks = nets
  }

  return {
    yaml: yaml.dump(composeObj, { indent: 2, lineWidth: 120, noRefs: true }),
  }
}

function composeToDockerRun(yamlStr: string): { commands: string[]; error?: string } {
  try {
    const parsed = yaml.load(yamlStr) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object' || !parsed.services) {
      return { commands: [], error: 'El YAML debe contener una clave raíz "services:".' }
    }

    const services = parsed.services as Record<string, Record<string, unknown>>
    const cmds: string[] = []

    for (const [name, svc] of Object.entries(services)) {
      if (!svc || typeof svc !== 'object') continue
      const parts: string[] = ['docker run -d']
      const cName = (svc.container_name as string) || name
      parts.push(`--name ${cName}`)

      if (svc.restart) parts.push(`--restart ${svc.restart}`)
      if (svc.privileged) parts.push('--privileged')
      if (svc.network_mode) parts.push(`--network ${svc.network_mode}`)
      if (svc.working_dir) parts.push(`-w ${svc.working_dir}`)
      if (svc.user) parts.push(`-u ${svc.user}`)
      if (svc.entrypoint) parts.push(`--entrypoint "${svc.entrypoint}"`)

      if (Array.isArray(svc.ports)) {
        svc.ports.forEach(p => parts.push(`-p ${p}`))
      }
      if (Array.isArray(svc.environment)) {
        svc.environment.forEach(e => parts.push(`-e "${e}"`))
      } else if (svc.environment && typeof svc.environment === 'object') {
        for (const [k, v] of Object.entries(svc.environment)) {
          parts.push(`-e "${k}=${v ?? ''}"`)
        }
      }
      if (Array.isArray(svc.volumes)) {
        svc.volumes.forEach(v => parts.push(`-v ${v}`))
      }
      if (Array.isArray(svc.networks)) {
        svc.networks.forEach(n => parts.push(`--network ${n}`))
      }

      const image = (svc.image as string) || `${name}:latest`
      parts.push(image)

      if (svc.command) {
        parts.push(Array.isArray(svc.command) ? svc.command.join(' ') : String(svc.command))
      }

      cmds.push(parts.join(' \\\n  '))
    }

    return { commands: cmds }
  } catch (e: unknown) {
    return { commands: [], error: e instanceof Error ? e.message : 'YAML inválido' }
  }
}

export default function DockerConverter() {
  const [direction, setDirection] = useState<'run-to-compose' | 'compose-to-run'>('run-to-compose')
  const [runInput, setRunInput] = useState(PRESETS[0].cmd)
  const [composeInput, setComposeInput] = useState('')
  const [copied, setCopied] = useState(false)

  const runResult = useMemo(() => dockerRunToCompose(runInput), [runInput])
  const composeResult = useMemo(() => composeToDockerRun(composeInput), [composeInput])

  const switchDirection = (next: 'run-to-compose' | 'compose-to-run') => {
    if (next === 'compose-to-run' && !composeInput && runResult.yaml) {
      setComposeInput(runResult.yaml)
    }
    setDirection(next)
  }

  const copyOutput = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="space-y-6">
      {/* Mode Switcher & Presets */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-900 border border-gray-800 p-3.5 rounded-xl">
        <div className="flex rounded-lg overflow-hidden border border-gray-700">
          <button
            type="button"
            onClick={() => switchDirection('run-to-compose')}
            className={`px-4 py-1.5 text-xs font-semibold transition-colors ${
              direction === 'run-to-compose'
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-gray-200'
            }`}
          >
            docker run ➔ docker-compose.yml
          </button>
          <button
            type="button"
            onClick={() => switchDirection('compose-to-run')}
            className={`px-4 py-1.5 text-xs font-semibold transition-colors ${
              direction === 'compose-to-run'
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-gray-200'
            }`}
          >
            docker-compose.yml ➔ docker run
          </button>
        </div>

        {direction === 'run-to-compose' && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-400 font-semibold uppercase">Presets:</span>
            {PRESETS.map(p => (
              <button
                key={p.name}
                type="button"
                onClick={() => setRunInput(p.cmd)}
                className="text-xs px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded border border-gray-700 transition-colors"
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Editor Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {direction === 'run-to-compose' ? (
          <>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Comando docker run
              </label>
              <textarea
                value={runInput}
                onChange={e => setRunInput(e.target.value)}
                rows={14}
                placeholder="docker run -d --name mi-app -p 8080:80 nginx:alpine"
                className="w-full bg-gray-900 border border-gray-800 focus:border-green-600 rounded-xl p-4 font-mono text-xs text-gray-200 outline-none resize-y"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  docker-compose.yml Generado
                </span>
                {runResult.yaml && (
                  <button
                    type="button"
                    onClick={() => copyOutput(runResult.yaml)}
                    className="text-xs px-3 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-green-400 font-medium transition-colors"
                  >
                    {copied ? '¡Copiado!' : 'Copiar YAML'}
                  </button>
                )}
              </div>

              {runResult.error ? (
                <div className="p-4 bg-red-950/40 border border-red-800/80 rounded-xl text-xs text-red-300 font-mono">
                  {runResult.error}
                </div>
              ) : (
                <pre className="w-full h-[312px] overflow-auto bg-gray-950 border border-gray-800 rounded-xl p-4 font-mono text-xs text-green-300">
                  {runResult.yaml}
                </pre>
              )}
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Archivo docker-compose.yml
              </label>
              <textarea
                value={composeInput}
                onChange={e => setComposeInput(e.target.value)}
                rows={14}
                placeholder="services:&#10;  app:&#10;    image: nginx:alpine&#10;    ports:&#10;      - '8080:80'"
                className="w-full bg-gray-900 border border-gray-800 focus:border-green-600 rounded-xl p-4 font-mono text-xs text-gray-200 outline-none resize-y"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Comandos docker run Equivalentes
                </span>
                {composeResult.commands.length > 0 && (
                  <button
                    type="button"
                    onClick={() => copyOutput(composeResult.commands.join('\n\n'))}
                    className="text-xs px-3 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-green-400 font-medium transition-colors"
                  >
                    {copied ? '¡Copiado!' : 'Copiar Comando'}
                  </button>
                )}
              </div>

              {composeResult.error ? (
                <div className="p-4 bg-red-950/40 border border-red-800/80 rounded-xl text-xs text-red-300 font-mono">
                  {composeResult.error}
                </div>
              ) : (
                <pre className="w-full h-[312px] overflow-auto bg-gray-950 border border-gray-800 rounded-xl p-4 font-mono text-xs text-cyan-300">
                  {composeResult.commands.join('\n\n# ---\n\n')}
                </pre>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
