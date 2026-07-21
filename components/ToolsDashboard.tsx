'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Tool } from '@/lib/tools'

const CATEGORY_ORDER = [
  'Kubernetes',
  'Networking',
  'Seguridad & Crypto',
  'Data & Dev',
  'Utilidades'
]

export default function ToolsDashboard({ tools }: { tools: Tool[] }) {
  const [search, setSearch] = useState('')

  const filteredTools = tools.filter(tool => 
    tool.label.toLowerCase().includes(search.toLowerCase()) || 
    tool.description.toLowerCase().includes(search.toLowerCase()) ||
    tool.group.toLowerCase().includes(search.toLowerCase())
  )

  const groupedTools = filteredTools.reduce((acc, tool) => {
    const g = tool.group || 'Otros'
    if (!acc[g]) acc[g] = []
    acc[g].push(tool)
    return acc
  }, {} as Record<string, Tool[]>)

  const sortedGroups = Object.keys(groupedTools).sort((a, b) => {
    const idxA = CATEGORY_ORDER.indexOf(a)
    const idxB = CATEGORY_ORDER.indexOf(b)
    if (idxA === -1) return 1
    if (idxB === -1) return -1
    return idxA - idxB
  })

  return (
    <div>
      <div className="mb-10 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-wrap gap-3 text-xs font-semibold text-gray-400">
          <span className="bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-md flex items-center gap-1.5">
            <span className="text-gray-100">{tools.length}</span> Herramientas
          </span>
          <span className="bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-md flex items-center gap-1.5">
            <span className="text-gray-100">{CATEGORY_ORDER.length}</span> Categorías
          </span>
          <span className="bg-gray-900 border border-green-900/50 text-green-400 px-3 py-1.5 rounded-md">
            100% Gratuitas
          </span>
        </div>
        
        <div className="relative w-full md:w-72">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Buscar herramienta... (ej: yaml, jwt)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 focus:border-green-600 rounded-md py-2 pl-9 pr-4 text-sm text-gray-100 placeholder:text-gray-500 outline-none transition-colors"
          />
        </div>
      </div>

      {sortedGroups.length === 0 ? (
        <div className="text-center py-16 bg-gray-900/50 rounded-xl border border-gray-800 border-dashed">
          <p className="text-gray-400 mb-2">No encontramos resultados para <span className="text-gray-200 font-medium">"{search}"</span></p>
          <button onClick={() => setSearch('')} className="text-green-400 text-sm hover:underline">Limpiar búsqueda</button>
        </div>
      ) : (
        <div className="space-y-12">
          {sortedGroups.map(groupName => {
            const groupItems = groupedTools[groupName]
            return (
              <section key={groupName}>
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-5 border-b border-gray-800 pb-2 flex items-center gap-2">
                  {groupName} <span className="bg-gray-800 text-gray-500 text-[10px] px-1.5 py-0.5 rounded">{groupItems.length}</span>
                </h2>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {groupItems.map(tool => (
                    <Link
                      key={tool.id}
                      href={tool.href}
                      className="relative group flex flex-col gap-3 p-5 bg-gray-900 border border-gray-800 rounded-xl hover:border-green-700 hover:bg-gray-800/50 shadow-sm hover:shadow-md transition-all"
                    >
                      {/* Status Badge */}
                      {tool.status && (
                        <div className={`absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                          tool.status === 'Nuevo' ? 'bg-purple-900/30 text-purple-300 border-purple-800/50' :
                          tool.status === 'Beta' ? 'bg-blue-900/30 text-blue-300 border-blue-800/50' :
                          'bg-gray-800/60 text-green-400 border-gray-700'
                        }`}>
                          {tool.status === 'Nuevo' ? '🆕 ' : tool.status === 'Beta' ? '🟡 ' : '🟢 '}
                          {tool.status}
                        </div>
                      )}

                      <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-lg bg-gray-800 border border-gray-700 group-hover:border-green-800 flex items-center justify-center transition-colors shrink-0">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18" height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-green-400"
                          >
                            <path d={tool.iconPath} />
                          </svg>
                        </div>
                        <h2 className="font-semibold text-gray-100 group-hover:text-white text-base pr-12">{tool.label}</h2>
                      </div>
                      
                      <p className="text-gray-500 text-sm leading-relaxed flex-1">{tool.description}</p>
                      
                      {/* Feature Badges */}
                      {tool.badges && tool.badges.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
                          {tool.badges.map(badge => (
                            <span key={badge} className="text-[10px] font-medium text-gray-400 bg-gray-950 border border-gray-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                              {badge === 'Browser Only' ? '🌐' : 
                               badge === 'Offline' ? '💻' :
                               badge === 'Server Side' ? '☁️' :
                               badge === 'Hybrid' ? '🔀' :
                               badge === 'Instantáneo' ? '⚡' : ''} {badge}
                            </span>
                          ))}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
