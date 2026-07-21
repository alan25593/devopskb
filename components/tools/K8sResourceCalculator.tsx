'use client'

import { useState, useMemo } from 'react'
import * as jsyaml from 'js-yaml'

const EXAMPLES = [
  {
    label: 'Microservicios con HPA',
    yaml: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: web
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: frontend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: frontend
  minReplicas: 2
  maxReplicas: 10
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 5
  template:
    spec:
      containers:
        - name: api
          resources:
            requests:
              cpu: "250m"
              memory: "512Mi"
            limits:
              cpu: "1"
              memory: "1Gi"
`
  }
]

// Parse k8s cpu values like '100m' or '1' to millicores (number)
function parseCpu(val: string | number): number {
  if (!val) return 0
  if (typeof val === 'number') return val * 1000
  const str = String(val)
  if (str.endsWith('m')) return parseInt(str.replace('m', ''), 10)
  return parseFloat(str) * 1000
}

// Parse k8s memory values like '128Mi', '1Gi', '512M' to MiB (number)
function parseMemory(val: string | number): number {
  if (!val) return 0
  if (typeof val === 'number') return val / (1024 * 1024) // assuming bytes if number
  const str = String(val)
  const num = parseFloat(str)
  if (str.endsWith('Gi')) return num * 1024
  if (str.endsWith('G')) return num * 1000 // decimal approx
  if (str.endsWith('Mi')) return num
  if (str.endsWith('M')) return num * 1000 / 1024
  if (str.endsWith('Ki')) return num / 1024
  if (str.endsWith('K')) return num * 1000 / (1024 * 1024)
  return num / (1024 * 1024) // assuming plain bytes if no unit
}

interface ResourceSum {
  reqCpu: number
  reqMem: number
  limCpu: number
  limMem: number
  minReplicas: number
  maxReplicas: number
}

function calculateResources(docs: any[]) {
  const breakdown: (ResourceSum & { name: string, kind: string })[] = []
  
  let totalMinReqCpu = 0
  let totalMaxReqCpu = 0
  let totalMinReqMem = 0
  let totalMaxReqMem = 0
  let totalMinLimCpu = 0
  let totalMaxLimCpu = 0
  let totalMinLimMem = 0
  let totalMaxLimMem = 0
  let totalMinPods = 0
  let totalMaxPods = 0

  const hpas = docs.filter(d => d && (d.kind === 'HorizontalPodAutoscaler' || d.kind === 'HorizontalPodAutoscalerList'))
  const hpaMap = new Map()
  
  const processHpa = (hpa: any) => {
    const target = hpa.spec?.scaleTargetRef
    if (target && target.name) {
      hpaMap.set(target.name, {
        min: hpa.spec.minReplicas || 1,
        max: hpa.spec.maxReplicas || 1
      })
    }
  }

  hpas.forEach(hpa => {
    if (hpa.kind === 'HorizontalPodAutoscalerList' && Array.isArray(hpa.items)) {
      hpa.items.forEach(processHpa)
    } else {
      processHpa(hpa)
    }
  })

  docs.forEach(doc => {
    if (!doc || typeof doc !== 'object') return
    const kind = doc.kind || 'Unknown'
    const name = doc.metadata?.name || 'Unnamed'

    if (kind.includes('HorizontalPodAutoscaler')) return

    let podSpec = null
    if (kind === 'Pod' && doc.spec) podSpec = doc.spec
    else if (doc.spec?.template?.spec) podSpec = doc.spec.template.spec

    if (podSpec) {
      let rCpu = 0, rMem = 0, lCpu = 0, lMem = 0
      const containers = [...(podSpec.containers || []), ...(podSpec.initContainers || [])]

      containers.forEach((c: any) => {
        rCpu += parseCpu(c.resources?.requests?.cpu)
        rMem += parseMemory(c.resources?.requests?.memory)
        lCpu += parseCpu(c.resources?.limits?.cpu)
        lMem += parseMemory(c.resources?.limits?.memory)
      })

      let minReplicas = typeof doc.spec?.replicas === 'number' ? doc.spec.replicas : 1
      let maxReplicas = minReplicas

      if (hpaMap.has(name)) {
        minReplicas = hpaMap.get(name).min
        maxReplicas = hpaMap.get(name).max
      }

      breakdown.push({ name, kind, minReplicas, maxReplicas, reqCpu: rCpu, reqMem: rMem, limCpu: lCpu, limMem: lMem })

      totalMinReqCpu += rCpu * minReplicas
      totalMaxReqCpu += rCpu * maxReplicas
      totalMinReqMem += rMem * minReplicas
      totalMaxReqMem += rMem * maxReplicas
      
      totalMinLimCpu += lCpu * minReplicas
      totalMaxLimCpu += lCpu * maxReplicas
      totalMinLimMem += lMem * minReplicas
      totalMaxLimMem += lMem * maxReplicas
      
      totalMinPods += minReplicas
      totalMaxPods += maxReplicas
    }
  })

  return { 
    totalMinReqCpu, totalMaxReqCpu, 
    totalMinReqMem, totalMaxReqMem, 
    totalMinLimCpu, totalMaxLimCpu, 
    totalMinLimMem, totalMaxLimMem, 
    totalMinPods, totalMaxPods, 
    breakdown 
  }
}

function formatCpu(mc: number) {
  if (mc === 0) return '0'
  return mc >= 1000 ? `${(mc / 1000).toFixed(2)} CPU` : `${mc}m`
}

function formatMem(mi: number) {
  if (mi === 0) return '0'
  return mi >= 1024 ? `${(mi / 1024).toFixed(2)} Gi` : `${Math.round(mi)} Mi`
}

function formatRange(min: string, max: string) {
  if (min === max) return min
  return `${min} - ${max}`
}

export default function K8sResourceCalculator() {
  const [input, setInput] = useState('')

  const { result, parseError } = useMemo(() => {
    if (!input.trim()) return { result: null, parseError: null }
    try {
      const docs: any[] = []
      jsyaml.loadAll(input, doc => { if (doc) docs.push(doc) })
      return { result: calculateResources(docs), parseError: null }
    } catch (e: any) {
      return { result: null, parseError: e.message }
    }
  }, [input])

  const recommendNode = (cpu: number, mem: number) => {
    const cores = cpu / 1000
    const gb = mem / 1024

    if (cores <= 2 && gb <= 4) return 't3.medium (2 vCPU, 4 GiB)'
    if (cores <= 2 && gb <= 8) return 't3.large (2 vCPU, 8 GiB)'
    if (cores <= 4 && gb <= 16) return 't3.xlarge o m5.xlarge (4 vCPU, 16 GiB)'
    if (cores <= 8 && gb <= 32) return 'm5.2xlarge (8 vCPU, 32 GiB)'
    if (cores <= 16 && gb <= 64) return 'm5.4xlarge (16 vCPU, 64 GiB)'
    
    return `Múltiples nodos (> ${Math.ceil(cores)} vCPU, > ${Math.ceil(gb)} GiB)`
  }

  return (
    <div className="max-w-5xl flex flex-col md:flex-row gap-6">
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
          placeholder="Pegá tus manifiestos (Deployments, StatefulSets, HPAs, Pods) acá..."
          rows={22}
          spellCheck={false}
          className="w-full bg-gray-900 border border-gray-700 focus:border-green-500 focus:ring-green-500 rounded-lg px-4 py-3 text-gray-100 font-mono text-xs transition-colors resize-y"
        />
        {parseError && <div className="text-red-400 text-sm mt-2">Error: {parseError}</div>}
      </div>

      <div className="md:w-[450px]">
        {result && result.totalMaxPods > 0 ? (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-5 shadow-lg">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4 border-b border-gray-700 pb-2">Total Requerido en Cluster</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <span className="block text-xs text-gray-500 mb-1">Total Pods (Réplicas)</span>
                  <span className="text-2xl font-bold text-gray-100">{formatRange(result.totalMinPods.toString(), result.totalMaxPods.toString())}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500 mb-1">Nodo Máx Recomendado</span>
                  <span className="text-sm font-medium text-blue-400">{recommendNode(result.totalMaxReqCpu, result.totalMaxReqMem)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                <div>
                  <span className="block text-xs text-gray-500 mb-1">Total CPU Requests</span>
                  <span className="text-xl font-bold text-green-400">{formatRange(formatCpu(result.totalMinReqCpu), formatCpu(result.totalMaxReqCpu))}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500 mb-1">Total RAM Requests</span>
                  <span className="text-xl font-bold text-green-400">{formatRange(formatMem(result.totalMinReqMem), formatMem(result.totalMaxReqMem))}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500 mb-1">Total CPU Limits</span>
                  <span className="text-xl font-bold text-yellow-500">{formatRange(formatCpu(result.totalMinLimCpu), formatCpu(result.totalMaxLimCpu))}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500 mb-1">Total RAM Limits</span>
                  <span className="text-xl font-bold text-yellow-500">{formatRange(formatMem(result.totalMinLimMem), formatMem(result.totalMaxLimMem))}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <h3 className="text-xs text-gray-500 uppercase font-medium mb-3">Desglose por Recurso</h3>
              <div className="space-y-3">
                {result.breakdown.map((item, i) => (
                  <div key={i} className="flex flex-col gap-1 pb-3 border-b border-gray-800 last:border-0 last:pb-0">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-200 font-medium truncate" title={item.name}>{item.name}</span>
                      <span className="text-xs text-gray-500 bg-gray-800 px-1.5 rounded">{item.kind}</span>
                    </div>
                    <div className="text-xs text-gray-400 flex justify-between">
                      <span>{formatRange(item.minReplicas.toString(), item.maxReplicas.toString())} réplicas ×</span>
                      <span>Req: {formatCpu(item.reqCpu)} / {formatMem(item.reqMem)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center border border-dashed border-gray-700 rounded-xl p-6 text-center text-gray-500 text-sm">
            Pegá YAMLs con especificaciones de recursos y HPAs para ver el cálculo.
          </div>
        )}
      </div>
    </div>
  )
}

