'use client'

import { useState, useMemo } from 'react'
import * as jsyaml from 'js-yaml'

const EXAMPLES = [
  { 
    label: 'Inseguro (Ejemplo real)', 
    yaml: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: bad-deployment
spec:
  replicas: 3
  template:
    spec:
      hostNetwork: true
      hostPID: true
      containers:
        - name: app
          image: nginx:latest
          securityContext:
            privileged: true`
  },
  { 
    label: 'Seguro (CIS Benchmark)', 
    yaml: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: good-deployment
spec:
  replicas: 3
  template:
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: good-app
      containers:
        - name: app
          image: nginx:1.24.0
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
          securityContext:
            runAsNonRoot: true
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true`
  }
]

type Severity = 'CRITICAL' | 'WARNING' | 'INFO'

interface Issue {
  severity: Severity
  message: string
  kind: string
  name: string
}

function analyzeK8s(docs: any[]): Issue[] {
  const issues: Issue[] = []

  docs.forEach(doc => {
    if (!doc || typeof doc !== 'object') return
    const kind = doc.kind || 'Unknown'
    const name = doc.metadata?.name || 'Unnamed'

    let podSpecs = []
    if (kind === 'Pod' && doc.spec) {
      podSpecs.push(doc.spec)
    } else if (doc.spec?.template?.spec) {
      podSpecs.push(doc.spec.template.spec)
    }

    // Availability checks for Deployments/StatefulSets
    if (kind === 'Deployment' || kind === 'StatefulSet') {
      const replicas = doc.spec?.replicas || 1
      const tplSpec = doc.spec?.template?.spec
      if (replicas > 1 && tplSpec) {
        if (!tplSpec.affinity?.podAntiAffinity && !tplSpec.topologySpreadConstraints) {
          issues.push({ severity: 'INFO', message: `Tiene ${replicas} réplicas pero no define podAntiAffinity ni topologySpreadConstraints.`, kind, name })
        }
      }
    }

    podSpecs.forEach(podSpec => {
      // Host access
      if (podSpec.hostNetwork) issues.push({ severity: 'CRITICAL', message: 'Usa hostNetwork, exponiendo la red del nodo.', kind, name })
      if (podSpec.hostPID) issues.push({ severity: 'CRITICAL', message: 'Usa hostPID, permitiendo ver procesos del host.', kind, name })
      if (podSpec.hostIPC) issues.push({ severity: 'CRITICAL', message: 'Usa hostIPC, comunicación inter-proceso con host.', kind, name })

      // Pod security context
      const podRunAsNonRoot = podSpec.securityContext?.runAsNonRoot

      const containers = [...(podSpec.containers || []), ...(podSpec.initContainers || [])]

      if (containers.length === 0) {
        issues.push({ severity: 'WARNING', message: 'No hay contenedores definidos.', kind, name })
      }

      containers.forEach((c: any) => {
        const cName = c.name || 'unnamed'

        // Images
        if (!c.image || c.image.endsWith(':latest') || !c.image.includes(':')) {
          issues.push({ severity: 'WARNING', message: `Contenedor '${cName}' usa tag 'latest' o no especifica versión.`, kind, name })
        }
        if (c.imagePullPolicy === 'Always' && !c.image?.endsWith(':latest')) {
          issues.push({ severity: 'INFO', message: `Contenedor '${cName}' tiene imagePullPolicy: Always con versión fija.`, kind, name })
        }

        // Resources
        if (!c.resources?.requests) {
          issues.push({ severity: 'WARNING', message: `Contenedor '${cName}' no define resource requests.`, kind, name })
        }
        if (!c.resources?.limits) {
          issues.push({ severity: 'WARNING', message: `Contenedor '${cName}' no define resource limits.`, kind, name })
        }

        // Probes
        if (!c.livenessProbe) issues.push({ severity: 'INFO', message: `Contenedor '${cName}' sin livenessProbe.`, kind, name })
        if (!c.readinessProbe) issues.push({ severity: 'INFO', message: `Contenedor '${cName}' sin readinessProbe.`, kind, name })

        // Security Context
        if (c.securityContext?.privileged) {
          issues.push({ severity: 'CRITICAL', message: `Contenedor '${cName}' es privileged: true.`, kind, name })
        }
        if (c.securityContext?.allowPrivilegeEscalation !== false) {
          issues.push({ severity: 'WARNING', message: `Contenedor '${cName}' no inhabilita escalada de privilegios (allowPrivilegeEscalation: false).`, kind, name })
        }
        if (c.securityContext?.readOnlyRootFilesystem !== true) {
          issues.push({ severity: 'INFO', message: `Contenedor '${cName}' no tiene readOnlyRootFilesystem: true.`, kind, name })
        }
        
        // Root check (combines pod-level and container-level)
        const containerRunAsNonRoot = c.securityContext?.runAsNonRoot
        if (containerRunAsNonRoot !== true && podRunAsNonRoot !== true) {
          issues.push({ severity: 'WARNING', message: `Contenedor '${cName}' podría correr como root (falta runAsNonRoot: true).`, kind, name })
        }
      })
    })
  })

  return issues
}

export default function K8sAnalyzer() {
  const [input, setInput] = useState('')

  const { documents, issues, parseError } = useMemo(() => {
    if (!input.trim()) return { documents: [], issues: [], parseError: null }
    try {
      const docs: any[] = []
      jsyaml.loadAll(input, doc => { if (doc) docs.push(doc) })
      return { documents: docs, issues: analyzeK8s(docs), parseError: null }
    } catch (e: any) {
      return { documents: [], issues: [], parseError: e.message }
    }
  }, [input])

  const applyAutoFix = () => {
    try {
      const docs: any[] = []
      jsyaml.loadAll(input, doc => { if (doc) docs.push(doc) })
      
      docs.forEach(doc => {
        if (!doc || typeof doc !== 'object') return
        const kind = doc.kind || 'Unknown'

        let podSpecs: any[] = []
        if (kind === 'Pod' && doc.spec) {
          podSpecs.push(doc.spec)
        } else if (doc.spec?.template?.spec) {
          podSpecs.push(doc.spec.template.spec)
        }

        podSpecs.forEach(podSpec => {
          delete podSpec.hostNetwork
          delete podSpec.hostPID
          delete podSpec.hostIPC
          
          if (!podSpec.securityContext) podSpec.securityContext = {}
          podSpec.securityContext.runAsNonRoot = true

          const containers = [...(podSpec.containers || []), ...(podSpec.initContainers || [])]
          containers.forEach((c: any) => {
            if (!c.resources) c.resources = {}
            if (!c.resources.requests) c.resources.requests = { cpu: '100m', memory: '128Mi' }
            if (!c.resources.limits) c.resources.limits = { cpu: '200m', memory: '256Mi' }

            if (!c.securityContext) c.securityContext = {}
            delete c.securityContext.privileged
            c.securityContext.allowPrivilegeEscalation = false
          })
        })
      })

      const newYaml = docs.map(d => jsyaml.dump(d, { noRefs: true })).join('---\n')
      setInput(newYaml)
    } catch (e) {
      // ignore
    }
  }

  const renderIssues = () => {
    if (parseError) {
      return <div className="text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg p-4 text-sm mt-4">{parseError}</div>
    }

    if (input.trim() && issues.length === 0) {
      return <div className="text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 rounded-lg p-4 text-sm mt-4 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        No se detectaron problemas. ¡Manifiesto impecable!
      </div>
    }

    if (issues.length > 0) {
      const criticals = issues.filter(i => i.severity === 'CRITICAL')
      const warnings = issues.filter(i => i.severity === 'WARNING')
      const infos = issues.filter(i => i.severity === 'INFO')

      return (
        <div className="mt-6 space-y-4">
          <div className="flex gap-2">
            <span className="text-xs px-2.5 py-1 bg-red-500/10 text-red-400 rounded-md border border-red-500/20 font-medium">{criticals.length} Critical</span>
            <span className="text-xs px-2.5 py-1 bg-yellow-500/10 text-yellow-400 rounded-md border border-yellow-500/20 font-medium">{warnings.length} Warning</span>
            <span className="text-xs px-2.5 py-1 bg-cyan-500/10 text-cyan-400 rounded-md border border-cyan-500/20 font-medium">{infos.length} Info</span>
          </div>

          <div className="space-y-3">
            {issues.map((iss, i) => (
              <div key={i} className={`p-4 rounded-xl border text-sm flex flex-col sm:flex-row sm:items-start gap-3 ${
                iss.severity === 'CRITICAL' ? 'bg-red-950/20 border-red-900/30' :
                iss.severity === 'WARNING' ? 'bg-yellow-950/20 border-yellow-900/30' :
                'bg-cyan-950/20 border-cyan-900/30'
              }`}>
                <div className="flex items-center gap-2 shrink-0 sm:pt-0.5">
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                    iss.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                    iss.severity === 'WARNING' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-cyan-500/20 text-cyan-400'
                  }`}>
                    {iss.severity}
                  </span>
                </div>
                <div className="flex-1 leading-relaxed">
                  <span className="text-slate-500 text-xs font-mono mr-2">[{iss.kind}: {iss.name}]</span>
                  <span className={
                    iss.severity === 'CRITICAL' ? 'text-red-200' :
                    iss.severity === 'WARNING' ? 'text-yellow-200' :
                    'text-cyan-200'
                  }>{iss.message}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <div className="max-w-6xl flex flex-col lg:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex flex-wrap gap-2 mb-4">
          {EXAMPLES.map(ex => (
            <button
              key={ex.label}
              onClick={() => setInput(ex.yaml)}
              className="text-xs font-medium text-slate-400 hover:text-cyan-400 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 hover:border-cyan-900/50 rounded-md px-3 py-1.5 transition-colors"
            >
              Cargar {ex.label}
            </button>
          ))}
        </div>
        
        <div className="relative flex-1 min-h-[500px]">
          <div className="absolute top-0 left-0 w-8 h-full bg-slate-950/50 border-r border-slate-800 pointer-events-none rounded-l-xl z-10 flex flex-col items-center py-4">
            {/* Fake line numbers */}
            {Array.from({ length: 25 }).map((_, i) => (
              <span key={i} className="text-[10px] text-slate-700 font-mono leading-[21px]">{i + 1}</span>
            ))}
          </div>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Pegá tu Deployment, Pod o DaemonSet YAML acá..."
            spellCheck={false}
            className="w-full h-full min-h-[500px] bg-[#0d1117] border border-slate-800 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 rounded-xl pl-12 pr-4 py-4 text-slate-300 font-mono text-[13px] leading-[21px] transition-all outline-none resize-none"
          />
        </div>
      </div>

      <div className="lg:w-[450px] shrink-0">
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-5 sticky top-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-200 mb-1">Reporte de Seguridad</h3>
              <p className="text-xs text-slate-500">
                Analiza requests/limits, tags, hostNetwork, capabilities, probes, etc.
              </p>
            </div>
            {issues.length > 0 && !parseError && (
              <button
                onClick={applyAutoFix}
                className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-lg shadow-cyan-900/20 font-semibold"
                title="Inyecta mejores prácticas de seguridad (CIS Benchmarks) automáticamente"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>
                Auto-Fix
              </button>
            )}
          </div>
          
          <div className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {renderIssues()}
          </div>
        </div>
      </div>
    </div>
  )
}
