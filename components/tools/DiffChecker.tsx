'use client'

import { useState, useMemo } from 'react'

interface DiffLine {
  type: 'equal' | 'insert' | 'delete'
  oldLineNumber?: number
  newLineNumber?: number
  text: string
}

interface SplitRow {
  left?: { lineNumber: number; text: string; type: 'equal' | 'delete' }
  right?: { lineNumber: number; text: string; type: 'equal' | 'insert' }
}

const EXAMPLES = [
  {
    name: 'K8s Deployment (Staging vs Prod)',
    left: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: staging
spec:
  replicas: 1
  selector:
    matchLabels:
      app: api-gateway
  template:
    spec:
      containers:
        - name: api
          image: registry.wiresops.com/api:1.4.0-rc2
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "256Mi"
          env:
            - name: LOG_LEVEL
              value: "debug"`,
    right: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: production
spec:
  replicas: 4
  selector:
    matchLabels:
      app: api-gateway
  template:
    spec:
      containers:
        - name: api
          image: registry.wiresops.com/api:1.4.0
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "1000m"
              memory: "512Mi"
          env:
            - name: LOG_LEVEL
              value: "warn"
            - name: ENABLE_METRICS
              value: "true"`,
  },
  {
    name: '.env (Local vs Producción)',
    left: `NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app_dev
REDIS_URL=redis://localhost:6379
ENABLE_SWAGGER=true
RATE_LIMIT_MAX=1000`,
    right: `NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://app_user:prod_secret@db.internal:5432/app_prod
REDIS_URL=rediss://cache.internal:6379
ENABLE_SWAGGER=false
RATE_LIMIT_MAX=120
SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0`,
  },
]

function computeDiff(
  oldText: string,
  newText: string,
  ignoreWhitespace: boolean,
  ignoreCase: boolean
): DiffLine[] {
  const oldLines = oldText.split(/\r?\n/)
  const newLines = newText.split(/\r?\n/)

  const normalize = (s: string) => {
    let res = s
    if (ignoreWhitespace) res = res.trim().replace(/\s+/g, ' ')
    if (ignoreCase) res = res.toLowerCase()
    return res
  }

  const m = oldLines.length
  const n = newLines.length

  // LCS dynamic programming table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))

  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (normalize(oldLines[i]) === normalize(newLines[j])) {
        dp[i][j] = 1 + dp[i + 1][j + 1]
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1])
      }
    }
  }

  const result: DiffLine[] = []
  let i = 0
  let j = 0

  while (i < m && j < n) {
    if (normalize(oldLines[i]) === normalize(newLines[j])) {
      result.push({
        type: 'equal',
        oldLineNumber: i + 1,
        newLineNumber: j + 1,
        text: newLines[j],
      })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({
        type: 'delete',
        oldLineNumber: i + 1,
        text: oldLines[i],
      })
      i++
    } else {
      result.push({
        type: 'insert',
        newLineNumber: j + 1,
        text: newLines[j],
      })
      j++
    }
  }

  while (i < m) {
    result.push({
      type: 'delete',
      oldLineNumber: i + 1,
      text: oldLines[i],
    })
    i++
  }

  while (j < n) {
    result.push({
      type: 'insert',
      newLineNumber: j + 1,
      text: newLines[j],
    })
    j++
  }

  return result
}

function buildSplitRows(diff: DiffLine[]): SplitRow[] {
  const rows: SplitRow[] = []
  let i = 0

  while (i < diff.length) {
    if (diff[i].type === 'equal') {
      rows.push({
        left: { lineNumber: diff[i].oldLineNumber!, text: diff[i].text, type: 'equal' },
        right: { lineNumber: diff[i].newLineNumber!, text: diff[i].text, type: 'equal' },
      })
      i++
    } else {
      const deletes: DiffLine[] = []
      const inserts: DiffLine[] = []
      while (i < diff.length && diff[i].type === 'delete') {
        deletes.push(diff[i])
        i++
      }
      while (i < diff.length && diff[i].type === 'insert') {
        inserts.push(diff[i])
        i++
      }
      const maxLen = Math.max(deletes.length, inserts.length)
      for (let k = 0; k < maxLen; k++) {
        rows.push({
          left: deletes[k]
            ? { lineNumber: deletes[k].oldLineNumber!, text: deletes[k].text, type: 'delete' }
            : undefined,
          right: inserts[k]
            ? { lineNumber: inserts[k].newLineNumber!, text: inserts[k].text, type: 'insert' }
            : undefined,
        })
      }
    }
  }

  return rows
}

export default function DiffChecker() {
  const [leftText, setLeftText] = useState(EXAMPLES[0].left)
  const [rightText, setRightText] = useState(EXAMPLES[0].right)
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split')
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false)
  const [ignoreCase, setIgnoreCase] = useState(false)
  const [onlyChanges, setOnlyChanges] = useState(false)
  const [copied, setCopied] = useState(false)

  const diff = useMemo(
    () => computeDiff(leftText, rightText, ignoreWhitespace, ignoreCase),
    [leftText, rightText, ignoreWhitespace, ignoreCase]
  )

  const stats = useMemo(() => {
    let added = 0
    let removed = 0
    let unchanged = 0
    for (const line of diff) {
      if (line.type === 'insert') added++
      else if (line.type === 'delete') removed++
      else unchanged++
    }
    return { added, removed, unchanged }
  }, [diff])

  const filteredDiff = useMemo(
    () => (onlyChanges ? diff.filter(d => d.type !== 'equal') : diff),
    [diff, onlyChanges]
  )

  const splitRows = useMemo(() => buildSplitRows(filteredDiff), [filteredDiff])

  const handleSwap = () => {
    setLeftText(rightText)
    setRightText(leftText)
  }

  const copyUnifiedPatch = () => {
    const patch = diff
      .map(l => {
        const prefix = l.type === 'insert' ? '+ ' : l.type === 'delete' ? '- ' : '  '
        return prefix + l.text
      })
      .join('\n')
    navigator.clipboard.writeText(patch)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="space-y-6">
      {/* Top Toolbar & Presets */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-900 border border-gray-800 p-3.5 rounded-xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-1">
            Ejemplos:
          </span>
          {EXAMPLES.map(ex => (
            <button
              key={ex.name}
              type="button"
              onClick={() => {
                setLeftText(ex.left)
                setRightText(ex.right)
              }}
              className="text-xs px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-md border border-gray-700 transition-colors"
            >
              {ex.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSwap}
            className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-md border border-gray-700 transition-colors flex items-center gap-1.5"
            title="Intercambiar textos izquierdo y derecho"
          >
            ⇄ Intercambiar
          </button>
          <button
            type="button"
            onClick={() => {
              setLeftText('')
              setRightText('')
            }}
            className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-red-950/60 hover:border-red-800 text-gray-300 rounded-md border border-gray-700 transition-colors"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Input Textareas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Texto Original (A)
            </label>
            <span className="text-xs text-gray-500 font-mono">
              {leftText.split(/\r?\n/).length} líneas
            </span>
          </div>
          <textarea
            value={leftText}
            onChange={e => setLeftText(e.target.value)}
            rows={10}
            placeholder="Pegá acá el código, YAML, JSON o texto original..."
            className="w-full bg-gray-900 border border-gray-800 focus:border-green-600 rounded-xl p-3.5 font-mono text-xs text-gray-200 outline-none resize-y"
          />
        </div>

        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Texto Modificado (B)
            </label>
            <span className="text-xs text-gray-500 font-mono">
              {rightText.split(/\r?\n/).length} líneas
            </span>
          </div>
          <textarea
            value={rightText}
            onChange={e => setRightText(e.target.value)}
            rows={10}
            placeholder="Pegá acá la nueva versión para comparar..."
            className="w-full bg-gray-900 border border-gray-800 focus:border-green-600 rounded-xl p-3.5 font-mono text-xs text-gray-200 outline-none resize-y"
          />
        </div>
      </div>

      {/* Diff Controls & Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-900 border border-gray-800 p-4 rounded-xl">
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          <span className="px-2.5 py-1 rounded bg-green-950/60 border border-green-800/70 text-green-400 font-semibold">
            +{stats.added} agregadas
          </span>
          <span className="px-2.5 py-1 rounded bg-red-950/60 border border-red-800/70 text-red-400 font-semibold">
            -{stats.removed} eliminadas
          </span>
          <span className="px-2.5 py-1 rounded bg-gray-800 border border-gray-700 text-gray-400">
            ={stats.unchanged} iguales
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-300">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={ignoreWhitespace}
              onChange={e => setIgnoreWhitespace(e.target.checked)}
              className="accent-green-500 rounded"
            />
            Ignorar espacios
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={ignoreCase}
              onChange={e => setIgnoreCase(e.target.checked)}
              className="accent-green-500 rounded"
            />
            Ignorar mayúsculas
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyChanges}
              onChange={e => setOnlyChanges(e.target.checked)}
              className="accent-green-500 rounded"
            />
            Solo diferencias
          </label>

          <div className="flex rounded-lg overflow-hidden border border-gray-700">
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`px-3 py-1 text-xs font-medium ${
                viewMode === 'split'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              Lado a Lado
            </button>
            <button
              type="button"
              onClick={() => setViewMode('unified')}
              className={`px-3 py-1 text-xs font-medium ${
                viewMode === 'unified'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              Unificado
            </button>
          </div>

          <button
            type="button"
            onClick={copyUnifiedPatch}
            className="px-3 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-xs text-gray-200 transition-colors"
          >
            {copied ? '¡Copiado!' : 'Copiar Patch'}
          </button>
        </div>
      </div>

      {/* Diff Output */}
      <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden shadow-lg">
        {stats.added === 0 && stats.removed === 0 ? (
          <div className="p-8 text-center text-sm text-green-400 font-medium">
            ✓ Ambos textos son idénticos (según los filtros actuales).
          </div>
        ) : viewMode === 'split' ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse font-mono text-xs">
              <tbody>
                {splitRows.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-900/80">
                    {/* Left Side */}
                    <td className="w-10 select-none text-right px-2 py-1 text-gray-600 bg-gray-900/60 border-r border-gray-800">
                      {row.left?.lineNumber ?? ''}
                    </td>
                    <td
                      className={`w-1/2 px-3 py-1 whitespace-pre-wrap break-all border-r border-gray-800 ${
                        row.left?.type === 'delete'
                          ? 'bg-red-950/40 text-red-200'
                          : row.left
                          ? 'text-gray-300'
                          : 'bg-gray-900/30'
                      }`}
                    >
                      {row.left ? (
                        <>
                          <span className="select-none inline-block w-4 text-red-400 font-bold">
                            {row.left.type === 'delete' ? '-' : ' '}
                          </span>
                          {row.left.text}
                        </>
                      ) : null}
                    </td>

                    {/* Right Side */}
                    <td className="w-10 select-none text-right px-2 py-1 text-gray-600 bg-gray-900/60 border-r border-gray-800">
                      {row.right?.lineNumber ?? ''}
                    </td>
                    <td
                      className={`w-1/2 px-3 py-1 whitespace-pre-wrap break-all ${
                        row.right?.type === 'insert'
                          ? 'bg-green-950/40 text-green-200'
                          : row.right
                          ? 'text-gray-300'
                          : 'bg-gray-900/30'
                      }`}
                    >
                      {row.right ? (
                        <>
                          <span className="select-none inline-block w-4 text-green-400 font-bold">
                            {row.right.type === 'insert' ? '+' : ' '}
                          </span>
                          {row.right.text}
                        </>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse font-mono text-xs">
              <tbody>
                {filteredDiff.map((line, idx) => (
                  <tr
                    key={idx}
                    className={`border-b border-gray-900/80 ${
                      line.type === 'insert'
                        ? 'bg-green-950/40 text-green-200'
                        : line.type === 'delete'
                        ? 'bg-red-950/40 text-red-200'
                        : 'text-gray-300'
                    }`}
                  >
                    <td className="w-10 select-none text-right px-2 py-1 text-gray-600 bg-gray-900/60 border-r border-gray-800">
                      {line.oldLineNumber ?? ''}
                    </td>
                    <td className="w-10 select-none text-right px-2 py-1 text-gray-600 bg-gray-900/60 border-r border-gray-800">
                      {line.newLineNumber ?? ''}
                    </td>
                    <td className="px-3 py-1 whitespace-pre-wrap break-all">
                      <span
                        className={`select-none inline-block w-4 font-bold ${
                          line.type === 'insert'
                            ? 'text-green-400'
                            : line.type === 'delete'
                            ? 'text-red-400'
                            : 'text-gray-600'
                        }`}
                      >
                        {line.type === 'insert' ? '+' : line.type === 'delete' ? '-' : ' '}
                      </span>
                      {line.text}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
