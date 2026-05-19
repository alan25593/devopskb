'use client'

import { useState, useMemo } from 'react'
import * as jsyaml from 'js-yaml'

interface ParseResult {
  valid: boolean
  documents: unknown[]
  error?: {
    message: string
    line?: number
    column?: number
    snippet?: string
  }
}

const MAX_BYTES = 500_000

function parseYaml(input: string): ParseResult {
  if (!input.trim()) return { valid: false, documents: [] }
  if (input.length > MAX_BYTES) return { valid: false, documents: [], error: { message: `Archivo demasiado grande (máx. ${MAX_BYTES / 1000}KB)` } }

  try {
    const docs: unknown[] = []
    jsyaml.loadAll(input, doc => { if (doc !== null && doc !== undefined) docs.push(doc) })
    return { valid: true, documents: docs }
  } catch (e) {
    const err = e as jsyaml.YAMLException
    const mark = err.mark
    const lines = input.split('\n')
    const line = mark?.line ?? undefined
    const col  = mark?.column ?? undefined
    const snippet = line !== undefined ? lines[line] : undefined

    return {
      valid: false,
      documents: [],
      error: {
        message: err.reason ?? err.message,
        line: line !== undefined ? line + 1 : undefined,
        column: col !== undefined ? col + 1 : undefined,
        snippet,
      },
    }
  }
}

function docLabel(doc: unknown): string {
  if (doc && typeof doc === 'object') {
    const d = doc as Record<string, unknown>
    const kind = d.kind
    const name = (d.metadata as Record<string, unknown> | undefined)?.name
    if (kind) return name ? `${kind}: ${name}` : String(kind)
    if (d.services) return 'Docker Compose'
    if (d.name && d.on) return 'GitHub Actions'
  }
  return 'documento'
}

const EXAMPLES: { label: string; yaml: string }[] = [
  {
    label: 'K8s Deployment',
    yaml: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: mi-api
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mi-api
  template:
    metadata:
      labels:
        app: mi-api
    spec:
      containers:
        - name: mi-api
          image: mi-api:v1.2.0
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"`,
  },
  {
    label: 'K8s Service',
    yaml: `apiVersion: v1
kind: Service
metadata:
  name: mi-api-svc
  namespace: production
spec:
  selector:
    app: mi-api
  ports:
    - port: 80
      targetPort: 8080
  type: ClusterIP`,
  },
  {
    label: 'Docker Compose',
    yaml: `services:
  api:
    image: mi-api:latest
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: postgres://user:pass@db:5432/mydb
    depends_on:
      - db
  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: pass
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:`,
  },
  {
    label: 'GitHub Actions',
    yaml: `name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test`,
  },
  {
    label: 'YAML con error',
    yaml: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: mi-api
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mi-api
  template:
    metadata:
      labels:
      app: mi-api`,
  },
]

export default function YamlValidator() {
  const [input, setInput]       = useState('')
  const [formatted, setFormatted] = useState(false)

  const result = useMemo(() => parseYaml(input), [input])
  const hasContent = input.trim().length > 0

  const handleFormat = () => {
    if (!result.valid || result.documents.length === 0) return
    const out = result.documents
      .map(d => jsyaml.dump(d, { indent: 2, lineWidth: 120, noRefs: true }))
      .join('---\n')
    setInput(out)
    setFormatted(true)
    setTimeout(() => setFormatted(false), 1500)
  }

  const handleClear = () => setInput('')

  return (
    <div className="max-w-2xl">
      {/* Examples */}
      <div className="flex flex-wrap gap-2 mb-4">
        {EXAMPLES.map(ex => (
          <button
            key={ex.label}
            onClick={() => setInput(ex.yaml)}
            className="text-xs text-gray-600 hover:text-green-400 border border-gray-800 hover:border-green-800 rounded px-2 py-1 transition-colors"
          >
            {ex.label}
          </button>
        ))}
      </div>

      {/* Textarea */}
      <div className="relative">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Pegá tu YAML acá..."
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
      </div>

      {/* Status bar */}
      {hasContent && (
        <div className={`mt-2 px-3 py-2 rounded-lg flex items-start gap-2 text-sm ${
          result.valid
            ? 'bg-green-900/20 border border-green-800/40'
            : 'bg-red-900/20 border border-red-800/40'
        }`}>
          {result.valid ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400 shrink-0 mt-0.5"><polyline points="20 6 9 17 4 12" /></svg>
              <div>
                <span className="text-green-400 font-medium">YAML válido</span>
                {result.documents.length > 0 && (
                  <span className="text-green-700 text-xs ml-2">
                    {result.documents.length === 1
                      ? docLabel(result.documents[0])
                      : `${result.documents.length} documentos: ${result.documents.map(docLabel).join(' · ')}`
                    }
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-400 shrink-0 mt-0.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              <div className="min-w-0">
                <span className="text-red-400 font-medium">
                  Error{result.error?.line != null ? ` en línea ${result.error.line}` : ''}
                  {result.error?.column != null ? `, columna ${result.error.column}` : ''}
                </span>
                <p className="text-red-400/80 text-xs mt-0.5">{result.error?.message}</p>
                {result.error?.snippet && (
                  <pre className="mt-1.5 text-xs bg-red-900/30 border border-red-800/40 rounded px-2 py-1 text-red-300 overflow-x-auto whitespace-pre">
                    {result.error.snippet}
                    {result.error.column != null && (
                      '\n' + ' '.repeat(result.error.column - 1) + '^'
                    )}
                  </pre>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleFormat}
          disabled={!result.valid}
          className="text-sm px-4 py-2 rounded-lg border transition-colors disabled:opacity-30 disabled:cursor-not-allowed border-gray-700 text-gray-300 hover:border-green-700 hover:text-green-300 disabled:hover:border-gray-700 disabled:hover:text-gray-300"
        >
          {formatted ? '✓ Formateado' : 'Formatear YAML'}
        </button>
        {hasContent && (
          <button
            onClick={handleClear}
            className="text-sm px-4 py-2 rounded-lg border border-gray-800 text-gray-600 hover:text-gray-300 hover:border-gray-600 transition-colors"
          >
            Limpiar
          </button>
        )}
      </div>

      {result.valid && (
        <p className="text-xs text-gray-700 mt-2">
          Formatear re-indenta con 2 espacios y elimina comentarios.
        </p>
      )}
    </div>
  )
}
