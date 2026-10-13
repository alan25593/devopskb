'use client'

import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

// Inicializar Mermaid con tema oscuro y alto contraste para DevOps KB
mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  securityLevel: 'loose',
  flowchart: {
    htmlLabels: true,
    curve: 'basis',
  },
  themeVariables: {
    darkMode: true,
    background: 'transparent',
    mainBkg: '#1e293b',          // slate-800
    nodeBorder: '#38bdf8',       // sky-400
    textColor: '#f8fafc',        // slate-50
    primaryColor: '#1e293b',     // slate-800
    primaryTextColor: '#f8fafc', // slate-50
    primaryBorderColor: '#38bdf8',
    lineColor: '#38bdf8',
    secondaryColor: '#0f172a',
    secondaryTextColor: '#f8fafc',
    secondaryBorderColor: '#0284c7',
    tertiaryColor: '#0f172a',
    tertiaryTextColor: '#f8fafc',
    tertiaryBorderColor: '#334155',
    clusterBkg: '#0b1329',
    clusterBorder: '#334155',
    defaultLinkColor: '#38bdf8',
    titleColor: '#38bdf8',
    edgeLabelBackground: '#0f172a',
    actorBorder: '#38bdf8',
    actorBkg: '#1e293b',
    actorTextColor: '#f8fafc',
    actorLineColor: '#38bdf8',
    signalColor: '#f8fafc',
    signalTextColor: '#f8fafc',
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '13px'
  }
})

export default function MermaidDiagram({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    let isMounted = true

    const renderDiagram = async () => {
      try {
        const id = `mermaid-svg-${Math.round(Math.random() * 1000000)}`
        const { svg: renderedSvg } = await mermaid.render(id, chart)
        if (isMounted) {
          setSvg(renderedSvg)
          setError('')
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Error renderizando diagrama de Mermaid')
        }
      }
    }

    renderDiagram()

    return () => {
      isMounted = false
    }
  }, [chart])

  if (error) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 font-mono text-sm overflow-x-auto">
        <p className="font-bold mb-2">Error en el diagrama Mermaid:</p>
        <pre>{error}</pre>
      </div>
    )
  }

  if (!svg) {
    return (
      <div className="flex justify-center items-center h-28 bg-slate-900/40 border border-slate-800 rounded-xl text-slate-500 animate-pulse text-xs font-mono">
        Renderizando diagrama...
      </div>
    )
  }

  return (
    <div 
      ref={ref} 
      className="mermaid-wrapper my-8 flex justify-center bg-slate-900/70 border border-slate-800 rounded-xl p-6 overflow-x-auto shadow-inner [&_svg]:max-w-full [&_svg]:h-auto
        [&_.node_rect]:!fill-slate-800 [&_.node_rect]:!stroke-sky-400 [&_.node_rect]:!stroke-[1.5px]
        [&_.node_polygon]:!fill-slate-800 [&_.node_polygon]:!stroke-sky-400 [&_.node_polygon]:!stroke-[1.5px]
        [&_.node_circle]:!fill-slate-800 [&_.node_circle]:!stroke-sky-400 [&_.node_circle]:!stroke-[1.5px]
        [&_.node_path]:!fill-slate-800 [&_.node_path]:!stroke-sky-400
        [&_.node_.label]:!text-slate-50 [&_.node_.label]:!fill-slate-50
        [&_.node_span]:!text-slate-50 [&_.node_span]:!font-medium
        [&_.node_p]:!text-slate-50 [&_.node_p]:!font-medium
        [&_.node_div]:!text-slate-50 [&_.node_div]:!font-medium
        [&_.node_text]:!fill-slate-50 [&_.node_text]:!font-medium
        [&_.edgePath_path]:!stroke-sky-400 [&_.edgePath_path]:!stroke-[1.5px]
        [&_.flowchart-link]:!stroke-sky-400 [&_.flowchart-link]:!stroke-[1.5px]
        [&_marker_path]:!fill-sky-400 [&_marker_path]:!stroke-sky-400
        [&_.cluster_rect]:!fill-slate-950/80 [&_.cluster_rect]:!stroke-slate-700
        [&_.cluster_span]:!text-sky-300 [&_.cluster_span]:!font-semibold
        [&_.edgeLabel]:!bg-slate-900 [&_.edgeLabel]:!text-slate-300 [&_.edgeLabel_span]:!text-slate-300"
      dangerouslySetInnerHTML={{ __html: svg }} 
    />
  )
}
