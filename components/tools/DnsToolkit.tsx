'use client'

import { useState } from 'react'

const EXAMPLES = [
  { label: 'Global (All-in-One)', domain: 'google.com', type: 'ALL' },
  { label: 'A (Google)', domain: 'google.com', type: 'A' },
  { label: 'MX (Gmail)', domain: 'gmail.com', type: 'MX' },
  { label: 'TXT (Cloudflare)', domain: 'cloudflare.com', type: 'TXT' },
  { label: 'Reverse (8.8.8.8)', domain: '8.8.8.8', type: 'REVERSE' }
]

const DNS_TYPES = ['ALL', 'A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'REVERSE']

export default function DnsToolkit() {
  const [domain, setDomain] = useState('')
  const [type, setType] = useState('ALL')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleLookup = async (d: string, t: string) => {
    if (!d.trim()) return
    setDomain(d)
    setType(t)
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const fetchDns = async (queryType: string) => {
        const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(d.trim())}&type=${queryType}`, {
          headers: { 'Accept': 'application/dns-json' }
        })
        const data = await res.json()
        if (!res.ok) throw new Error('Error de conexión con Cloudflare DoH')
        return data.Answer ? data.Answer.map((a: any) => a.data) : []
      }

      let data: any = null

      if (t === 'ALL') {
        const types = ['A', 'AAAA', 'MX', 'TXT', 'NS']
        data = {}
        await Promise.all(types.map(async (queryType) => {
          try {
            data[queryType] = await fetchDns(queryType)
          } catch {
            data[queryType] = []
          }
        }))
      } else if (t === 'REVERSE') {
        // Reverse DNS no es tan simple con DoH estándar si se usa IP directa, 
        // pero podemos probar con PTR (arpa) o mostrar un aviso.
        // Simplificamos mapeando a PTR si es IP, o dando error:
        if (/^\\d+\\.\\d+\\.\\d+\\.\\d+$/.test(d.trim())) {
          const arpa = d.trim().split('.').reverse().join('.') + '.in-addr.arpa'
          data = await fetchDns('PTR')
        } else {
          throw new Error('Para REVERSE ingrese una IP IPv4')
        }
      } else {
        data = await fetchDns(t)
      }
      
      setResult(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const renderRecords = (records: any[]) => {
    if (!records || records.length === 0) return <div className="text-gray-500 italic text-xs">No records</div>
    return (
      <ul className="space-y-1">
        {records.map((item, i) => (
          <li key={i} className="text-gray-200">
            {typeof item === 'string' ? item : JSON.stringify(item)}
          </li>
        ))}
      </ul>
    )
  }

  const renderResult = () => {
    if (loading) return <div className="text-gray-400 italic text-sm mt-4">Consultando DNS...</div>
    if (error) return <div className="text-red-400 text-sm mt-4 bg-red-900/20 border border-red-800 rounded p-3">{error}</div>
    if (!result) return null

    if (type === 'ALL' && typeof result === 'object' && !Array.isArray(result)) {
      return (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(result).map(([recordType, records]) => (
            <div key={recordType} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <h3 className="text-xs text-blue-400 uppercase font-bold mb-3 border-b border-gray-800 pb-2">
                {recordType} Records
              </h3>
              <div className="font-mono text-sm break-all">
                {renderRecords(records as any[])}
              </div>
            </div>
          ))}
        </div>
      )
    }

    let content = null
    
    if (Array.isArray(result)) {
      if (result.length === 0) content = <div className="text-gray-500">No records found</div>
      else {
        content = renderRecords(result)
      }
    } else if (typeof result === 'object') {
      content = <pre className="text-gray-200 overflow-x-auto">{JSON.stringify(result, null, 2)}</pre>
    } else {
      content = <div className="text-gray-200">{String(result)}</div>
    }

    return (
      <div className="mt-6 bg-gray-900 border border-gray-800 rounded-lg p-4">
        <h3 className="text-xs text-gray-500 uppercase font-medium mb-3 border-b border-gray-800 pb-2">
          Respuesta ({type}) para {domain}
        </h3>
        <div className="font-mono text-sm break-all">
          {content}
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
            onClick={() => handleLookup(ex.domain, ex.type)}
            className="text-xs text-gray-600 hover:text-green-400 border border-gray-800 hover:border-green-800 rounded px-2 py-1 transition-colors"
          >
            {ex.label}
          </button>
        ))}
      </div>

      <form 
        onSubmit={(e) => { e.preventDefault(); handleLookup(domain, type); }}
        className="flex flex-col md:flex-row gap-3"
      >
        <div className="flex-1">
          <input
            type="text"
            value={domain}
            onChange={e => setDomain(e.target.value)}
            placeholder="example.com o 8.8.8.8"
            className="w-full bg-gray-900 border border-gray-700 focus:border-green-500 focus:ring-green-500 rounded-lg px-4 py-2.5 text-gray-100 font-mono text-sm transition-colors"
            required
          />
        </div>
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          className="bg-gray-900 border border-gray-700 focus:border-green-500 focus:ring-green-500 rounded-lg px-4 py-2.5 text-gray-100 font-mono text-sm transition-colors cursor-pointer"
        >
          {DNS_TYPES.map(t => <option key={t} value={t}>{t === 'ALL' ? 'ALL (Global)' : t}</option>)}
        </select>
        <button
          type="submit"
          disabled={loading || !domain.trim()}
          className="bg-green-700 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          Lookup
        </button>
      </form>

      {renderResult()}
    </div>
  )
}

