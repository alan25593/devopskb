'use client'

import { useState, useEffect, useMemo } from 'react'

type IdKind = 'uuidv4' | 'uuidv7' | 'ulid' | 'nanoid'

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

function generateUuidV4(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function generateUuidV7(): string {
  const tsHex = Date.now().toString(16).padStart(12, '0')
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)

  // 48-bit big-endian timestamp in milliseconds
  for (let i = 0; i < 6; i++) {
    bytes[i] = parseInt(tsHex.slice(i * 2, i * 2 + 2), 16)
  }

  // Version 7 (0111)
  bytes[6] = (bytes[6] & 0x0f) | 0x70
  // Variant RFC 4122 (10xx)
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function generateUlid(): string {
  let time = Date.now()
  let timeChars = ''
  for (let i = 9; i >= 0; i--) {
    const mod = time % 32
    timeChars = CROCKFORD[mod] + timeChars
    time = Math.floor(time / 32)
  }

  const randBytes = new Uint8Array(16)
  crypto.getRandomValues(randBytes)
  let randChars = ''
  for (let i = 0; i < 16; i++) {
    randChars += CROCKFORD[randBytes[i] & 31]
  }
  return timeChars + randChars
}

function generateNanoId(len = 21): string {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-'
  const bytes = new Uint8Array(len)
  crypto.getRandomValues(bytes)
  let id = ''
  for (let i = 0; i < len; i++) {
    id += alphabet[bytes[i] & 63]
  }
  return id
}

function inspectId(raw: string): {
  valid: boolean
  type: string
  version?: number
  timestamp?: Date
} {
  const s = raw.trim()
  if (!s) return { valid: false, type: 'Vacío' }

  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-([0-9a-f])[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  const match = s.match(uuidRe)
  if (match) {
    const ver = parseInt(match[1], 16)
    if (ver === 7) {
      const hexTs = s.replace(/-/g, '').slice(0, 12)
      const ms = parseInt(hexTs, 16)
      return { valid: true, type: 'UUID v7 (Time-ordered)', version: 7, timestamp: new Date(ms) }
    }
    return { valid: true, type: `UUID v${ver}`, version: ver }
  }

  if (/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(s)) {
    const upper = s.toUpperCase()
    let time = 0
    for (let i = 0; i < 10; i++) {
      const idx = CROCKFORD.indexOf(upper[i])
      if (idx === -1) return { valid: false, type: 'Desconocido' }
      time = time * 32 + idx
    }
    return { valid: true, type: 'ULID (26 chars Crockford Base32)', timestamp: new Date(time) }
  }

  return { valid: false, type: 'Formato personalizado / NanoID' }
}

export default function UuidGenerator() {
  const [kind, setKind] = useState<IdKind>('uuidv7')
  const [count, setCount] = useState(10)
  const [uppercase, setUppercase] = useState(false)
  const [noHyphens, setNoHyphens] = useState(false)
  const [outputFormat, setOutputFormat] = useState<'plain' | 'json' | 'sql'>('plain')
  const [items, setItems] = useState<string[]>([])
  const [inspectInput, setInspectInput] = useState('')
  const [copied, setCopied] = useState(false)

  const regenerate = () => {
    const list: string[] = []
    const n = Math.min(Math.max(count, 1), 100)
    for (let i = 0; i < n; i++) {
      let id =
        kind === 'uuidv4'
          ? generateUuidV4()
          : kind === 'uuidv7'
          ? generateUuidV7()
          : kind === 'ulid'
          ? generateUlid()
          : generateNanoId(21)
      if (noHyphens && (kind === 'uuidv4' || kind === 'uuidv7')) {
        id = id.replace(/-/g, '')
      }
      if (uppercase && kind !== 'nanoid') id = id.toUpperCase()
      if (!uppercase && kind === 'ulid') id = id.toLowerCase()
      list.push(id)
    }
    setItems(list)
    if (list.length > 0 && !inspectInput) {
      setInspectInput(list[0])
    }
  }

  useEffect(() => {
    regenerate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, count, uppercase, noHyphens])

  const formattedOutput = useMemo(() => {
    if (outputFormat === 'json') return JSON.stringify(items, null, 2)
    if (outputFormat === 'sql') return items.map(i => `('${i}')`).join(',\n')
    return items.join('\n')
  }, [items, outputFormat])

  const inspected = useMemo(() => inspectId(inspectInput), [inspectInput])

  const copyAll = () => {
    navigator.clipboard.writeText(formattedOutput)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'uuidv7', label: 'UUID v7 (Ordenable por tiempo — Recomendado DB)' },
              { id: 'uuidv4', label: 'UUID v4 (Aleatorio)' },
              { id: 'ulid', label: 'ULID (26 chars)' },
              { id: 'nanoid', label: 'NanoID (21 chars)' },
            ].map(k => (
              <button
                key={k.id}
                type="button"
                onClick={() => setKind(k.id as IdKind)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  kind === k.id
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={regenerate}
            className="px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            ↻ Generar Nuevos
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-5 pt-3 border-t border-gray-800 text-xs text-gray-300">
          <div className="flex items-center gap-2">
            <span>Cantidad:</span>
            <input
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={e => setCount(parseInt(e.target.value, 10) || 1)}
              className="w-16 bg-gray-950 border border-gray-700 rounded px-2 py-1 text-center font-mono"
            />
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={uppercase}
              onChange={e => setUppercase(e.target.checked)}
              className="accent-green-500"
            />
            Mayúsculas
          </label>

          {(kind === 'uuidv4' || kind === 'uuidv7') && (
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={noHyphens}
                onChange={e => setNoHyphens(e.target.checked)}
                className="accent-green-500"
              />
              Sin guiones
            </label>
          )}

          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-gray-400">Formato:</span>
            {(['plain', 'json', 'sql'] as const).map(fmt => (
              <button
                key={fmt}
                type="button"
                onClick={() => setOutputFormat(fmt)}
                className={`px-2.5 py-1 rounded uppercase font-mono text-[11px] ${
                  outputFormat === fmt
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              IDs Generados ({items.length})
            </span>
            <button
              type="button"
              onClick={copyAll}
              className="text-xs px-3 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-green-400 font-medium"
            >
              {copied ? '¡Copiados!' : 'Copiar Todos'}
            </button>
          </div>
          <pre className="w-full h-72 overflow-auto bg-gray-950 border border-gray-800 rounded-xl p-4 font-mono text-xs text-green-300 select-all">
            {formattedOutput}
          </pre>
        </div>

        {/* Timestamp Inspector */}
        <div className="lg:col-span-5 bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Inspector de UUID v7 / ULID (Decodificar Timestamp)
          </h2>

          <input
            type="text"
            value={inspectInput}
            onChange={e => setInspectInput(e.target.value)}
            placeholder="Pegá un UUID v7, UUID v4 o ULID..."
            className="w-full bg-gray-950 border border-gray-700 focus:border-green-500 rounded-lg px-3 py-2 text-xs font-mono text-gray-100 outline-none"
          />

          <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Tipo detectado:</span>
              <span className="font-semibold text-cyan-400">{inspected.type}</span>
            </div>
            {inspected.timestamp && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-400">Timestamp UTC:</span>
                  <span className="font-mono text-green-400">{inspected.timestamp.toISOString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Hora Local:</span>
                  <span className="font-mono text-gray-200">{inspected.timestamp.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Epoch (ms):</span>
                  <span className="font-mono text-gray-300">{inspected.timestamp.getTime()}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
