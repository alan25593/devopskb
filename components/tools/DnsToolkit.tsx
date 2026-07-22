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
        if (/^\d+\.\d+\.\d+\.\d+$/.test(d.trim())) {
          const arpa = d.trim().split('.').reverse().join('.') + '.in-addr.arpa'
          data = await fetchDns('PTR')
        } else {
          throw new Error('Para REVERSE ingrese una IP IPv4 válida')
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

  const parseSecurityTxt = (records: string[]) => {
    let spf: string | null = null
    let dmarc: string | null = null

    for (const r of records) {
      const val = r.replace(/"/g, '')
      if (val.startsWith('v=spf1')) spf = val
      if (val.startsWith('v=DMARC1')) dmarc = val
    }

    return { spf, dmarc }
  }

  const renderSecurityBadge = (text: string, isSecure: boolean) => (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${
      isSecure ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'
    }`}>
      {isSecure ? 'SECURE' : 'INSECURE'} {text}
    </span>
  )

  const renderRecords = (records: any[], recordType: string = '') => {
    if (!records || records.length === 0) return <div className="text-slate-500 italic text-xs">No records</div>
    
    let secInfo = null
    if (recordType === 'TXT') {
      const { spf, dmarc } = parseSecurityTxt(records)
      if (spf || dmarc) {
        secInfo = (
          <div className="flex gap-2 mb-3 pb-3 border-b border-slate-800/60">
            {spf && renderSecurityBadge('SPF', spf.includes('-all') || spf.includes('~all'))}
            {dmarc && renderSecurityBadge('DMARC', dmarc.includes('p=reject') || dmarc.includes('p=quarantine'))}
          </div>
        )
      }
    }

    return (
      <div>
        {secInfo}
        <ul className="space-y-1.5">
          {records.map((item, i) => (
            <li key={i} className="text-slate-300 break-all bg-slate-950/50 p-2 rounded border border-slate-800/50 hover:border-cyan-900/50 transition-colors">
              {typeof item === 'string' ? item : JSON.stringify(item)}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  const renderResult = () => {
    if (loading) return <div className="text-cyan-400 italic text-sm mt-6 animate-pulse">Consultando servidores DNS raíz...</div>
    if (error) return <div className="text-red-400 text-sm mt-6 bg-red-950/40 border border-red-900/50 rounded-lg p-4 flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>{error}</div>
    if (!result) return null

    if (type === 'ALL' && typeof result === 'object' && !Array.isArray(result)) {
      return (
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-end mb-4 border-b border-slate-800 pb-2">
            <h3 className="text-sm font-semibold text-slate-300">Resumen Global</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(result).map(([recordType, records]) => (
              <div key={recordType} className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
                <h4 className="text-xs text-cyan-400 uppercase font-bold mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-500/50"></span>
                  {recordType} Records
                </h4>
                <div className="font-mono text-sm">
                  {renderRecords(records as any[], recordType)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    let content = null
    
    if (Array.isArray(result)) {
      if (result.length === 0) content = <div className="text-slate-500 italic">No records found</div>
      else {
        content = renderRecords(result, type)
      }
    } else if (typeof result === 'object') {
      content = <pre className="text-slate-300 overflow-x-auto bg-slate-950 p-4 rounded border border-slate-800/50">{JSON.stringify(result, null, 2)}</pre>
    } else {
      content = <div className="text-slate-300 bg-slate-950 p-4 rounded border border-slate-800/50">{String(result)}</div>
    }

    return (
      <div className="mt-8 bg-slate-900/40 border border-slate-800 rounded-xl p-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h3 className="text-xs text-slate-400 uppercase font-bold mb-4 flex items-center gap-2 border-b border-slate-800/60 pb-3">
          Respuesta ({type}) para {domain}
        </h3>
        <div className="font-mono text-sm">
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
            className="text-xs font-medium text-slate-400 hover:text-cyan-400 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 hover:border-cyan-900/50 rounded-md px-3 py-1.5 transition-colors"
          >
            {ex.label}
          </button>
        ))}
      </div>

      <form 
        onSubmit={(e) => { e.preventDefault(); handleLookup(domain, type); }}
        className="flex flex-col md:flex-row gap-3"
      >
        <div className="flex-1 relative">
          <input
            type="text"
            value={domain}
            onChange={e => setDomain(e.target.value)}
            placeholder="example.com o 8.8.8.8"
            className="w-full bg-slate-900/50 border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg pl-4 pr-10 py-3 text-slate-100 font-mono text-sm transition-all outline-none"
            required
            spellCheck={false}
          />
          {domain && (
            <a 
              href={`https://www.whois.com/whois/${encodeURIComponent(domain)}`}
              target="_blank"
              rel="noreferrer"
              title="Ver WHOIS"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-400 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </a>
          )}
        </div>
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          className="bg-slate-900/50 border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg px-4 py-3 text-slate-100 font-mono text-sm transition-all outline-none cursor-pointer"
        >
          {DNS_TYPES.map(t => <option key={t} value={t}>{t === 'ALL' ? 'ALL (Global)' : t}</option>)}
        </select>
        <button
          type="submit"
          disabled={loading || !domain.trim()}
          className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-cyan-900/20"
        >
          Lookup
        </button>
      </form>

      {renderResult()}
    </div>
  )
}
