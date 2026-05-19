'use client'

import { useState } from 'react'

interface SubnetResult {
  network: string
  broadcast: string
  firstHost: string
  lastHost: string
  usableHosts: number
  totalHosts: number
  mask: string
  wildcard: string
  prefix: number
}

function intToIp(n: number): string {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.')
}

function calculate(input: string): SubnetResult | null {
  const trimmed = input.trim()
  const slashIdx = trimmed.lastIndexOf('/')
  if (slashIdx === -1) return null

  const ip = trimmed.slice(0, slashIdx)
  const prefix = parseInt(trimmed.slice(slashIdx + 1))
  if (isNaN(prefix) || prefix < 0 || prefix > 32) return null

  const parts = ip.split('.')
  if (parts.length !== 4) return null
  const nums = parts.map(Number)
  if (nums.some(n => isNaN(n) || n < 0 || n > 255)) return null

  const ipInt = ((nums[0] << 24) | (nums[1] << 16) | (nums[2] << 8) | nums[3]) >>> 0
  const maskInt = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0
  const networkInt = (ipInt & maskInt) >>> 0
  const broadcastInt = (networkInt | (~maskInt >>> 0)) >>> 0
  const totalHosts = Math.pow(2, 32 - prefix)
  const usableHosts = prefix >= 31 ? totalHosts : totalHosts - 2

  return {
    network: intToIp(networkInt) + '/' + prefix,
    broadcast: intToIp(broadcastInt),
    firstHost: prefix >= 31 ? intToIp(networkInt) : intToIp(networkInt + 1),
    lastHost: prefix >= 31 ? intToIp(broadcastInt) : intToIp(broadcastInt - 1),
    usableHosts,
    totalHosts,
    mask: intToIp(maskInt),
    wildcard: intToIp(~maskInt >>> 0),
    prefix,
  }
}

function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {}
  }
  return (
    <button
      onClick={copy}
      title="Copiar"
      className="ml-2 text-gray-700 hover:text-green-400 transition-colors opacity-0 group-hover:opacity-100"
    >
      {copied
        ? <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        : <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
      }
    </button>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="group flex items-center justify-between py-2.5 border-b border-gray-800 last:border-0">
      <span className="text-gray-500 text-sm">{label}</span>
      <div className="flex items-center">
        <span className={`font-mono text-sm ${highlight ? 'text-green-300' : 'text-gray-100'}`}>{value}</span>
        <CopyValue value={value} />
      </div>
    </div>
  )
}

const EXAMPLES = ['192.168.1.0/24', '10.0.0.0/8', '172.16.0.0/12', '10.0.0.5/27', '192.168.100.64/26']

export default function SubnetCalculator() {
  const [input, setInput] = useState('')

  const result = input.trim() ? calculate(input) : null
  const showError = input.trim().length > 0 && result === null

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-2">
          Dirección IP / CIDR
        </label>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="192.168.1.0/24"
          spellCheck={false}
          autoFocus
          className={`w-full bg-gray-900 border rounded-lg px-4 py-3 text-gray-100 font-mono text-sm placeholder-gray-600 focus:outline-none focus:ring-1 transition-colors ${
            showError
              ? 'border-red-700 focus:border-red-600 focus:ring-red-600'
              : 'border-gray-700 focus:border-green-500 focus:ring-green-500'
          }`}
        />
        {showError && (
          <p className="text-red-500 text-xs mt-1.5">
            Formato inválido. Ejemplos: <code className="font-mono">192.168.1.0/24</code>, <code className="font-mono">10.0.0.5/27</code>
          </p>
        )}
        <div className="flex flex-wrap gap-2 mt-3">
          {EXAMPLES.map(ex => (
            <button
              key={ex}
              onClick={() => setInput(ex)}
              className="text-xs text-gray-600 hover:text-green-400 font-mono border border-gray-800 hover:border-green-800 rounded px-2 py-1 transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {result && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-1">
          <Row label="Dirección de red"     value={result.network}                                      highlight />
          <Row label="Broadcast"            value={result.broadcast}                                             />
          <Row label="Primer host"          value={result.firstHost}                                             />
          <Row label="Último host"          value={result.lastHost}                                              />
          <Row label="Hosts utilizables"    value={result.usableHosts.toLocaleString('es-AR')}                   />
          <Row label="Total de IPs"         value={result.totalHosts.toLocaleString('es-AR')}                    />
          <Row label="Máscara de subred"    value={result.mask}                                                  />
          <Row label="Wildcard"             value={result.wildcard}                                              />
          <Row label="Prefijo"              value={`/${result.prefix}`}                                          />
        </div>
      )}
    </div>
  )
}
