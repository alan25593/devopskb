'use client'

import { useState, useMemo } from 'react'
import IPCIDR from 'ip-cidr'

const EXAMPLES = [
  { label: 'AWS VPC /16 a /24', cidr: '10.0.0.0/16', target: 24 },
  { label: 'K8s Pods /20 a /26', cidr: '172.16.0.0/20', target: 26 },
  { label: 'Punto a Punto /30', cidr: '192.168.1.0/24', target: 30 }
]

function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0
}

function intToIp(int: number): string {
  return [
    (int >>> 24) & 255,
    (int >>> 16) & 255,
    (int >>> 8) & 255,
    int & 255
  ].join('.')
}

export default function CidrVisualizer() {
  const [cidrInput, setCidrInput] = useState('10.0.0.0/16')
  const [targetPrefixStr, setTargetPrefixStr] = useState('24')
  const [testIp, setTestIp] = useState('')

  const { error, subnets, totalSubnets, baseIp, basePrefix } = useMemo(() => {
    if (!cidrInput.trim()) return { error: null, subnets: [], totalSubnets: 0, baseIp: '', basePrefix: 0 }

    const parts = cidrInput.trim().split('/')
    if (parts.length !== 2) return { error: 'Formato inválido. Usá IP/Mask (ej: 10.0.0.0/16)', subnets: [], totalSubnets: 0, baseIp: '', basePrefix: 0 }

    const ip = parts[0]
    const mask = parseInt(parts[1], 10)
    const targetMask = parseInt(targetPrefixStr, 10)

    if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) return { error: 'IP inválida', subnets: [], totalSubnets: 0, baseIp: '', basePrefix: 0 }
    if (isNaN(mask) || mask < 0 || mask > 32) return { error: 'Máscara base inválida (0-32)', subnets: [], totalSubnets: 0, baseIp: '', basePrefix: 0 }
    if (isNaN(targetMask) || targetMask < mask || targetMask > 32) return { error: 'Máscara objetivo inválida (debe ser mayor o igual a la base y menor a 33)', subnets: [], totalSubnets: 0, baseIp: '', basePrefix: 0 }

    let ipInt: number
    try {
      ipInt = ipToInt(ip)
    } catch {
      return { error: 'IP inválida', subnets: [], totalSubnets: 0, baseIp: '', basePrefix: 0 }
    }

    const maskInt = mask === 0 ? 0 : (~0 << (32 - mask)) >>> 0
    const networkInt = (ipInt & maskInt) >>> 0
    const hostCount = Math.pow(2, 32 - targetMask)
    const total = Math.pow(2, targetMask - mask)

    const subs = []
    const limit = Math.min(total, 1000) // limit to avoid browser crash

    for (let i = 0; i < limit; i++) {
      const subNetworkInt = (networkInt + (i * hostCount)) >>> 0
      const subBroadcastInt = (subNetworkInt + hostCount - 1) >>> 0
      
      subs.push({
        network: `${intToIp(subNetworkInt)}/${targetMask}`,
        range: `${intToIp((subNetworkInt + 1) >>> 0)} - ${intToIp(targetMask === 32 ? subNetworkInt : (subBroadcastInt - 1) >>> 0)}`,
        hosts: targetMask === 32 ? 1 : targetMask === 31 ? 2 : hostCount - 2
      })
    }

    return { error: null, subnets: subs, totalSubnets: total, baseIp: intToIp(networkInt), basePrefix: mask }
  }, [cidrInput, targetPrefixStr])

  const testIpResult = useMemo(() => {
    if (!testIp.trim() || !cidrInput.trim()) return null
    try {
      if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(testIp.trim())) return { valid: false, msg: 'Formato de IP inválido' }
      
      const cidr = new IPCIDR(cidrInput.trim())
      if (!cidr.contains(testIp.trim())) {
        return { valid: false, msg: 'No pertenece al CIDR base' }
      }

      const targetMask = parseInt(targetPrefixStr, 10)
      if (isNaN(targetMask) || targetMask < 0 || targetMask > 32) return { valid: true, msg: 'Pertenece al CIDR base' }

      const ipIntVal = ipToInt(testIp.trim())
      const maskInt = targetMask === 0 ? 0 : (~0 << (32 - targetMask)) >>> 0
      const subNetworkInt = (ipIntVal & maskInt) >>> 0
      
      return { 
        valid: true, 
        msg: 'Pertenece al CIDR base',
        subnet: `${intToIp(subNetworkInt)}/${targetMask}`
      }

    } catch (e) {
      return { valid: false, msg: 'Error al verificar IP' }
    }
  }, [testIp, cidrInput, targetPrefixStr])

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap gap-2 mb-6">
        {EXAMPLES.map(ex => (
          <button
            key={ex.label}
            onClick={() => { setCidrInput(ex.cidr); setTargetPrefixStr(ex.target.toString()); }}
            className="text-xs text-gray-600 hover:text-green-400 border border-gray-800 hover:border-green-800 rounded px-2 py-1 transition-colors"
          >
            {ex.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 uppercase font-medium mb-1.5">CIDR Base</label>
          <input
            type="text"
            value={cidrInput}
            onChange={e => setCidrInput(e.target.value)}
            placeholder="10.0.0.0/16"
            className="w-full bg-gray-900 border border-gray-700 focus:border-green-500 focus:ring-green-500 rounded-lg px-4 py-2.5 text-gray-100 font-mono text-sm transition-colors"
          />
        </div>
        <div className="w-full sm:w-48">
          <label className="block text-xs text-gray-500 uppercase font-medium mb-1.5">Dividir en prefijo</label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-gray-500 font-mono">/</span>
            <input
              type="number"
              value={targetPrefixStr}
              onChange={e => setTargetPrefixStr(e.target.value)}
              placeholder="24"
              min={basePrefix || 0}
              max={32}
              className="w-full bg-gray-900 border border-gray-700 focus:border-green-500 focus:ring-green-500 rounded-lg pl-7 pr-4 py-2.5 text-gray-100 font-mono text-sm transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="mb-6 bg-gray-900 border border-gray-800 rounded-lg p-4">
        <label className="block text-xs text-gray-500 uppercase font-medium mb-2">Tester de IP</label>
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <input
            type="text"
            value={testIp}
            onChange={e => setTestIp(e.target.value)}
            placeholder="Ej: 10.0.5.50"
            className="w-full sm:w-64 bg-gray-950 border border-gray-700 focus:border-green-500 focus:ring-green-500 rounded-lg px-4 py-2 text-gray-100 font-mono text-sm transition-colors"
          />
          {testIpResult && (
            <div className={`text-sm px-3 py-2 rounded flex-1 flex flex-wrap items-center gap-2 ${
              testIpResult.valid ? 'text-green-400 bg-green-900/20 border border-green-800/50' : 'text-red-400 bg-red-900/20 border border-red-800/50'
            }`}>
              <span>{testIpResult.valid ? '✓' : '✕'}</span>
              <span>{testIpResult.msg}</span>
              {testIpResult.subnet && (
                <>
                  <span className="text-gray-500 mx-1">→</span>
                  <span className="font-mono text-blue-300">Subred: {testIpResult.subnet}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {error ? (
        <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded p-4">{error}</div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-200 font-mono">{baseIp}/{basePrefix}</h3>
              <p className="text-xs text-gray-500 mt-1">
                Dividido en {totalSubnets.toLocaleString()} subredes de /{(targetPrefixStr)} 
                {totalSubnets > 1000 && ' (Mostrando las primeras 1000)'}
              </p>
            </div>
            <div className="text-xs text-green-400 bg-green-900/20 px-2.5 py-1 rounded-full border border-green-800/50 font-mono">
              {subnets.length > 0 ? `${subnets[0].hosts} hosts/red` : ''}
            </div>
          </div>
          
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-800/50 text-gray-400 sticky top-0 shadow-sm">
                <tr>
                  <th className="px-4 py-3 font-medium border-b border-gray-800">Red</th>
                  <th className="px-4 py-3 font-medium border-b border-gray-800">Rango Utilizable</th>
                  <th className="px-4 py-3 font-medium border-b border-gray-800">Hosts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {subnets.map((sub, i) => (
                  <tr key={i} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-green-300">{sub.network}</td>
                    <td className="px-4 py-2.5 font-mono text-gray-400">{sub.range}</td>
                    <td className="px-4 py-2.5 text-gray-500">{sub.hosts.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

