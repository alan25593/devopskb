'use client'

import { useState } from 'react'
import * as forge from 'node-forge'

const EXAMPLES = [
  { label: 'Dominio Válido', text: 'google.com' },
  { label: 'Dominio Expirado', text: 'expired.badssl.com' },
  { label: 'Self Signed', text: 'self-signed.badssl.com' }
]

export default function CertificateInspector() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleInspect = async (val: string) => {
    const trimmed = val.trim()
    if (!trimmed) return
    setInput(trimmed)
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      if (trimmed.includes('-----BEGIN CERTIFICATE-----')) {
        const pems = trimmed.split('-----END CERTIFICATE-----').filter(s => s.includes('BEGIN')).map(s => s + '-----END CERTIFICATE-----')
        
        const getAttrs = (attrs: any[]) => attrs.reduce((acc, curr) => {
          acc[curr.shortName || curr.name || 'Unknown'] = curr.value
          return acc
        }, {} as Record<string, string>)

        const chain = pems.map(pem => {
          const cert = forge.pki.certificateFromPem(pem)
          return {
            subject: getAttrs(cert.subject.attributes),
            issuer: getAttrs(cert.issuer.attributes),
            valid_from: cert.validity.notBefore.toISOString(),
            valid_to: cert.validity.notAfter.toISOString(),
            fingerprint: forge.md.sha1.create().update(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes()).digest().toHex().match(/.{1,2}/g)?.join(':').toUpperCase(),
            fingerprint256: forge.md.sha256.create().update(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes()).digest().toHex().match(/.{1,2}/g)?.join(':').toUpperCase(),
            serialNumber: cert.serialNumber
          }
        })

        setResult({ source: 'PEM Local', chain })
      } else {
        const domain = trimmed.replace(/^https?:\/\//, '').split('/')[0]
        const res = await fetch(`/api/tls?host=${encodeURIComponent(domain)}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error de conexión TLS')
        setResult({
          source: `Conexión a ${domain}:443`,
          chain: data.chain
        })
      }
    } catch (e: any) {
      setError(e.message || 'Error al procesar el certificado')
    } finally {
      setLoading(false)
    }
  }

  const renderAttributes = (attrs: Record<string, string>) => {
    if (!attrs) return <span className="text-gray-500 italic">No disponible</span>
    return (
      <ul className="space-y-1">
        {Object.entries(attrs).map(([key, val]) => (
          <li key={key}><span className="text-gray-500 mr-2">{key}=</span><span className="text-gray-300">{val}</span></li>
        ))}
      </ul>
    )
  }

  const renderCertCard = (cert: any, index: number, total: number) => {
    const validTo = new Date(cert.valid_to)
    const isExpired = validTo < new Date()
    const daysRemaining = Math.ceil((validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    
    let title = 'Peer Certificate (Server)'
    if (index === total - 1 && total > 1) title = 'Root CA Certificate'
    else if (index > 0) title = `Intermediate Certificate (${index})`

    return (
      <div key={index} className="mt-6 border-l-2 border-gray-700 pl-4 relative">
        {/* Connection line dot */}
        <div className="absolute -left-[9px] top-4 w-4 h-4 bg-gray-900 border-2 border-gray-600 rounded-full"></div>
        
        <h2 className="text-lg font-bold text-gray-200 mb-2">{title}</h2>
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm mb-4 ${
          isExpired ? 'bg-red-900/20 border-red-800/50 text-red-400' : 'bg-green-900/20 border-green-800/50 text-green-400'
        }`}>
          <span>{isExpired ? '✕ Certificado Expirado' : '✓ Certificado Vigente'}</span>
          <span className="text-xs opacity-70">
            {isExpired ? `expiró hace ${Math.abs(daysRemaining)} días` : `expira en ${daysRemaining} días`}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h3 className="text-xs text-gray-500 uppercase font-medium mb-3 border-b border-gray-800 pb-2">Subject (A quién se emite)</h3>
            <div className="font-mono text-sm">{renderAttributes(cert.subject)}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h3 className="text-xs text-gray-500 uppercase font-medium mb-3 border-b border-gray-800 pb-2">Issuer (Quién emite)</h3>
            <div className="font-mono text-sm">{renderAttributes(cert.issuer)}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 md:col-span-2">
            <h3 className="text-xs text-gray-500 uppercase font-medium mb-3 border-b border-gray-800 pb-2">Detalles Adicionales</h3>
            <div className="font-mono text-sm space-y-2 text-gray-300">
              <div><span className="text-gray-500 w-32 inline-block">Válido Desde:</span> {new Date(cert.valid_from).toLocaleString()}</div>
              <div><span className="text-gray-500 w-32 inline-block">Válido Hasta:</span> {validTo.toLocaleString()}</div>
              {cert.subjectaltname && (
                <div className="mt-2">
                  <span className="text-gray-500 block mb-1">Subject Alternative Names (SANs):</span>
                  <div className="break-words text-xs">{cert.subjectaltname}</div>
                </div>
              )}
              {cert.fingerprint256 && (
                <div className="mt-2">
                  <span className="text-gray-500 block mb-1">Fingerprint (SHA-256):</span>
                  <div className="break-all text-xs text-blue-300">{cert.fingerprint256}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderResult = () => {
    if (loading) return <div className="text-gray-400 italic text-sm mt-4">Inspeccionando certificado...</div>
    if (error) return <div className="text-red-400 text-sm mt-4 bg-red-900/20 border border-red-800 rounded p-3">{error}</div>
    if (!result || !result.chain) return null

    return (
      <div className="mt-8">
        <h3 className="text-sm text-gray-500 uppercase font-bold mb-4">Cadena de Confianza ({result.source})</h3>
        <div className="space-y-2">
          {result.chain.map((cert: any, i: number) => renderCertCard(cert, i, result.chain.length))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap gap-2 mb-6">
        {EXAMPLES.map(ex => (
          <button
            key={ex.label}
            onClick={() => handleInspect(ex.text)}
            className="text-xs text-gray-600 hover:text-green-400 border border-gray-800 hover:border-green-800 rounded px-2 py-1 transition-colors"
          >
            {ex.label}
          </button>
        ))}
      </div>

      <form 
        onSubmit={(e) => { e.preventDefault(); handleInspect(input); }}
        className="flex flex-col gap-3"
      >
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Escribí un dominio (ej: google.com) o pegá un certificado PEM completo (-----BEGIN CERTIFICATE-----...)"
          className="w-full bg-gray-900 border border-gray-700 focus:border-green-500 focus:ring-green-500 rounded-lg px-4 py-3 text-gray-100 font-mono text-sm transition-colors resize-y min-h-[100px]"
          required
        />
        <div>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-green-700 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Inspeccionar Certificado
          </button>
        </div>
      </form>

      {renderResult()}
    </div>
  )
}

