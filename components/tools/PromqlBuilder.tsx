'use client'

import { useState } from 'react'

const EXAMPLES = [
  {
    label: 'CPU Usage %',
    load: {
      metric: 'node_cpu_seconds_total',
      labels: [{ key: 'mode', operator: '!=', value: 'idle' }],
      timeFunc: 'rate',
      timeRange: '5m',
      aggFunc: 'sum',
      byLabels: ['instance'],
      mathOp: '',
      mathVal: ''
    }
  },
  {
    label: 'Error Rate',
    load: {
      metric: 'http_requests_total',
      labels: [{ key: 'status', operator: '=~', value: '5..' }],
      timeFunc: 'rate',
      timeRange: '1m',
      aggFunc: 'sum',
      byLabels: ['job', 'path'],
      mathOp: '',
      mathVal: ''
    }
  }
]

function parsePromQL(q: string) {
  let temp = q.trim()
  if (!temp) return null
  
  const parsed = {
    metric: '',
    labels: [] as any[],
    timeFunc: 'none',
    timeRange: '5m',
    aggFunc: 'none',
    byLabels: [] as string[],
    mathOp: 'none',
    mathVal: ''
  }

  // 1. Math operation at the end
  const mathMatch = temp.match(/\s+([*\/+\-])\s+([\d.]+)$/)
  if (mathMatch) {
    parsed.mathOp = mathMatch[1]
    parsed.mathVal = mathMatch[2]
    temp = temp.replace(/\s+([*\/+\-])\s+([\d.]+)$/, '').trim()
  }

  // 2. Aggregation
  let aggMatch = temp.match(/^(sum|avg|max|min|count)\s*\((.*)\)(?:\s+by\s*\(([^)]+)\))?$/)
  if (!aggMatch) {
    aggMatch = temp.match(/^(sum|avg|max|min|count)\s+by\s*\(([^)]+)\)\s*\((.*)\)$/)
    if (aggMatch) {
       const func = aggMatch[1]
       const bys = aggMatch[2]
       const inner = aggMatch[3]
       aggMatch = [aggMatch[0], func, inner, bys]
    }
  }

  if (aggMatch) {
    parsed.aggFunc = aggMatch[1]
    temp = aggMatch[2].trim()
    if (aggMatch[3]) {
      parsed.byLabels = aggMatch[3].split(',').map(s => s.trim())
    }
  }

  // 3. Time Function
  const timeMatch = temp.match(/^(rate|irate|increase)\s*\((.*)\[([^\]]+)\]\)$/)
  if (timeMatch) {
    parsed.timeFunc = timeMatch[1]
    temp = timeMatch[2].trim()
    parsed.timeRange = timeMatch[3].trim()
  } else {
     const rangeOnlyMatch = temp.match(/^(.*)\[([^\]]+)\]$/)
     if (rangeOnlyMatch) {
        temp = rangeOnlyMatch[1].trim()
        parsed.timeRange = rangeOnlyMatch[2].trim()
     }
  }

  // 4. Metric & Labels
  const metricMatch = temp.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)/)
  if (metricMatch) {
    parsed.metric = metricMatch[1]
    temp = temp.substring(parsed.metric.length).trim()
  }

  if (temp.startsWith('{') && temp.endsWith('}')) {
    const labelsStr = temp.substring(1, temp.length - 1)
    const labelRegex = /([a-zA-Z_][a-zA-Z0-9_]*)\s*(=|!=|=~|!~)\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g
    let match
    while ((match = labelRegex.exec(labelsStr)) !== null) {
      parsed.labels.push({
        key: match[1],
        operator: match[2],
        value: match[3]
      })
    }
  }
  
  if (parsed.labels.length === 0) parsed.labels = [{ key: '', operator: '=', value: '' }]

  return parsed
}

export default function PromqlBuilder() {
  const [metric, setMetric] = useState('http_requests_total')
  const [labels, setLabels] = useState([{ key: 'status', operator: '=', value: '200' }])
  
  const [timeFunc, setTimeFunc] = useState<'none'|'rate'|'increase'|'irate'>('none')
  const [timeRange, setTimeRange] = useState('5m')

  const [aggFunc, setAggFunc] = useState<'none'|'sum'|'avg'|'max'|'min'|'count'>('none')
  const [byLabels, setByLabels] = useState<string[]>([])
  
  const [mathOp, setMathOp] = useState<'none'|'/'|'*'|'+'|'-'>('none')
  const [mathVal, setMathVal] = useState('100')

  const addLabel = () => setLabels([...labels, { key: '', operator: '=', value: '' }])
  const removeLabel = (i: number) => setLabels(labels.filter((_, idx) => idx !== i))
  const updateLabel = (i: number, field: string, val: string) => {
    const newL = [...labels]
    newL[i] = { ...newL[i], [field]: val }
    setLabels(newL)
  }

  const handleByLabelChange = (val: string) => {
    const list = val.split(',').map(s => s.trim()).filter(Boolean)
    setByLabels(list)
  }

  const loadExample = (ex: any) => {
    setMetric(ex.metric)
    setLabels(ex.labels)
    setTimeFunc(ex.timeFunc || 'none')
    setTimeRange(ex.timeRange || '5m')
    setAggFunc(ex.aggFunc || 'none')
    setByLabels(ex.byLabels || [])
    setMathOp(ex.mathOp || 'none')
    setMathVal(ex.mathVal || '')
  }

  const handleReverseParse = (val: string) => {
    const parsed = parsePromQL(val)
    if (parsed) {
      setMetric(parsed.metric)
      setLabels(parsed.labels)
      setTimeFunc(parsed.timeFunc as any)
      setTimeRange(parsed.timeRange)
      setAggFunc(parsed.aggFunc as any)
      setByLabels(parsed.byLabels)
      setMathOp(parsed.mathOp as any)
      setMathVal(parsed.mathVal)
    }
  }

  const buildQuery = () => {
    let q = metric || 'metric_name'
    
    const validLabels = labels.filter(l => l.key && l.value)
    if (validLabels.length > 0) {
      const labelsStr = validLabels.map(l => `${l.key}${l.operator}"${l.value}"`).join(', ')
      q += `{${labelsStr}}`
    }

    if (timeFunc !== 'none') {
      q = `${timeFunc}(${q}[${timeRange || '5m'}])`
    }

    if (aggFunc !== 'none') {
      let byStr = ''
      if (byLabels.length > 0) byStr = ` by (${byLabels.join(', ')})`
      q = `${aggFunc}(${q})${byStr}`
    }

    if (mathOp !== 'none' && mathVal) {
      q = `${q} ${mathOp} ${mathVal}`
    }

    return q
  }

  const query = buildQuery()

  const copyToClipboard = () => {
    navigator.clipboard.writeText(query)
  }

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap gap-2 mb-6">
        {EXAMPLES.map(ex => (
          <button
            key={ex.label}
            onClick={() => loadExample(ex.load)}
            className="text-xs text-gray-600 hover:text-green-400 border border-gray-800 hover:border-green-800 rounded px-2 py-1 transition-colors"
          >
            {ex.label}
          </button>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden mb-6">
        <div className="bg-gray-800/80 px-4 py-3 flex justify-between items-center border-b border-gray-700">
          <span className="text-sm font-semibold text-gray-200">Tu Query Generada</span>
          <button onClick={copyToClipboard} className="text-xs text-green-500 hover:text-green-400 bg-green-900/20 border border-green-800/50 px-3 py-1.5 rounded transition-colors">
            Copiar
          </button>
        </div>
        <div className="p-5 font-mono text-lg text-green-300 break-all leading-relaxed bg-gray-950">
          {query}
        </div>
      </div>

      <div className="bg-gray-900 border border-blue-900/50 rounded-xl overflow-hidden mb-6">
        <div className="bg-blue-900/20 px-4 py-3 border-b border-blue-900/30 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>
          <span className="text-sm font-semibold text-blue-200">Reverse Parser Automático</span>
        </div>
        <div className="p-4">
           <input 
             type="text" 
             onChange={e => {
               if(e.target.value.trim()) handleReverseParse(e.target.value)
             }} 
             placeholder="Pegá un PromQL acá para configurar los controles automáticamente... (ej: sum(rate(node_cpu[5m])))"
             className="w-full bg-gray-950 border border-gray-800 focus:border-blue-500 focus:ring-blue-500 rounded-lg p-3 font-mono text-gray-300 text-sm transition-colors"
           />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 1. Metric & Labels */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-blue-900 text-blue-300 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">1</span>
            <h3 className="font-semibold text-gray-200">Métrica y Filtros</h3>
          </div>
          
          <label className="block text-xs text-gray-500 uppercase font-medium mb-1.5">Métrica</label>
          <input
            type="text"
            value={metric}
            onChange={e => setMetric(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 focus:border-green-500 rounded px-3 py-2 text-gray-100 font-mono text-sm mb-4"
          />

          <label className="block text-xs text-gray-500 uppercase font-medium mb-1.5">Labels (Filtros)</label>
          <div className="space-y-2 mb-2">
            {labels.map((l, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  placeholder="key"
                  value={l.key}
                  onChange={e => updateLabel(i, 'key', e.target.value)}
                  className="w-1/3 bg-gray-900 border border-gray-700 focus:border-green-500 rounded px-2 py-1.5 text-gray-100 font-mono text-sm"
                />
                <select
                  value={l.operator}
                  onChange={e => updateLabel(i, 'operator', e.target.value)}
                  className="w-16 bg-gray-900 border border-gray-700 focus:border-green-500 rounded px-1 py-1.5 text-gray-100 font-mono text-sm text-center"
                >
                  <option value="=">=</option>
                  <option value="!=">!=</option>
                  <option value="=~">=~</option>
                  <option value="!~">!~</option>
                </select>
                <input
                  type="text"
                  placeholder="value"
                  value={l.value}
                  onChange={e => updateLabel(i, 'value', e.target.value)}
                  className="flex-1 bg-gray-900 border border-gray-700 focus:border-green-500 rounded px-2 py-1.5 text-gray-100 font-mono text-sm"
                />
                <button onClick={() => removeLabel(i)} className="text-gray-500 hover:text-red-400 px-2">✕</button>
              </div>
            ))}
          </div>
          <button onClick={addLabel} className="text-xs text-green-500 hover:text-green-400">+ Agregar Label</button>
        </div>

        {/* 2. Time Functions */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-purple-900 text-purple-300 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">2</span>
            <h3 className="font-semibold text-gray-200">Función de Tiempo</h3>
          </div>

          <div className="flex gap-3 mb-4">
            <select
              value={timeFunc}
              onChange={e => setTimeFunc(e.target.value as any)}
              className="flex-1 bg-gray-900 border border-gray-700 focus:border-green-500 rounded px-3 py-2 text-gray-100 font-mono text-sm"
            >
              <option value="none">Sin función</option>
              <option value="rate">rate() - Por segundo</option>
              <option value="irate">irate() - Por seg instantáneo</option>
              <option value="increase">increase() - Incremento total</option>
            </select>

            <input
              type="text"
              value={timeRange}
              onChange={e => setTimeRange(e.target.value)}
              placeholder="5m"
              disabled={timeFunc === 'none'}
              className="w-20 bg-gray-900 border border-gray-700 focus:border-green-500 rounded px-3 py-2 text-gray-100 font-mono text-sm disabled:opacity-50"
            />
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Las métricas de tipo "Counter" (que siempre suben) deben usarse con rate() o increase() para ver la velocidad a la que crecen.
          </p>
        </div>

        {/* 3. Aggregation */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-yellow-900 text-yellow-300 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">3</span>
            <h3 className="font-semibold text-gray-200">Agregación</h3>
          </div>

          <div className="flex flex-col gap-3 mb-4">
            <select
              value={aggFunc}
              onChange={e => setAggFunc(e.target.value as any)}
              className="w-full bg-gray-900 border border-gray-700 focus:border-green-500 rounded px-3 py-2 text-gray-100 font-mono text-sm"
            >
              <option value="none">Sin agregación</option>
              <option value="sum">sum() - Sumar todo</option>
              <option value="avg">avg() - Promedio</option>
              <option value="max">max() - Máximo</option>
              <option value="min">min() - Mínimo</option>
              <option value="count">count() - Cantidad</option>
            </select>

            <div>
              <label className="block text-xs text-gray-500 uppercase font-medium mb-1.5">Agrupar por (by)</label>
              <input
                type="text"
                value={byLabels.join(', ')}
                onChange={e => handleByLabelChange(e.target.value)}
                placeholder="ej: instance, job"
                disabled={aggFunc === 'none'}
                className="w-full bg-gray-900 border border-gray-700 focus:border-green-500 rounded px-3 py-2 text-gray-100 font-mono text-sm disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* 4. Math */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-green-900 text-green-300 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">4</span>
            <h3 className="font-semibold text-gray-200">Operaciones (Opcional)</h3>
          </div>

          <div className="flex gap-3">
            <select
              value={mathOp}
              onChange={e => setMathOp(e.target.value as any)}
              className="w-24 bg-gray-900 border border-gray-700 focus:border-green-500 rounded px-3 py-2 text-gray-100 font-mono text-sm"
            >
              <option value="none">Nada</option>
              <option value="*">Multiplicar</option>
              <option value="/">Dividir</option>
              <option value="+">Sumar</option>
              <option value="-">Restar</option>
            </select>

            <input
              type="text"
              value={mathVal}
              onChange={e => setMathVal(e.target.value)}
              placeholder="ej: 100"
              disabled={mathOp === 'none'}
              className="flex-1 bg-gray-900 border border-gray-700 focus:border-green-500 rounded px-3 py-2 text-gray-100 font-mono text-sm disabled:opacity-50"
            />
          </div>
          <p className="text-xs text-gray-500 mt-4 leading-relaxed">
            Útil para convertir bytes a megabytes (dividir por 1048576) o fracciones a porcentajes (multiplicar por 100).
          </p>
        </div>

      </div>
    </div>
  )
}

