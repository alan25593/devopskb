'use client'

import { useState, useMemo } from 'react'

interface ParseResult {
  valid: boolean
  parsed?: unknown
  error?: { message: string; line?: number; column?: number }
}

const MAX_BYTES = 500_000

function parseJson(input: string): ParseResult {
  if (!input.trim()) return { valid: false }
  if (input.length > MAX_BYTES) return { valid: false, error: { message: `Archivo demasiado grande (máx. ${MAX_BYTES / 1000}KB)` } }
  try {
    return { valid: true, parsed: JSON.parse(input) }
  } catch (e) {
    const msg = (e as Error).message
    const posMatch = msg.match(/position (\d+)/i)
    if (posMatch) {
      const pos = parseInt(posMatch[1])
      const before = input.slice(0, pos)
      const lines = before.split('\n')
      return {
        valid: false,
        error: {
          message: msg.replace(/at position \d+/, '').trim(),
          line: lines.length,
          column: lines[lines.length - 1].length + 1,
        },
      }
    }
    return { valid: false, error: { message: msg } }
  }
}

function countDepth(val: unknown, depth = 0): number {
  if (val === null || typeof val !== 'object') return depth
  const children = Array.isArray(val) ? val : Object.values(val)
  if (children.length === 0) return depth
  return children.reduce((max, c) => Math.max(max, countDepth(c, depth + 1)), depth)
}

function countKeys(val: unknown): number {
  if (val === null || typeof val !== 'object') return 0
  if (Array.isArray(val)) return val.length + val.reduce((s, c) => s + countKeys(c), 0)
  const entries = Object.entries(val)
  return entries.length + entries.reduce((s, [, v]) => s + countKeys(v), 0)
}

const EXAMPLES: { label: string; json: string }[] = [
  {
    label: 'API Response',
    json: `{"status":"ok","data":[{"id":1,"name":"web-server-01","region":"us-east-1","state":"running","tags":{"env":"production","team":"platform"},"metrics":{"cpu":42.5,"memory":68.2,"disk":55.0}},{"id":2,"name":"db-primary","region":"us-east-1","state":"running","tags":{"env":"production","team":"data"},"metrics":{"cpu":15.3,"memory":82.1,"disk":71.4}}],"meta":{"total":2,"page":1,"per_page":20}}`,
  },
  {
    label: 'kubectl get pod -o json',
    json: `{"apiVersion":"v1","kind":"Pod","metadata":{"name":"mi-api-7d9f8b-xk2p9","namespace":"production","labels":{"app":"mi-api","version":"v1.2.0"}},"spec":{"containers":[{"name":"mi-api","image":"mi-api:v1.2.0","ports":[{"containerPort":8080}],"resources":{"requests":{"cpu":"100m","memory":"128Mi"},"limits":{"cpu":"500m","memory":"512Mi"}}}]},"status":{"phase":"Running","podIP":"10.0.0.42","startTime":"2025-01-15T10:30:00Z"}}`,
  },
  {
    label: 'Config anidada',
    json: `{"app":{"name":"devops-kb","version":"2.1.0","features":{"search":true,"tools":true,"darkMode":true},"database":{"host":"localhost","port":5432,"name":"knowdb","pool":{"min":2,"max":10}},"cache":{"ttl":3600,"maxSize":1000}}}`,
  },
]

export default function JsonFormatter() {
  const [input, setInput] = useState(`{"status":"ok","data":[{"id":1,"name":"web-server-01","region":"us-east-1","state":"running","tags":{"env":"production","team":"platform"},"metrics":{"cpu":42.5,"memory":68.2,"disk":55.0}},{"id":2,"name":"db-primary","region":"us-east-1","state":"running","tags":{"env":"production","team":"data"},"metrics":{"cpu":15.3,"memory":82.1,"disk":71.4}}],"meta":{"total":2,"page":1,"per_page":20}}`)
  const [indent, setIndent] = useState(2)
  const [copied, setCopied] = useState(false)

  const result = useMemo(() => parseJson(input), [input])
  const hasContent = input.trim().length > 0

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData('text')
    try {
      const parsed = JSON.parse(pasted)
      e.preventDefault()
      setInput(JSON.stringify(parsed, null, indent))
    } catch {
      // no es JSON válido completo, pegar normal
    }
  }

  const handleFormat = () => {
    if (!result.valid || !result.parsed) return
    setInput(JSON.stringify(result.parsed, null, indent))
  }

  const handleMinify = () => {
    if (!result.valid || !result.parsed) return
    setInput(JSON.stringify(result.parsed))
  }

  const handleCopy = async () => {
    if (!input.trim()) return
    try {
      await navigator.clipboard.writeText(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  const depth   = result.valid ? countDepth(result.parsed) : null
  const keys    = result.valid ? countKeys(result.parsed) : null
  const isArray = result.valid && Array.isArray(result.parsed)

  return (
    <div className="max-w-2xl">
      {/* Examples */}
      <div className="flex flex-wrap gap-2 mb-4">
        {EXAMPLES.map(ex => (
          <button
            key={ex.label}
            onClick={() => setInput(JSON.stringify(JSON.parse(ex.json), null, indent))}
            className="text-xs text-gray-600 hover:text-green-400 border border-gray-800 hover:border-green-800 rounded px-2 py-1 transition-colors"
          >
            {ex.label}
          </button>
        ))}
      </div>

      {/* Textarea */}
      <textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        onPaste={handlePaste}
        placeholder='Pegá tu JSON acá (minificado o no)...'
        spellCheck={false}
        rows={22}
        className={`w-full bg-gray-900 border rounded-lg px-4 py-3 text-gray-100 font-mono text-xs leading-relaxed placeholder-gray-700 focus:outline-none focus:ring-1 transition-colors resize-y ${
          hasContent && !result.valid
            ? 'border-red-700/70 focus:border-red-600 focus:ring-red-600'
            : hasContent && result.valid
            ? 'border-green-800/60 focus:border-green-600 focus:ring-green-600'
            : 'border-gray-700 focus:border-green-500 focus:ring-green-500'
        }`}
      />

      {/* Status bar */}
      {hasContent && (
        <div className={`mt-2 px-3 py-2 rounded-lg flex items-center gap-2 text-sm ${
          result.valid
            ? 'bg-green-900/20 border border-green-800/40'
            : 'bg-red-900/20 border border-red-800/40'
        }`}>
          {result.valid ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400 shrink-0"><polyline points="20 6 9 17 4 12" /></svg>
              <span className="text-green-400 font-medium">JSON válido</span>
              <span className="text-green-800">·</span>
              <span className="text-green-700 text-xs">
                {isArray
                  ? `array de ${(result.parsed as unknown[]).length} elemento${(result.parsed as unknown[]).length !== 1 ? 's' : ''}`
                  : `${keys} propiedad${keys !== 1 ? 'es' : ''}`
                }
                {depth !== null && depth > 0 && ` · profundidad ${depth}`}
              </span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-400 shrink-0"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              <span className="text-red-400 font-medium">
                Error{result.error?.line != null ? ` en línea ${result.error.line}` : ''}
                {result.error?.column != null ? `, col ${result.error.column}` : ''}
              </span>
              <span className="text-red-400/60 text-xs truncate">{result.error?.message}</span>
            </>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <button
          onClick={handleFormat}
          disabled={!result.valid}
          className="text-sm px-4 py-2 rounded-lg border transition-colors disabled:opacity-30 disabled:cursor-not-allowed border-gray-700 text-gray-300 hover:border-green-700 hover:text-green-300 disabled:hover:border-gray-700 disabled:hover:text-gray-300"
        >
          Formatear
        </button>
        <button
          onClick={handleMinify}
          disabled={!result.valid}
          className="text-sm px-4 py-2 rounded-lg border transition-colors disabled:opacity-30 disabled:cursor-not-allowed border-gray-700 text-gray-300 hover:border-green-700 hover:text-green-300 disabled:hover:border-gray-700 disabled:hover:text-gray-300"
        >
          Minificar
        </button>
        <button
          onClick={handleCopy}
          disabled={!hasContent}
          className="text-sm px-4 py-2 rounded-lg border transition-colors disabled:opacity-30 disabled:cursor-not-allowed border-gray-700 text-gray-300 hover:border-green-700 hover:text-green-300 disabled:hover:border-gray-700 disabled:hover:text-gray-300"
        >
          {copied ? '✓ Copiado' : 'Copiar'}
        </button>
        {hasContent && (
          <button
            onClick={() => setInput('')}
            className="text-sm px-4 py-2 rounded-lg border border-gray-800 text-gray-600 hover:text-gray-300 hover:border-gray-600 transition-colors"
          >
            Limpiar
          </button>
        )}

        {/* Indent toggle */}
        <div className="ml-auto flex items-center gap-1 border border-gray-800 rounded-lg p-1">
          {[2, 4].map(n => (
            <button
              key={n}
              onClick={() => {
                setIndent(n)
                if (result.valid && result.parsed) setInput(JSON.stringify(result.parsed, null, n))
              }}
              className={`text-xs px-2.5 py-1 rounded transition-colors font-mono ${
                indent === n
                  ? 'bg-gray-700 text-gray-200'
                  : 'text-gray-600 hover:text-gray-300'
              }`}
            >
              {n} sp
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
