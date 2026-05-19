'use client'

import { useState, useMemo } from 'react'

interface JwtParts {
  header: Record<string, unknown>
  payload: Record<string, unknown>
  signature: string
}

function decodeJwt(token: string): JwtParts | null {
  const parts = token.trim().split('.')
  if (parts.length !== 3) return null
  try {
    const decode = (str: string): Record<string, unknown> => {
      const b64 = str.replace(/-/g, '+').replace(/_/g, '/')
      const padded = b64 + '=='.slice(0, (4 - (b64.length % 4)) % 4)
      return JSON.parse(atob(padded))
    }
    return { header: decode(parts[0]), payload: decode(parts[1]), signature: parts[2] }
  } catch {
    return null
  }
}

function formatTs(ts: number): string {
  return new Date(ts * 1000).toLocaleString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  })
}

function timeRelative(ts: number): { label: string; expired: boolean } {
  const diffSec = Math.floor(ts - Date.now() / 1000)
  const abs = Math.abs(diffSec)
  const expired = diffSec < 0

  if (abs < 60) return { label: `${abs}s`, expired }
  if (abs < 3600) return { label: `${Math.floor(abs / 60)}m`, expired }
  if (abs < 86400) return { label: `${Math.floor(abs / 3600)}h ${Math.floor((abs % 3600) / 60)}m`, expired }
  return { label: `${Math.floor(abs / 86400)}d`, expired }
}

function JsonView({ data }: { data: Record<string, unknown> }) {
  const renderValue = (key: string, value: unknown): React.ReactNode => {
    const isTimestamp = (typeof value === 'number') && ['exp','iat','nbf'].includes(key)

    if (isTimestamp) {
      const v = value as number
      const rel = timeRelative(v)
      return (
        <span className="text-yellow-300">
          {v}
          <span className="ml-2 text-xs font-sans font-normal text-gray-500">
            {formatTs(v)}
            {key === 'exp' && (
              <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-medium ${
                rel.expired ? 'bg-red-900/50 text-red-400' : 'bg-green-900/40 text-green-400'
              }`}>
                {rel.expired ? `expirado hace ${rel.label}` : `expira en ${rel.label}`}
              </span>
            )}
          </span>
        </span>
      )
    }

    if (typeof value === 'string') return <span className="text-green-300">"{value}"</span>
    if (typeof value === 'number') return <span className="text-blue-300">{value}</span>
    if (typeof value === 'boolean') return <span className="text-purple-300">{String(value)}</span>
    if (value === null) return <span className="text-gray-500">null</span>
    if (typeof value === 'object') return <span className="text-gray-300">{JSON.stringify(value)}</span>
    return <span className="text-gray-300">{String(value)}</span>
  }

  return (
    <div className="font-mono text-sm space-y-1">
      {'{'}
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="pl-4">
          <span className="text-red-300">"{key}"</span>
          <span className="text-gray-500">: </span>
          {renderValue(key, value)}
        </div>
      ))}
      {'}'}
    </div>
  )
}

function Section({ title, children, badge }: { title: string; children: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden mb-4">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
        <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">{title}</span>
        {badge}
      </div>
      <div className="p-4 overflow-x-auto">
        {children}
      </div>
    </div>
  )
}

const EXAMPLE_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMyIsIm5hbWUiOiJBbGFuIExhbXBlcnQiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MTcwMDAwMzYwMH0.signature'

export default function JwtDecoder() {
  const [input, setInput] = useState('')

  const result = useMemo(() => {
    const t = input.trim()
    if (!t) return null
    return decodeJwt(t)
  }, [input])

  const showError = input.trim().length > 0 && result === null

  const expTs = result?.payload?.exp as number | undefined
  const expStatus = expTs ? timeRelative(expTs) : null

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-2">Token JWT</label>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          spellCheck={false}
          rows={4}
          className={`w-full bg-gray-900 border rounded-lg px-4 py-3 text-gray-100 font-mono text-xs placeholder-gray-600 focus:outline-none focus:ring-1 transition-colors resize-none ${
            showError
              ? 'border-red-700 focus:border-red-600 focus:ring-red-600'
              : 'border-gray-700 focus:border-green-500 focus:ring-green-500'
          }`}
        />
        {showError && (
          <p className="text-red-500 text-xs mt-1.5">Token inválido. Debe tener 3 partes separadas por puntos.</p>
        )}
        <button
          onClick={() => setInput(EXAMPLE_JWT)}
          className="mt-2 text-xs text-gray-600 hover:text-green-400 border border-gray-800 hover:border-green-800 rounded px-2 py-1 transition-colors font-mono"
        >
          cargar ejemplo
        </button>
      </div>

      {result && (
        <>
          {expStatus && (
            <div className={`mb-4 flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm ${
              expStatus.expired
                ? 'bg-red-900/20 border-red-800/50 text-red-400'
                : 'bg-green-900/20 border-green-800/50 text-green-400'
            }`}>
              <span>{expStatus.expired ? '✕ Token expirado' : '✓ Token vigente'}</span>
              <span className="text-xs opacity-70">
                {expStatus.expired ? `hace ${expStatus.label}` : `expira en ${expStatus.label}`}
              </span>
            </div>
          )}

          <Section title="Header" badge={
            <span className="text-xs font-mono text-gray-600">
              {String(result.header.alg ?? '')} · {String(result.header.typ ?? '')}
            </span>
          }>
            <JsonView data={result.header} />
          </Section>

          <Section title="Payload">
            <JsonView data={result.payload} />
          </Section>

          <Section title="Signature">
            <span className="font-mono text-xs text-gray-500 break-all">{result.signature}</span>
            <p className="text-xs text-gray-700 mt-2">La firma no se puede verificar sin la clave secreta.</p>
          </Section>
        </>
      )}
    </div>
  )
}
