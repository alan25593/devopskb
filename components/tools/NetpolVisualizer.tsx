'use client'

import { useState, useMemo } from 'react'
import * as jsyaml from 'js-yaml'
import IPCIDR from 'ip-cidr'

const EXAMPLES = [
  {
    label: 'Default Deny All',
    yaml: `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress`
  },
  {
    label: 'Web to DB (Egress/Ingress)',
    yaml: `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-allow
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              project: myproject
        - podSelector:
            matchLabels:
              role: frontend
      ports:
        - protocol: TCP
          port: 8080
  egress:
    - to:
        - podSelector:
            matchLabels:
              role: db
      ports:
        - protocol: TCP
          port: 5432
    - to:
        - ipBlock:
            cidr: 10.0.0.0/24
      ports:
        - protocol: TCP
          port: 5978`
  }
]

function parseLabels(labels: any) {
  if (!labels) return []
  return Object.entries(labels).map(([k, v]) => `${k}: ${v}`)
}

function parsePeers(peers: any[]) {
  if (!peers || peers.length === 0) return [{ type: 'Any' }]
  return peers.map(p => {
    if (p.ipBlock) return { type: 'IPBlock', cidr: p.ipBlock.cidr, except: p.ipBlock.except }
    if (p.namespaceSelector && p.podSelector) return { type: 'Namespace & Pod', ns: parseLabels(p.namespaceSelector.matchLabels), pod: parseLabels(p.podSelector.matchLabels) }
    if (p.namespaceSelector) return { type: 'Namespace', labels: parseLabels(p.namespaceSelector.matchLabels) }
    if (p.podSelector) return { type: 'Pod', labels: parseLabels(p.podSelector.matchLabels) }
    return { type: 'Unknown' }
  })
}

function parsePorts(ports: any[]) {
  if (!ports || ports.length === 0) return ['All Ports']
  return ports.map(p => `${p.protocol || 'TCP'}/${p.port}`)
}

export default function NetpolVisualizer() {
  const [input, setInput] = useState('')

  const [simDirection, setSimDirection] = useState<'Ingress' | 'Egress'>('Ingress')
  const [simIp, setSimIp] = useState('')
  const [simLabels, setSimLabels] = useState('')
  const [simPort, setSimPort] = useState('')

  const { parsed, error } = useMemo(() => {
    if (!input.trim()) return { parsed: null, error: null }
    try {
      const doc = jsyaml.load(input) as any
      if (!doc || doc.kind !== 'NetworkPolicy') {
        return { parsed: null, error: 'El YAML no es un NetworkPolicy válido.' }
      }

      const name = doc.metadata?.name || 'Unnamed'
      const targetLabels = parseLabels(doc.spec?.podSelector?.matchLabels)
      const isTargetEmpty = Object.keys(doc.spec?.podSelector?.matchLabels || {}).length === 0
      
      const policyTypes = doc.spec?.policyTypes || []
      const hasIngress = policyTypes.includes('Ingress') || doc.spec?.ingress
      const hasEgress = policyTypes.includes('Egress') || doc.spec?.egress

      const ingress = doc.spec?.ingress?.map((rule: any) => ({
        peers: parsePeers(rule.from),
        ports: parsePorts(rule.ports)
      })) || []

      const egress = doc.spec?.egress?.map((rule: any) => ({
        peers: parsePeers(rule.to),
        ports: parsePorts(rule.ports)
      })) || []

      return {
        parsed: { name, targetLabels, isTargetEmpty, hasIngress, hasEgress, ingress, egress },
        error: null
      }
    } catch (e: any) {
      return { parsed: null, error: e.message }
    }
  }, [input])

  const simulateTraffic = () => {
    if (!parsed) return null
    if (simDirection === 'Ingress' && !parsed.hasIngress) return { allowed: true, reason: 'Política no evalúa Ingress (Default Allow)' }
    if (simDirection === 'Egress' && !parsed.hasEgress) return { allowed: true, reason: 'Política no evalúa Egress (Default Allow)' }

    const rules = simDirection === 'Ingress' ? parsed.ingress : parsed.egress

    if (rules.length === 0) return { allowed: false, reason: `Bloquea todo el tráfico de ${simDirection} (Default Deny)` }

    const portNum = parseInt(simPort, 10)
    const testLabels = simLabels.split(',').map(s => s.trim().replace(/ /g, '')).filter(Boolean)

    for (const rule of rules) {
      // Check port
      let portMatches = true
      if (simPort && rule.ports && !rule.ports.includes('All Ports')) {
        portMatches = rule.ports.some((p: string) => {
          const rulePort = parseInt(p.split('/')[1], 10)
          return rulePort === portNum
        })
      }

      if (!portMatches) continue

      // Check peers
      let peerMatches = false
      if (rule.peers.some((p: any) => p.type === 'Any')) peerMatches = true
      else {
        // IPBlock Check
        if (simIp) {
          for (const peer of rule.peers) {
            if (peer.type === 'IPBlock' && peer.cidr) {
              try {
                const cidr = new IPCIDR(peer.cidr)
                let isExcept = false
                if (peer.except) {
                   isExcept = peer.except.some((ex: string) => new IPCIDR(ex).contains(simIp.trim()))
                }
                if (cidr.contains(simIp.trim()) && !isExcept) {
                  peerMatches = true
                }
              } catch {}
            }
          }
        }
        
        // Label Check
        if (testLabels.length > 0) {
          const ruleLabels = rule.peers.flatMap((p: any) => p.labels || p.pod || p.ns || []).map((l: string) => l.replace(/ /g, ''))
          if (ruleLabels.some((rl: string) => testLabels.includes(rl))) {
            peerMatches = true
          }
        }
        
        // Match todo si no hay test (o sea si los campos de test están vacios, no podemos confirmar pero diremos que no match)
        if (!simIp && testLabels.length === 0) {
           // Si el usuario no ingresa ip ni label y la regla pide pod/ns/ipblock, entonces no match.
           peerMatches = false
        }
      }

      if (peerMatches) {
        return { allowed: true, reason: 'Tráfico permitido por una regla específica.' }
      }
    }

    return { allowed: false, reason: 'Tráfico denegado (ninguna regla hace match explícito).' }
  }

  const simResult = simulateTraffic()

  const renderPeerCard = (peer: any) => {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded p-2 text-xs mb-1">
        <span className="text-gray-400 font-medium block mb-1">{peer.type}</span>
        {peer.cidr && <span className="text-blue-300 font-mono block">{peer.cidr}</span>}
        {peer.except && <span className="text-red-400 font-mono block text-[10px]">Except: {peer.except.join(', ')}</span>}
        {peer.labels && peer.labels.map((l: string) => <span key={l} className="bg-blue-900/30 text-blue-300 border border-blue-800/50 rounded-sm px-1 py-0.5 inline-block mr-1 mb-1 font-mono text-[10px]">{l}</span>)}
        {peer.ns && <div className="mb-1"><span className="text-gray-500 block text-[10px]">NS Match:</span> {peer.ns.map((l: string) => <span key={'ns'+l} className="bg-purple-900/30 text-purple-300 border border-purple-800/50 rounded-sm px-1 py-0.5 inline-block mr-1 font-mono text-[10px]">{l}</span>)}</div>}
        {peer.pod && <div><span className="text-gray-500 block text-[10px]">Pod Match:</span> {peer.pod.map((l: string) => <span key={'pod'+l} className="bg-green-900/30 text-green-300 border border-green-800/50 rounded-sm px-1 py-0.5 inline-block mr-1 font-mono text-[10px]">{l}</span>)}</div>}
        {peer.type === 'Any' && <span className="text-gray-300">0.0.0.0/0 (Cualquiera)</span>}
        {peer.type === 'Unknown' && <span className="text-red-400">Selector no soportado por visualizador</span>}
      </div>
    )
  }

  const renderRuleCard = (rule: any, direction: 'Ingress' | 'Egress') => (
    <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 mb-3 relative group">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[10px] uppercase font-bold text-gray-500">{direction} Rule</span>
        <div className="flex gap-1 flex-wrap justify-end max-w-[50%]">
          {rule.ports.map((p: string) => (
            <span key={p} className="bg-yellow-900/30 text-yellow-400 border border-yellow-800/50 text-[10px] px-1.5 py-0.5 rounded font-mono">
              {p}
            </span>
          ))}
        </div>
      </div>
      <div>
        {rule.peers.map((p: any, i: number) => <div key={i}>{renderPeerCard(p)}</div>)}
      </div>
    </div>
  )

  return (
    <div className="max-w-6xl flex flex-col lg:flex-row gap-6">
      <div className="flex-1">
        <div className="flex flex-wrap gap-2 mb-4">
          {EXAMPLES.map(ex => (
            <button
              key={ex.label}
              onClick={() => setInput(ex.yaml)}
              className="text-xs text-gray-600 hover:text-green-400 border border-gray-800 hover:border-green-800 rounded px-2 py-1 transition-colors"
            >
              Cargar {ex.label}
            </button>
          ))}
        </div>
        
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Pegá tu NetworkPolicy YAML acá..."
          rows={20}
          spellCheck={false}
          className="w-full bg-gray-900 border border-gray-700 focus:border-green-500 focus:ring-green-500 rounded-lg px-4 py-3 text-gray-100 font-mono text-xs transition-colors resize-y"
        />
        {error && <div className="text-red-400 text-sm mt-2">Error: {error}</div>}
      </div>

      <div className="lg:w-[600px]">
        {parsed ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-lg font-bold text-gray-200 mb-6 pb-2 border-b border-gray-800 flex justify-between items-center">
              <span>Policy: <span className="text-blue-400 font-mono text-base ml-1">{parsed.name}</span></span>
            </h3>

            <div className="grid grid-cols-3 gap-4 items-stretch relative">
              
              {/* Ingress Column */}
              <div className="flex flex-col">
                <h4 className="text-xs uppercase font-medium text-gray-500 mb-3 text-center">Ingress (Entrada)</h4>
                {!parsed.hasIngress && <div className="text-xs text-gray-600 text-center italic mt-10">No evaluado (Permite Todo)</div>}
                {parsed.hasIngress && parsed.ingress.length === 0 && <div className="bg-red-900/10 border border-red-800/30 rounded p-4 flex items-center justify-center text-red-400/80 text-xs text-center font-medium">Bloquea todo Ingress<br/>(Deny All)</div>}
                {parsed.ingress.map((r: any, i: number) => <div key={i}>{renderRuleCard(r, 'Ingress')}</div>)}
              </div>

              {/* Target Pod Column */}
              <div className="flex flex-col items-center justify-center relative">
                {/* Arrow lines */}
                {parsed.hasIngress && parsed.ingress.length > 0 && (
                  <div className="absolute top-1/2 left-0 w-8 h-[2px] bg-green-500/50 -translate-y-1/2 -ml-8"></div>
                )}
                {parsed.hasEgress && parsed.egress.length > 0 && (
                  <div className="absolute top-1/2 right-0 w-8 h-[2px] bg-blue-500/50 -translate-y-1/2 -mr-8"></div>
                )}

                <div className="bg-gray-800 border-2 border-gray-600 rounded-xl p-4 w-full z-10 shadow-lg flex flex-col items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 mb-2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  <span className="text-xs font-bold text-gray-300 uppercase mb-2">Target Pods</span>
                  {parsed.isTargetEmpty ? (
                    <span className="text-xs text-yellow-500 font-medium text-center">Aplica a TODOS los pods del namespace</span>
                  ) : (
                    <div className="flex flex-col gap-1 items-center w-full">
                      {parsed.targetLabels.map((l: string) => (
                        <span key={l} className="bg-gray-900 border border-gray-700 text-gray-300 rounded px-2 py-1 text-[10px] font-mono break-all text-center">{l}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Egress Column */}
              <div className="flex flex-col">
                <h4 className="text-xs uppercase font-medium text-gray-500 mb-3 text-center">Egress (Salida)</h4>
                {!parsed.hasEgress && <div className="text-xs text-gray-600 text-center italic mt-10">No evaluado (Permite Todo)</div>}
                {parsed.hasEgress && parsed.egress.length === 0 && <div className="bg-red-900/10 border border-red-800/30 rounded p-4 flex items-center justify-center text-red-400/80 text-xs text-center font-medium">Bloquea todo Egress<br/>(Deny All)</div>}
                {parsed.egress.map((r: any, i: number) => <div key={i}>{renderRuleCard(r, 'Egress')}</div>)}
              </div>

            </div>

            {/* Simulator */}
            <div className="mt-8 bg-gray-950/50 border border-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-bold text-gray-300 mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Simulador de Tráfico
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase font-medium mb-1">Dirección</label>
                  <select value={simDirection} onChange={e => setSimDirection(e.target.value as any)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 transition-colors focus:border-green-500 focus:ring-green-500 outline-none">
                    <option value="Ingress">Ingress (Hacia Target)</option>
                    <option value="Egress">Egress (Desde Target)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase font-medium mb-1">IP Origen/Dest</label>
                  <input type="text" value={simIp} onChange={e => setSimIp(e.target.value)} placeholder="Ej: 10.0.0.5" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 font-mono transition-colors focus:border-green-500 focus:ring-green-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase font-medium mb-1">Labels (Ej: app: web)</label>
                  <input type="text" value={simLabels} onChange={e => setSimLabels(e.target.value)} placeholder="role: db" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 font-mono transition-colors focus:border-green-500 focus:ring-green-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase font-medium mb-1">Puerto</label>
                  <input type="number" value={simPort} onChange={e => setSimPort(e.target.value)} placeholder="Ej: 8080" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 font-mono transition-colors focus:border-green-500 focus:ring-green-500 outline-none" />
                </div>
              </div>
              
              {simResult && (
                <div className={`p-3 rounded-lg flex items-center gap-3 border ${simResult.allowed ? 'bg-green-900/20 border-green-800/50 text-green-400' : 'bg-red-900/20 border-red-800/50 text-red-400'}`}>
                  <span className="text-xl">{simResult.allowed ? '✅' : '❌'}</span>
                  <div className="flex-1">
                    <div className="font-bold text-sm">{simResult.allowed ? 'Tráfico Permitido' : 'Tráfico Denegado'}</div>
                    <div className="text-xs opacity-80">{simResult.reason}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center border border-dashed border-gray-700 rounded-xl p-6 text-center text-gray-500 text-sm">
            Pegá un NetworkPolicy para visualizarlo en forma de diagrama.
          </div>
        )}
      </div>
    </div>
  )
}

