'use client'

import { useState, useEffect } from 'react'

const EXAMPLES = [
  { label: 'Texto Simple', text: 'WiresOps es genial!' },
  { label: 'JSON Payload', text: '{"user": "admin", "role": "devops"}' },
  { label: 'Base64 Encoded', text: 'V2lyZXNPcHM=' },
  { label: 'URL Query', text: 'https%3A%2F%2Fexample.com%2F%3Fq%3Dkubernetes' },
  { label: 'JWT Token', text: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMyIsIm5hbWUiOiJBbGFuIExhbXBlcnQiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MjUwMDAwMDAwMH0.signature' }
]

function decodeJwt(token: string) {
  const parts = token.trim().split('.')
  if (parts.length !== 3) return null
  try {
    const decode = (str: string) => {
      const b64 = str.replace(/-/g, '+').replace(/_/g, '/')
      const padded = b64 + '=='.slice(0, (4 - (b64.length % 4)) % 4)
      return JSON.parse(decodeURIComponent(escape(atob(padded))))
    }
    return { header: decode(parts[0]), payload: decode(parts[1]) }
  } catch {
    return null
  }
}

export default function HashToolkit() {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<'encode' | 'decode'>('encode')
  const [hashes, setHashes] = useState({
    md5: '',
    sha1: '',
    sha256: '',
    sha512: '',
    base64: '',
    base64Decode: '',
    urlEncode: '',
    urlDecode: '',
  })
  const [jwtData, setJwtData] = useState<{header: any, payload: any} | null>(null)

  useEffect(() => {
    const compute = async () => {
      if (!input) {
        setHashes({ md5: 'N/A', sha1: '', sha256: '', sha512: '', base64: '', base64Decode: '', urlEncode: '', urlDecode: '' })
        setJwtData(null)
        return
      }
      
      const jwt = decodeJwt(input)
      setJwtData(jwt)

      if (jwt && mode === 'encode') {
        setMode('decode') // Auto switch to decode if JWT is detected
      }

      const encoder = new TextEncoder()
      const data = encoder.encode(input)

      const hashBuffer = async (algo: string) => {
        try {
          const buf = await crypto.subtle.digest(algo, data)
          const arr = Array.from(new Uint8Array(buf))
          return arr.map(b => b.toString(16).padStart(2, '0')).join('')
        } catch {
          return 'Error'
        }
      }

      const sha1 = await hashBuffer('SHA-1')
      const sha256 = await hashBuffer('SHA-256')
      const sha512 = await hashBuffer('SHA-512')
      
      let base64 = ''
      try { base64 = btoa(unescape(encodeURIComponent(input))) } catch { base64 = 'Error' }
      
      let base64Decode = ''
      try {
        const t = input.trim()
        if (/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(t) && t.length > 0) {
          base64Decode = decodeURIComponent(escape(atob(t)))
        } else {
          base64Decode = 'No es un formato Base64 válido'
        }
      } catch {
        base64Decode = 'Error al decodificar (caracteres inválidos)'
      }

      let urlEncode = ''
      try { urlEncode = encodeURIComponent(input) } catch { urlEncode = 'Error' }

      let urlDecode = ''
      try {
        if (input.includes('%')) {
          urlDecode = decodeURIComponent(input)
        } else {
          urlDecode = 'No hay secuencias de escape % para decodificar'
        }
      } catch {
        urlDecode = 'Error al decodificar URL'
      }

      setHashes({
        md5: 'No soportado nativamente en Web Crypto',
        sha1,
        sha256,
        sha512,
        base64,
        base64Decode,
        urlEncode,
        urlDecode
      })
    }
    compute()
  }, [input, mode])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const resultBox = (label: string, value: string) => {
    const isError = value.includes('No es un formato') || value.includes('No hay secuencias') || value.includes('Error') || value.includes('No soportado')
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 relative group flex flex-col h-full">
        <h3 className="text-xs text-gray-500 uppercase font-medium mb-2">{label}</h3>
        <div className={`font-mono text-xs break-all flex-1 ${isError ? 'text-gray-600 italic' : 'text-gray-200'}`}>
          {value || <span className="text-gray-700 italic">Esperando entrada...</span>}
        </div>
        {value && !isError && (
          <button 
            onClick={() => copyToClipboard(value)}
            className="absolute top-3 right-3 text-gray-600 hover:text-green-400 opacity-0 group-hover:opacity-100 transition-all"
            title="Copiar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap gap-2 mb-4">
        {EXAMPLES.map(ex => (
          <button
            key={ex.label}
            onClick={() => {
              setInput(ex.text)
              if (ex.label.includes('Encoded') || ex.label.includes('Query') || ex.label.includes('JWT')) {
                setMode('decode')
              } else {
                setMode('encode')
              }
            }}
            className="text-xs text-gray-600 hover:text-green-400 border border-gray-800 hover:border-green-800 rounded px-2 py-1 transition-colors"
          >
            {ex.label}
          </button>
        ))}
      </div>

      <div className="mb-6">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Escribí o pegá tu texto, JSON, JWT, Base64 o URL encodeada acá..."
          rows={5}
          spellCheck={false}
          className="w-full bg-gray-900 border border-gray-700 focus:border-green-500 focus:ring-green-500 rounded-lg px-4 py-3 text-gray-100 font-mono text-sm transition-colors resize-y"
        />
      </div>

      <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 p-1 rounded-lg w-max mb-4">
        <button
          onClick={() => setMode('encode')}
          className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${mode === 'encode' ? 'bg-gray-800 text-gray-200 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Codificar
        </button>
        <button
          onClick={() => setMode('decode')}
          className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${mode === 'decode' ? 'bg-gray-800 text-gray-200 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Decodificar
        </button>
      </div>

      {jwtData && mode === 'decode' && (
        <div className="mb-4 bg-gray-900 border border-green-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3 border-b border-gray-800 pb-2">
            <span className="bg-green-900 text-green-300 text-[10px] uppercase font-bold px-2 py-0.5 rounded border border-green-800">JWT Detectado</span>
            <span className="text-gray-400 text-xs">El string ingresado es un JSON Web Token válido.</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs text-gray-500 uppercase font-medium mb-1">Header</h4>
              <pre className="text-xs text-blue-300 bg-gray-950 p-3 rounded overflow-auto border border-gray-800 max-h-40">
                {JSON.stringify(jwtData.header, null, 2)}
              </pre>
            </div>
            <div>
              <h4 className="text-xs text-gray-500 uppercase font-medium mb-1">Payload</h4>
              <pre className="text-xs text-green-300 bg-gray-950 p-3 rounded overflow-auto border border-gray-800 max-h-40">
                {JSON.stringify(jwtData.payload, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {mode === 'encode' ? (
          <>
            {resultBox('Base64', hashes.base64)}
            {resultBox('URL Encode', hashes.urlEncode)}
          </>
        ) : (
          <>
            {resultBox('Base64 Decode', hashes.base64Decode)}
            {resultBox('URL Decode', hashes.urlDecode)}
          </>
        )}
      </div>
      
      <div className="border-t border-gray-800 pt-6 mt-2">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Hashes Criptográficos (Solo sobre entrada original)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resultBox('SHA-1', hashes.sha1)}
          {resultBox('SHA-256', hashes.sha256)}
          <div className="md:col-span-2">
            {resultBox('SHA-512', hashes.sha512)}
          </div>
        </div>
      </div>
    </div>
  )
}

