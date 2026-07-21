'use client'

import { useState, useMemo } from 'react'
import * as jsyaml from 'js-yaml'

const EXAMPLES = [
  {
    label: 'Developer Access',
    yaml: `apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
  namespace: default
rules:
- apiGroups: [""]
  resources: ["pods", "pods/log"]
  verbs: ["get", "watch", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: default
subjects:
- kind: User
  name: jane
  apiGroup: rbac.authorization.k8s.io
- kind: ServiceAccount
  name: default
  namespace: default
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io`
  }
]

export default function RbacViewer() {
  const [input, setInput] = useState('')
  const [viewMode, setViewMode] = useState<'bindings' | 'subjects'>('bindings')

  const { parsed, subjects, error } = useMemo(() => {
    if (!input.trim()) return { parsed: null, subjects: [], error: null }
    try {
      const docs: any[] = []
      jsyaml.loadAll(input, doc => { if (doc) docs.push(doc) })

      const roles = docs.filter(d => d.kind === 'Role' || d.kind === 'ClusterRole')
      const bindings = docs.filter(d => d.kind === 'RoleBinding' || d.kind === 'ClusterRoleBinding')

      const result: any[] = []

      // Procesar cada Binding y mapearlo a su Role
      bindings.forEach(b => {
        const roleName = b.roleRef?.name
        const roleKind = b.roleRef?.kind
        const targetRole = roles.find(r => r.metadata?.name === roleName && r.kind === roleKind)
        
        result.push({
          bindingName: b.metadata?.name || 'Unnamed',
          bindingKind: b.kind,
          namespace: b.metadata?.namespace || 'All Namespaces (Cluster)',
          subjects: b.subjects || [],
          roleRef: b.roleRef,
          rules: targetRole ? targetRole.rules : null, // Si es null, el rol no estaba pegado
          isMissingRole: !targetRole
        })
      })

      // Agregar Roles huerfanos (pegados pero no enlazados en este YAML)
      const linkedRoleNames = bindings.map(b => b.roleRef?.name)
      const orphanRoles = roles.filter(r => !linkedRoleNames.includes(r.metadata?.name))
      orphanRoles.forEach(r => {
        result.push({
          bindingName: '(Sin Binding detectado)',
          bindingKind: '-',
          namespace: r.metadata?.namespace || 'All Namespaces (Cluster)',
          subjects: [],
          roleRef: { kind: r.kind, name: r.metadata?.name },
          rules: r.rules || [],
          isMissingRole: false
        })
      })

      const subMap = new Map<string, any>()
      result.forEach(b => {
        if (!b.subjects) return
        b.subjects.forEach((s: any) => {
          const key = `${s.kind}:${s.namespace || ''}:${s.name}`
          if (!subMap.has(key)) {
            subMap.set(key, { kind: s.kind, name: s.name, ns: s.namespace, permissions: [] })
          }
          const subObj = subMap.get(key)
          subObj.permissions.push({
            bindingNamespace: b.namespace,
            roleName: b.roleRef?.name,
            rules: b.rules || [],
            isMissingRole: b.isMissingRole
          })
        })
      })

      const uniqueSubjects = Array.from(subMap.values())

      return { parsed: result, subjects: uniqueSubjects, error: null }
    } catch (e: any) {
      return { parsed: null, subjects: [], error: e.message }
    }
  }, [input])

  const renderSubject = (sub: any) => {
    let icon = '👤'
    if (sub.kind === 'ServiceAccount') icon = '🤖'
    if (sub.kind === 'Group') icon = '👥'

    return (
      <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs mb-1">
        <span>{icon}</span>
        <div>
          <span className="font-semibold text-gray-200 block">{sub.name}</span>
          <span className="text-[10px] text-gray-500 block">{sub.kind} {sub.namespace ? `(${sub.namespace})` : ''}</span>
        </div>
      </div>
    )
  }

  const renderRule = (rule: any, i: number) => {
    const apiGroups = (rule.apiGroups || []).join(', ') || '"" (core)'
    const resources = (rule.resources || []).join(', ')
    const verbs = (rule.verbs || [])

    return (
      <div key={i} className="mb-2 last:mb-0 border-l-2 border-gray-600 pl-3">
        <div className="text-[10px] text-gray-500 mb-0.5">API: <span className="font-mono text-gray-400">{apiGroups}</span></div>
        <div className="text-xs text-blue-300 font-mono mb-1">{resources}</div>
        <div className="flex flex-wrap gap-1">
          {verbs.map((v: string) => {
            const isDanger = ['*','delete','deletecollection'].includes(v.toLowerCase())
            const isWrite = ['create','update','patch'].includes(v.toLowerCase())
            return (
              <span key={v} className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                isDanger ? 'bg-red-900/30 text-red-400 border-red-800/50' :
                isWrite ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800/50' :
                'bg-green-900/30 text-green-400 border-green-800/50'
              }`}>
                {v}
              </span>
            )
          })}
        </div>
      </div>
    )
  }

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
          placeholder="Pegá tus Roles, ClusterRoles y Bindings acá..."
          rows={20}
          spellCheck={false}
          className="w-full bg-gray-900 border border-gray-700 focus:border-green-500 focus:ring-green-500 rounded-lg px-4 py-3 text-gray-100 font-mono text-xs transition-colors resize-y"
        />
        {error && <div className="text-red-400 text-sm mt-2">Error: {error}</div>}
      </div>

      <div className="lg:w-[650px]">
        {parsed ? (
          <div>
            <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-1 mb-4 w-fit shadow-sm">
              <button onClick={() => setViewMode('bindings')} className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'bindings' ? 'bg-gray-800 text-gray-200 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>Por Bindings</button>
              <button onClick={() => setViewMode('subjects')} className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'subjects' ? 'bg-gray-800 text-gray-200 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>Por Subject (Permisos Efectivos)</button>
            </div>

            {viewMode === 'bindings' ? (
              <div className="space-y-4">
                {parsed.length === 0 && <div className="text-gray-500 text-sm">No se encontraron Roles ni Bindings.</div>}
                
                {parsed.map((item, idx) => (
                  <div key={idx} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-lg">
                    <div className="bg-gray-800/50 px-4 py-3 border-b border-gray-800 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block mb-0.5">
                          {item.bindingKind}
                        </span>
                        <h3 className="font-semibold text-gray-200">{item.bindingName}</h3>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block mb-0.5">Namespace</span>
                        <span className="text-xs text-blue-400 font-mono bg-blue-900/20 px-2 py-0.5 rounded border border-blue-800/30">
                          {item.namespace}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 flex flex-col sm:flex-row gap-6">
                      {/* Subjects */}
                      <div className="flex-1 min-w-[200px]">
                        <h4 className="text-xs uppercase font-medium text-gray-500 mb-2 border-b border-gray-800 pb-1">Quién (Subjects)</h4>
                        {item.subjects.length > 0 ? (
                          item.subjects.map((sub: any, i: number) => <div key={i}>{renderSubject(sub)}</div>)
                        ) : (
                          <span className="text-xs text-gray-500 italic">No hay subjects asignados.</span>
                        )}
                      </div>

                      {/* Flow Arrow (Desktop) */}
                      <div className="hidden sm:flex items-center justify-center text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                      </div>

                      {/* Role & Rules */}
                      <div className="flex-1 min-w-[250px]">
                        <h4 className="text-xs uppercase font-medium text-gray-500 mb-2 border-b border-gray-800 pb-1">
                          Qué puede hacer ({item.roleRef?.kind}: <span className="text-gray-300 font-mono">{item.roleRef?.name}</span>)
                        </h4>
                        
                        {item.isMissingRole ? (
                          <div className="text-xs text-yellow-500 bg-yellow-900/10 border border-yellow-800/30 p-2 rounded">
                            El rol no está definido en el YAML ingresado, por lo que no se pueden mostrar sus reglas.
                          </div>
                        ) : (
                          <div className="bg-gray-800/30 rounded p-2 border border-gray-800">
                            {item.rules && item.rules.length > 0 ? (
                              item.rules.map((rule: any, i: number) => renderRule(rule, i))
                            ) : (
                              <span className="text-xs text-gray-500 italic">El rol no define reglas.</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {subjects.length === 0 && <div className="text-gray-500 text-sm">No se encontraron subjects.</div>}
                {subjects.map((sub: any, idx: number) => {
                  let icon = '👤'
                  if (sub.kind === 'ServiceAccount') icon = '🤖'
                  if (sub.kind === 'Group') icon = '👥'

                  return (
                    <div key={idx} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-lg mb-4">
                      <div className="bg-gray-800/50 px-4 py-3 border-b border-gray-800 flex items-center gap-3">
                        <span className="text-2xl">{icon}</span>
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block mb-0.5">{sub.kind} {sub.ns ? `(${sub.ns})` : ''}</span>
                          <h3 className="font-semibold text-gray-200">{sub.name}</h3>
                        </div>
                      </div>
                      <div className="p-4 space-y-4">
                        {sub.permissions.map((perm: any, i: number) => (
                          <div key={i} className="bg-gray-800/30 border border-gray-800 rounded-lg p-3">
                            <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-800/50">
                                <div>
                                  <span className="text-[10px] text-gray-500 uppercase block">Namespace Autorizado</span>
                                  <span className="text-xs text-blue-400 font-mono">{perm.bindingNamespace}</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] text-gray-500 uppercase block">Hereda Rol</span>
                                  <span className="text-xs text-gray-300 font-mono">{perm.roleName}</span>
                                </div>
                            </div>
                            {perm.isMissingRole ? (
                                <span className="text-xs text-yellow-500 italic">Reglas no disponibles (Rol no provisto)</span>
                            ) : (
                                <div className="space-y-2">
                                  {perm.rules.map((rule: any, j: number) => renderRule(rule, j))}
                                </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center border border-dashed border-gray-700 rounded-xl p-6 text-center text-gray-500 text-sm">
            Pegá Roles y Bindings para visualizar quién tiene qué permisos.
          </div>
        )}
      </div>
    </div>
  )
}
