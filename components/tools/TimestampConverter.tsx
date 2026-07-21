'use client'

import { useState, useEffect } from 'react'

const EXAMPLES = [
  { label: 'Ahora', ts: () => Date.now().toString() },
  { label: 'Y2K', ts: () => '946684800000' }, // Epoch in ms
  { label: '1 Billón', ts: () => '1000000000' }, // Epoch in s
  { label: 'Cron (Medianoche)', ts: () => '0 0 * * *' }
]

export default function TimestampConverter() {
  const [input, setInput] = useState(Date.now().toString())
  const [realtime, setRealtime] = useState(Date.now())
  const [isPlaying, setIsPlaying] = useState(true)

  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => setRealtime(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [isPlaying])

  const parseInput = (val: string) => {
    const trimmed = val.trim()
    if (!trimmed) return null
    
    // Try to parse as a number first (epoch)
    if (/^\d+$/.test(trimmed)) {
      const num = parseInt(trimmed, 10)
      // Heuristic: if it's smaller than 10^11, it's likely seconds, otherwise ms
      return { type: 'date', timestamp: num < 10000000000 ? num * 1000 : num }
    }

    // Try parsing as cron
    if (trimmed.split(' ').length >= 5) {
      try {
        const cronParser = require('cron-parser')
        const interval = cronParser.parseExpression(trimmed)
        const nextDates = []
        for (let i = 0; i < 5; i++) {
          nextDates.push(interval.next().toDate())
        }
        return { type: 'cron', dates: nextDates }
      } catch {
        // Not a valid cron, continue to date parsing
      }
    }

    // Try parsing as ISO/RFC string
    const d = new Date(trimmed)
    if (!isNaN(d.getTime())) {
      return { type: 'date', timestamp: d.getTime() }
    }
    return null
  }

  const parsed = parseInput(input)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const resultBox = (label: string, value: string) => (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 relative group">
      <h3 className="text-xs text-gray-500 uppercase font-medium mb-1">{label}</h3>
      <div className="font-mono text-sm text-gray-200">{value}</div>
      <button 
        onClick={() => copyToClipboard(value)}
        className="absolute top-3 right-3 text-gray-600 hover:text-green-400 opacity-0 group-hover:opacity-100 transition-all"
        title="Copiar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
      </button>
    </div>
  )

  const renderCurrentTime = () => {
    const d = new Date(realtime)
    return (
      <div className="flex flex-col md:flex-row gap-4 mb-8 bg-gray-800/50 rounded-lg p-4 items-start md:items-center justify-between border border-gray-800">
        <div>
          <span className="text-xs text-gray-500 uppercase font-medium block mb-1">Epoch Actual</span>
          <span className="font-mono text-xl text-green-400">{Math.floor(realtime / 1000)}</span>
        </div>
        <div className="text-left md:text-right">
          <span className="text-xs text-gray-500 uppercase font-medium block mb-1">Local</span>
          <span className="font-mono text-sm text-gray-300">{d.toLocaleString()}</span>
        </div>
        <button 
          onClick={() => setIsPlaying(!isPlaying)}
          className="px-3 py-1.5 bg-gray-900 border border-gray-700 hover:border-gray-500 rounded text-xs text-gray-400 transition-colors"
        >
          {isPlaying ? 'Pausar' : 'Reanudar'}
        </button>
      </div>
    )
  }

  const renderConversions = () => {
    if (parsed === null) {
      return <div className="text-red-400 text-sm mt-4">Formato no reconocido. Ingresá un Epoch (segundos/ms), fecha o expresión Cron.</div>
    }

    if (parsed.type === 'cron') {
      return (
        <div className="mt-6 bg-gray-900 border border-purple-800/50 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4 border-b border-gray-800 pb-3">
            <span className="bg-purple-900 text-purple-300 text-[10px] uppercase font-bold px-2 py-0.5 rounded border border-purple-800">Cron Expresión Detectada</span>
            <span className="text-gray-400 text-sm">Próximas 5 ejecuciones (Hora Local)</span>
          </div>
          <ul className="space-y-2">
            {parsed.dates?.map((d: Date, i: number) => (
              <li key={i} className="flex gap-4 items-center bg-gray-950 px-4 py-2 rounded border border-gray-800">
                <span className="text-gray-500 font-mono text-xs w-6">#{i + 1}</span>
                <span className="text-purple-300 font-mono text-sm flex-1">{d.toLocaleString()}</span>
                <span className="text-gray-500 font-mono text-xs">{getRelativeTimeString(d)}</span>
              </li>
            ))}
          </ul>
        </div>
      )
    }

    const d = new Date(parsed.timestamp as number)
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {resultBox('Epoch (Segundos)', Math.floor((parsed.timestamp as number) / 1000).toString())}
        {resultBox('Epoch (Milisegundos)', (parsed.timestamp as number).toString())}
        {resultBox('Local Time', d.toLocaleString())}
        {resultBox('UTC Time', d.toUTCString())}
        {resultBox('ISO 8601', d.toISOString())}
        {resultBox('Relative', getRelativeTimeString(d))}
      </div>
    )
  }

  const getRelativeTimeString = (date: Date | number) => {
    const timeMs = typeof date === "number" ? date : date.getTime()
    const deltaSeconds = Math.round((timeMs - Date.now()) / 1000)
    const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })
    const cutoffs = [60, 3600, 86400, 86400 * 7, 86400 * 30, 86400 * 365, Infinity]
    const units: Intl.RelativeTimeFormatUnit[] = ["second", "minute", "hour", "day", "week", "month", "year"]
    
    const unitIndex = cutoffs.findIndex(cutoff => cutoff > Math.abs(deltaSeconds))
    const divisor = unitIndex ? cutoffs[unitIndex - 1] : 1

    return rtf.format(Math.floor(deltaSeconds / divisor), units[unitIndex])
  }

  return (
    <div className="max-w-3xl">
      {renderCurrentTime()}

      <div className="flex flex-wrap gap-2 mb-4">
        {EXAMPLES.map(ex => (
          <button
            key={ex.label}
            onClick={() => setInput(ex.ts())}
            className="text-xs text-gray-600 hover:text-green-400 border border-gray-800 hover:border-green-800 rounded px-2 py-1 transition-colors"
          >
            {ex.label}
          </button>
        ))}
      </div>

      <div className="mb-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ingresá un timestamp, fecha ISO o expresión cron..."
          className="w-full bg-gray-900 border border-gray-700 focus:border-green-500 focus:ring-green-500 rounded-lg px-4 py-3 text-gray-100 font-mono text-sm transition-colors"
        />
      </div>
      <p className="text-xs text-gray-500 mb-6">Soporta Epoch en segundos, milisegundos, fechas ISO (ej. 2026-07-21T07:00:00Z) o Cron (ej. 0 12 * * *).</p>

      {renderConversions()}
    </div>
  )
}

