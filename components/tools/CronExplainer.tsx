'use client'

import { useState, useMemo } from 'react'

const MONTH_NAMES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const DOW_NAMES = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']

type FieldType = 'minute' | 'hour' | 'dom' | 'month' | 'dow'

const FIELD_META: Record<FieldType, { label: string; min: number; max: number; unit: string }> = {
  minute: { label: 'Minuto',        min: 0,  max: 59, unit: 'min'  },
  hour:   { label: 'Hora',          min: 0,  max: 23, unit: 'h'    },
  dom:    { label: 'Día del mes',   min: 1,  max: 31, unit: ''     },
  month:  { label: 'Mes',           min: 1,  max: 12, unit: ''     },
  dow:    { label: 'Día semana',    min: 0,  max: 6,  unit: ''     },
}

function expandField(field: string, min: number, max: number): number[] | null {
  const values = new Set<number>()
  for (const part of field.split(',')) {
    if (part === '*') {
      for (let i = min; i <= max; i++) values.add(i)
    } else if (part.startsWith('*/')) {
      const step = parseInt(part.slice(2))
      if (isNaN(step) || step <= 0) return null
      for (let i = min; i <= max; i += step) values.add(i)
    } else if (part.includes('/')) {
      const [rangeStr, stepStr] = part.split('/')
      const step = parseInt(stepStr)
      if (isNaN(step) || step <= 0) return null
      const dashIdx = rangeStr.indexOf('-')
      const start = parseInt(rangeStr.slice(0, dashIdx))
      const end   = parseInt(rangeStr.slice(dashIdx + 1))
      if (isNaN(start) || isNaN(end) || start < min || end > max || start > end) return null
      for (let i = start; i <= end; i += step) values.add(i)
    } else if (part.includes('-')) {
      const [s, e] = part.split('-').map(Number)
      if (isNaN(s) || isNaN(e) || s < min || e > max || s > e) return null
      for (let i = s; i <= e; i++) values.add(i)
    } else {
      const n = parseInt(part)
      if (isNaN(n) || n < min || n > max) return null
      values.add(n)
    }
  }
  return Array.from(values).sort((a, b) => a - b)
}

function nameList(values: number[], type: FieldType): string {
  const names = type === 'month' ? MONTH_NAMES : type === 'dow' ? DOW_NAMES : null
  const fmt = values.map(v => names ? names[type === 'month' ? v - 1 : v] : String(v))
  if (fmt.length === 1) return fmt[0]
  if (fmt.length === 2) return fmt.join(' y ')
  return fmt.slice(0, -1).join(', ') + ' y ' + fmt[fmt.length - 1]
}

function explainField(field: string, type: FieldType): string {
  const { min, max } = FIELD_META[type]

  if (field === '*') {
    const every: Record<FieldType, string> = {
      minute: 'cada minuto', hour: 'cada hora', dom: 'todos los días',
      month: 'todos los meses', dow: 'cualquier día',
    }
    return every[type]
  }

  if (field.startsWith('*/')) {
    const step = parseInt(field.slice(2))
    const units: Record<FieldType, [string, string]> = {
      minute: ['minuto','minutos'], hour: ['hora','horas'],
      dom: ['día','días'], month: ['mes','meses'], dow: ['día','días'],
    }
    return `cada ${step} ${units[type][step === 1 ? 0 : 1]}`
  }

  const values = expandField(field, min, max)
  if (!values || values.length === 0) return '(inválido)'

  const prefixes: Record<FieldType, string> = {
    minute: 'en el minuto', hour: 'a las', dom: 'el día', month: 'en', dow: 'los',
  }

  if (type === 'minute' && values.length === 1 && values[0] === 0) return 'al inicio de la hora'
  if (type === 'hour'   && values.length === 1) return `a las ${String(values[0]).padStart(2,'0')}h`

  return `${prefixes[type]} ${nameList(values, type)}`
}

function parseCron(expr: string): { fields: string[]; valid: boolean } {
  const fields = expr.trim().split(/\s+/)
  if (fields.length !== 5) return { fields, valid: false }
  const types: FieldType[] = ['minute','hour','dom','month','dow']
  const valid = types.every((t, i) => {
    const { min, max } = FIELD_META[t]
    return fields[i] === '*' || expandField(fields[i], min, max) !== null
  })
  return { fields, valid }
}

function getNextRuns(fields: string[], count = 5): Date[] {
  const types: FieldType[] = ['minute','hour','dom','month','dow']
  const expanded = types.map((t, i) => {
    const { min, max } = FIELD_META[t]
    return expandField(fields[i], min, max) ?? []
  })
  const [minutes, hours, doms, months, dows] = expanded.map(a => new Set(a))

  const domStar = fields[2] === '*'
  const dowStar = fields[4] === '*'

  const results: Date[] = []
  const MS = 60_000
  // start at the next whole minute
  let ts = Math.ceil((Date.now() + MS) / MS) * MS
  const limitTs = ts + 2 * 366 * 24 * 60 * MS   // 2-year window

  while (results.length < count && ts < limitTs) {
    const d  = new Date(ts)
    const mo = d.getMonth() + 1
    const dom = d.getDate()
    const dow = d.getDay()
    const h  = d.getHours()
    const m  = d.getMinutes()

    const dayMatch = domStar && dowStar
      ? true
      : domStar ? dows.has(dow)
      : dowStar ? doms.has(dom)
      : doms.has(dom) || dows.has(dow)

    if (months.has(mo) && dayMatch && hours.has(h) && minutes.has(m)) {
      results.push(d)
    }
    ts += MS
  }
  return results
}

function formatDate(d: Date): string {
  return d.toLocaleString('es-AR', {
    weekday: 'short', day: '2-digit', month: 'short',
    year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

const EXAMPLES = [
  { expr: '*/5 * * * *',    label: 'cada 5 min'      },
  { expr: '0 * * * *',      label: 'cada hora'        },
  { expr: '0 2 * * *',      label: 'diario 2am'       },
  { expr: '0 9 * * 1-5',   label: 'lun-vie 9am'      },
  { expr: '0 0 1 * *',      label: '1° de cada mes'   },
  { expr: '30 23 * * 5',    label: 'viernes 23:30'    },
]

export default function CronExplainer() {
  const [input, setInput] = useState('')

  const { fields, valid } = useMemo(() => parseCron(input), [input])
  const showResult = input.trim().length > 0
  const hasEnoughFields = fields.length === 5

  const nextRuns = useMemo(
    () => (valid ? getNextRuns(fields) : []),
    [valid, fields]
  )

  const types: FieldType[] = ['minute','hour','dom','month','dow']

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-2">
          Expresión cron <span className="text-gray-600 font-mono text-xs ml-1">minuto hora día-mes mes día-semana</span>
        </label>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="0 2 * * *"
          spellCheck={false}
          autoFocus
          className={`w-full bg-gray-900 border rounded-lg px-4 py-3 text-gray-100 font-mono text-sm placeholder-gray-600 focus:outline-none focus:ring-1 transition-colors ${
            showResult && !valid
              ? 'border-red-700 focus:border-red-600 focus:ring-red-600'
              : 'border-gray-700 focus:border-green-500 focus:ring-green-500'
          }`}
        />
        {showResult && !hasEnoughFields && (
          <p className="text-red-500 text-xs mt-1.5">Ingresá 5 campos separados por espacio.</p>
        )}
        <div className="flex flex-wrap gap-2 mt-3">
          {EXAMPLES.map(({ expr, label }) => (
            <button
              key={expr}
              onClick={() => setInput(expr)}
              className="text-xs text-gray-600 hover:text-green-400 border border-gray-800 hover:border-green-800 rounded px-2 py-1 transition-colors"
            >
              <span className="font-mono">{expr}</span>
              <span className="text-gray-700 ml-1.5">— {label}</span>
            </button>
          ))}
        </div>
      </div>

      {valid && (
        <>
          <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-xs text-gray-600 uppercase tracking-wider px-4 py-2 font-medium">Campo</th>
                  <th className="text-left text-xs text-gray-600 uppercase tracking-wider px-4 py-2 font-medium">Valor</th>
                  <th className="text-left text-xs text-gray-600 uppercase tracking-wider px-4 py-2 font-medium">Significa</th>
                </tr>
              </thead>
              <tbody>
                {types.map((type, i) => (
                  <tr key={type} className="border-b border-gray-800 last:border-0">
                    <td className="px-4 py-2.5 text-gray-500">{FIELD_META[type].label}</td>
                    <td className="px-4 py-2.5 font-mono text-green-300">{fields[i]}</td>
                    <td className="px-4 py-2.5 text-gray-300">{explainField(fields[i], type)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {nextRuns.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-600 uppercase tracking-wider mb-3 font-medium">Próximas ejecuciones</p>
              <ol className="space-y-1.5">
                {nextRuns.map((d, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-700 w-4 text-right shrink-0">{i + 1}.</span>
                    <span className="font-mono text-sm text-gray-200">{formatDate(d)}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}
    </div>
  )
}
