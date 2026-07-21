'use client'

import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

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
      <div className="flex justify-center items-center h-32 bg-gray-900/50 border border-gray-800 rounded-lg text-gray-500 animate-pulse">
        Renderizando diagrama...
      </div>
    )
  }

  return (
    <div 
      ref={ref} 
      className="my-8 flex justify-center bg-gray-900/50 border border-gray-800 rounded-lg p-6 overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }} 
    />
  )
}
