'use client'

import { useState, useMemo } from 'react'
import * as jsyaml from 'js-yaml'

const EXAMPLES = [
  { 
    label: 'Inseguro', 
    yaml: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: bad-deployment
spec:
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
    label: 'Seguro', 
    yaml: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: good-deployment
spec:
  template:
    spec:
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
            allowPrivilegeEscalation: false`
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

    // Buscar spec.template.spec (Deployments, DaemonSets, StatefulSets, Jobs)
    // O directo spec (Pods)
    let podSpecs = []
    if (kind === 'Pod' && doc.spec) {
      podSpecs.push(doc.spec)
    } else if (doc.spec?.template?.spec) {
      podSpecs.push(doc.spec.template.spec)
    }

    podSpecs.forEach(podSpec => {
      // 1. hostNetwork, hostPID, hostIPC
      if (podSpec.hostNetwork) issues.push({ severity: 'CRITICAL', message: 'Usa hostNetwork, exponiendo la red del nodo al Pod.', kind, name })
      if (podSpec.hostPID) issues.push({ severity: 'CRITICAL', message: 'Usa hostPID, permitiendo ver procesos del host.', kind, name })
      if (podSpec.hostIPC) issues.push({ severity: 'CRITICAL', message: 'Usa hostIPC, permitiendo comunicación inter-proceso con el host.', kind, name })

      const containers = [...(podSpec.containers || []), ...(podSpec.initContainers || [])]

      if (containers.length === 0) {
        issues.push({ severity: 'WARNING', message: 'No hay contenedores definidos.', kind, name })
      }

      containers.forEach((c: any) => {
        const cName = c.name || 'unnamed-container'

        // 2. Imagen con latest
        if (!c.image || c.image.endsWith(':latest') || !c.image.includes(':')) {
          issues.push({ severity: 'WARNING', message: `Contenedor '${cName}' usa tag 'latest' o no especifica versión en la imagen.`, kind, name })
        }

        // 3. imagePullPolicy
        if (c.imagePullPolicy === 'Always' && !c.image?.endsWith(':latest')) {
          issues.push({ severity: 'INFO', message: `Contenedor '${cName}' tiene imagePullPolicy: Always con una imagen fija. Podría afectar performance de inicio.`, kind, name })
        }

        // 4. Resources
        if (!c.resources?.requests) {
          issues.push({ severity: 'WARNING', message: `Contenedor '${cName}' no define resource requests.`, kind, name })
        }
        if (!c.resources?.limits) {
          issues.push({ severity: 'WARNING', message: `Contenedor '${cName}' no define resource limits.`, kind, name })
        }

        // 5. Probes
        if (!c.livenessProbe) {
          issues.push({ severity: 'INFO', message: `Contenedor '${cName}' no tiene livenessProbe.`, kind, name })
        }
        if (!c.readinessProbe) {
          issues.push({ severity: 'INFO', message: `Contenedor '${cName}' no tiene readinessProbe.`, kind, name })
        }

        // 6. SecurityContext (Container level)
        if (c.securityContext?.privileged) {
          issues.push({ severity: 'CRITICAL', message: `Contenedor '${cName}' es privilegiado (privileged: true).`, kind, name })
        }
        if (c.securityContext?.allowPrivilegeEscalation !== false) {
          issues.push({ severity: 'WARNING', message: `Contenedor '${cName}' no tiene allowPrivilegeEscalation: false explícito.`, kind, name })
        }
        if (c.securityContext?.readOnlyRootFilesystem !== true) {
          issues.push({ severity: 'INFO', message: `Contenedor '${cName}' tiene un root filesystem escribible.`, kind, name })
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

          const containers = [...(podSpec.containers || []), ...(podSpec.initContainers || [])]
          containers.forEach((c: any) => {
            if (!c.resources) c.resources = {}
            if (!c.resources.requests) c.resources.requests = { cpu: '100m', memory: '128Mi' }
            if (!c.resources.limits) c.resources.limits = { cpu: '200m', memory: '256Mi' }

            if (!c.securityContext) c.securityContext = {}
            delete c.securityContext.privileged
            c.securityContext.allowPrivilegeEscalation = false
            // Evitamos forzar readOnlyRootFilesystem y runAsNonRoot porque suelen romper apps 
            // que no están preparadas, pero quitamos los privilegios.
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
      return <div className="text-red-400 bg-red-900/20 border border-red-800 rounded p-4 text-sm mt-4">Error de YAML: {parseError}</div>
    }

    if (input.trim() && issues.length === 0) {
      return <div className="text-green-400 bg-green-900/20 border border-green-800 rounded p-4 text-sm mt-4 flex items-center gap-2">✓ No se detectaron problemas. ¡Manifiesto impecable!</div>
    }

    if (issues.length > 0) {
      const criticals = issues.filter(i => i.severity === 'CRITICAL')
      const warnings = issues.filter(i => i.severity === 'WARNING')
      const infos = issues.filter(i => i.severity === 'INFO')

      return (
        <div className="mt-6 space-y-4">
          <div className="flex gap-4">
            <span className="text-xs px-2 py-1 bg-red-900/40 text-red-400 rounded border border-red-800/50">{criticals.length} Critical</span>
            <span className="text-xs px-2 py-1 bg-yellow-900/40 text-yellow-400 rounded border border-yellow-800/50">{warnings.length} Warning</span>
            <span className="text-xs px-2 py-1 bg-blue-900/40 text-blue-400 rounded border border-blue-800/50">{infos.length} Info</span>
          </div>

          <div className="space-y-2">
            {issues.map((iss, i) => (
              <div key={i} className={`p-3 rounded-lg border text-sm flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 ${
                iss.severity === 'CRITICAL' ? 'bg-red-900/10 border-red-800/30' :
                iss.severity === 'WARNING' ? 'bg-yellow-900/10 border-yellow-800/30' :
                'bg-blue-900/10 border-blue-800/30'
              }`}>
                <div className="flex items-center gap-2 min-w-[120px]">
                  <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                    iss.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                    iss.severity === 'WARNING' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {iss.severity}
                  </span>
                </div>
                <div className="flex-1">
                  <span className="text-gray-400 text-xs mr-2">[{iss.kind}: {iss.name}]</span>
                  <span className={
                    iss.severity === 'CRITICAL' ? 'text-red-200' :
                    iss.severity === 'WARNING' ? 'text-yellow-200' :
                    'text-blue-200'
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
    <div className="max-w-4xl flex flex-col md:flex-row gap-6">
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
          placeholder="Pegá tu Deployment, Pod o DaemonSet YAML acá..."
          rows={20}
          spellCheck={false}
          className="w-full bg-gray-900 border border-gray-700 focus:border-green-500 focus:ring-green-500 rounded-lg px-4 py-3 text-gray-100 font-mono text-xs transition-colors resize-y"
        />
      </div>

      <div className="md:w-[400px]">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-200 mb-1">Reporte</h3>
            <p className="text-xs text-gray-500 max-w-[200px]">
              Analiza requests/limits, tags latest, hostNetwork, capabilities, probes, etc.
            </p>
          </div>
          {issues.length > 0 && !parseError && (
            <button
              onClick={applyAutoFix}
              className="bg-blue-700/80 hover:bg-blue-600 border border-blue-600/50 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-lg"
              title="Aplica fixes rápidos: resources, sec context, hostNetwork"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>
              Auto-Fix
            </button>
          )}
        </div>
        
        {renderIssues()}
      </div>
    </div>
  )
}
