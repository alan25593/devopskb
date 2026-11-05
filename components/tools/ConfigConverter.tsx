'use client'

import { useState, useMemo } from 'react'
import yaml from 'js-yaml'

type FormatType = 'yaml' | 'json' | 'dotenv' | 'toml' | 'k8s-env'

const SAMPLE_YAML = `app:
  name: wiresops-portal
  port: 3000
  debug: false
database:
  host: db.wiresops.internal
  port: 5432
  pool_size: 20
redis:
  enabled: true
  ttl_seconds: 3600`

function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [k, v] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}_${k}`.toUpperCase() : k.toUpperCase()
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(result, flattenObject(v as Record<string, unknown>, newKey))
    } else if (Array.isArray(v)) {
      result[newKey] = JSON.stringify(v)
    } else {
      result[newKey] = String(v ?? '')
    }
  }
  return result
}

function parseDotenv(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eqIdx = line.indexOf('=')
    if (eqIdx === -1) continue
    const key = line.slice(0, eqIdx).trim()
    let val = line.slice(eqIdx + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (val === 'true') result[key] = true
    else if (val === 'false') result[key] = false
    else if (/^-?\d+(\.\d+)?$/.test(val)) result[key] = Number(val)
    else result[key] = val
  }
  return result
}

function parseSimpleToml(text: string): Record<string, unknown> {
  const root: Record<string, unknown> = {}
  let currentSection: Record<string, unknown> = root

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    if (line.startsWith('[') && line.endsWith(']')) {
      const sectionName = line.slice(1, -1).trim()
      const parts = sectionName.split('.')
      let cursor = root
      for (const p of parts) {
        if (!cursor[p] || typeof cursor[p] !== 'object') {
          cursor[p] = {}
        }
        cursor = cursor[p] as Record<string, unknown>
      }
      currentSection = cursor
      continue
    }

    const eqIdx = line.indexOf('=')
    if (eqIdx === -1) continue
    const key = line.slice(0, eqIdx).trim()
    let val = line.slice(eqIdx + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
      currentSection[key] = val
    } else if (val === 'true') {
      currentSection[key] = true
    } else if (val === 'false') {
      currentSection[key] = false
    } else if (/^-?\d+(\.\d+)?$/.test(val)) {
      currentSection[key] = Number(val)
    } else {
      currentSection[key] = val
    }
  }

  return root
}

function toToml(obj: Record<string, unknown>, sectionPrefix = ''): string {
  const scalars: string[] = []
  const sections: string[] = []

  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      const nextSection = sectionPrefix ? `${sectionPrefix}.${k}` : k
      const sub = toToml(v as Record<string, unknown>, nextSection)
      sections.push(`[${nextSection}]\n${sub}`)
    } else {
      const formatted =
        typeof v === 'string'
          ? `"${v.replace(/"/g, '\\"')}"`
          : Array.isArray(v)
          ? JSON.stringify(v)
          : String(v)
      scalars.push(`${k} = ${formatted}`)
    }
  }

  return [...scalars, ...sections].join('\n').trim()
}

export default function ConfigConverter() {
  const [sourceFormat, setSourceFormat] = useState<FormatType>('yaml')
  const [targetFormat, setTargetFormat] = useState<FormatType>('json')
  const [input, setInput] = useState(SAMPLE_YAML)
  const [copied, setCopied] = useState(false)

  const converted = useMemo(() => {
    if (!input.trim()) return { output: '', error: null }

    try {
      let data: Record<string, unknown> = {}

      if (sourceFormat === 'yaml' || sourceFormat === 'k8s-env') {
        const loaded = yaml.load(input)
        if (!loaded || typeof loaded !== 'object') {
          return { output: '', error: 'El documento debe ser un objeto clave-valor válido.' }
        }
        if (Array.isArray(loaded)) {
          // Handle K8s env array input
          const envMap: Record<string, unknown> = {}
          loaded.forEach((item: Record<string, unknown>) => {
            if (item && typeof item.name === 'string') {
              envMap[item.name] = item.value ?? ''
            }
          })
          data = envMap
        } else {
          data = loaded as Record<string, unknown>
        }
      } else if (sourceFormat === 'json') {
        data = JSON.parse(input)
      } else if (sourceFormat === 'dotenv') {
        data = parseDotenv(input)
      } else if (sourceFormat === 'toml') {
        data = parseSimpleToml(input)
      }

      if (targetFormat === 'json') {
        return { output: JSON.stringify(data, null, 2), error: null }
      }
      if (targetFormat === 'yaml') {
        return { output: yaml.dump(data, { indent: 2, noRefs: true }), error: null }
      }
      if (targetFormat === 'dotenv') {
        const flat = flattenObject(data)
        const lines = Object.entries(flat).map(([k, v]) =>
          /\s/.test(v) ? `${k}="${v}"` : `${k}=${v}`
        )
        return { output: lines.join('\n'), error: null }
      }
      if (targetFormat === 'toml') {
        return { output: toToml(data), error: null }
      }
      if (targetFormat === 'k8s-env') {
        const flat = flattenObject(data)
        const k8sArr = Object.entries(flat).map(([name, value]) => ({
          name,
          value: String(value),
        }))
        return { output: yaml.dump({ env: k8sArr }, { indent: 2 }), error: null }
      }

      return { output: '', error: null }
    } catch (e: unknown) {
      return { output: '', error: e instanceof Error ? e.message : 'Error al parsear la entrada' }
    }
  }, [input, sourceFormat, targetFormat])

  const copyOutput = () => {
    navigator.clipboard.writeText(converted.output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const FORMAT_LABELS: { id: FormatType; label: string }[] = [
    { id: 'yaml', label: 'YAML' },
    { id: 'json', label: 'JSON' },
    { id: 'dotenv', label: '.env (Dotenv)' },
    { id: 'toml', label: 'TOML' },
    { id: 'k8s-env', label: 'K8s env: YAML' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Source Panel */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Formato de Entrada
            </span>
            <div className="flex flex-wrap gap-1">
              {FORMAT_LABELS.map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSourceFormat(f.id)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    sourceFormat === f.id
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            rows={15}
            className="w-full bg-gray-900 border border-gray-800 focus:border-green-600 rounded-xl p-4 font-mono text-xs text-gray-200 outline-none resize-y"
          />
        </div>

        {/* Target Panel */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Formato de Salida
            </span>
            <div className="flex flex-wrap gap-1">
              {FORMAT_LABELS.map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setTargetFormat(f.id)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    targetFormat === f.id
                      ? 'bg-cyan-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {converted.error ? (
            <div className="p-4 bg-red-950/40 border border-red-800 rounded-xl text-xs font-mono text-red-300">
              {converted.error}
            </div>
          ) : (
            <div className="relative">
              <pre className="w-full h-[334px] overflow-auto bg-gray-950 border border-gray-800 rounded-xl p-4 font-mono text-xs text-green-300">
                {converted.output}
              </pre>
              {converted.output && (
                <button
                  type="button"
                  onClick={copyOutput}
                  className="absolute top-3 right-3 px-3 py-1 bg-gray-800/90 hover:bg-gray-700 border border-gray-700 rounded text-xs text-gray-200 transition-colors"
                >
                  {copied ? '¡Copiado!' : 'Copiar'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
