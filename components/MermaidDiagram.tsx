'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

// Mermaid pesa ~1 MB: se descarga solo en páginas que tienen un diagrama, y se inicializa una vez
let mermaidPromise: Promise<typeof import('mermaid').default> | null = null

function loadMermaid() {
  mermaidPromise ??= import('mermaid').then(({ default: mermaid }) => {
    mermaid.initialize(MERMAID_CONFIG)
    return mermaid
  })
  return mermaidPromise
}

// Tema oscuro y alto contraste para DevOps KB
const MERMAID_CONFIG: Parameters<typeof import('mermaid').default.initialize>[0] = {
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
    fontSize: '14px'
  }
}

const MERMAID_SVG_THEME_CLASSES = `
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
  [&_.edgeLabel]:!bg-slate-900 [&_.edgeLabel]:!text-slate-300 [&_.edgeLabel_span]:!text-slate-300
`

const MIN_ZOOM = 0.5
const MAX_ZOOM = 4
const ZOOM_STEP = 0.25

function clampZoom(z: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(z * 100) / 100))
}

function parseViewBoxDimensions(svgString: string): { width: number; height: number } | null {
  const match = svgString.match(/viewBox=["']\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)\s*["']/i)
  if (!match) return null
  const width = parseFloat(match[1])
  const height = parseFloat(match[2])
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null
  return { width, height }
}

export default function MermaidDiagram({ chart }: { chart: string }) {
  const inlineRef = useRef<HTMLDivElement>(null)
  const modalViewportRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string>('')

  // Estado de zoom/pan inline
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0, moved: false })

  // Estado del modal pantalla completa
  const [isExpanded, setIsExpanded] = useState(false)
  const [modalZoom, setModalZoom] = useState(1)
  const [modalPan, setModalPan] = useState({ x: 0, y: 0 })
  const [isModalDragging, setIsModalDragging] = useState(false)
  const modalDragRef = useRef({ x: 0, y: 0, panX: 0, panY: 0, moved: false })

  useEffect(() => {
    let isMounted = true

    const renderDiagram = async () => {
      try {
        const id = `mermaid-svg-${Math.round(Math.random() * 1000000)}`
        const mermaid = await loadMermaid()
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

  const resetInline = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  const resetModal = useCallback(() => {
    setModalZoom(1)
    setModalPan({ x: 0, y: 0 })
  }, [])

  const openModal = useCallback(() => {
    resetModal()
    setIsExpanded(true)
  }, [resetModal])

  const closeModal = useCallback(() => {
    setIsExpanded(false)
  }, [])

  // Cerrar con Escape y bloquear el scroll del body cuando el modal está abierto
  useEffect(() => {
    if (!isExpanded) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal()
      else if (e.key === '+' || e.key === '=') setModalZoom(z => clampZoom(z + ZOOM_STEP))
      else if (e.key === '-') setModalZoom(z => clampZoom(z - ZOOM_STEP))
      else if (e.key === '0') resetModal()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isExpanded, closeModal, resetModal])

  // Zoom con Ctrl/Cmd + rueda en el diagrama inline
  useEffect(() => {
    const el = inlineRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP
      setZoom(z => {
        const next = clampZoom(z + delta)
        if (next === 1) setPan({ x: 0, y: 0 })
        return next
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [svg])

  // Zoom directo con la rueda en el modal pantalla completa
  useEffect(() => {
    if (!isExpanded) return
    const el = modalViewportRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP
      setModalZoom(z => clampZoom(z + delta))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [isExpanded])

  // Handlers de arrastre inline
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
      moved: false,
    }
    if (zoom > 1 || pan.x !== 0 || pan.y !== 0) {
      setIsDragging(true)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const dx = e.clientX - dragStartRef.current.x
    const dy = e.clientY - dragStartRef.current.y
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragStartRef.current.moved = true
    }
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleInlineClick = () => {
    if (dragStartRef.current.moved) {
      dragStartRef.current.moved = false
      return
    }
    if (zoom === 1 && pan.x === 0 && pan.y === 0) {
      openModal()
    }
  }

  // Handlers de arrastre en el modal
  const handleModalMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    modalDragRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: modalPan.x,
      panY: modalPan.y,
      moved: false,
    }
    setIsModalDragging(true)
  }

  const handleModalMouseMove = (e: React.MouseEvent) => {
    if (!isModalDragging) return
    const dx = e.clientX - modalDragRef.current.x
    const dy = e.clientY - modalDragRef.current.y
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      modalDragRef.current.moved = true
    }
    setModalPan({
      x: modalDragRef.current.panX + dx,
      y: modalDragRef.current.panY + dy,
    })
  }

  const handleModalMouseUp = () => {
    setIsModalDragging(false)
  }

  const handleModalDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (modalZoom > 1) {
      resetModal()
    } else {
      setModalZoom(2)
    }
  }

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

  const dims = parseViewBoxDimensions(svg)
  const aspect = dims ? dims.width / dims.height : 2
  const modalBaseWidth = dims
    ? `min(90vw, calc(80vh * ${aspect.toFixed(3)}), ${Math.round(Math.max(dims.width * 1.4, 1100))}px)`
    : 'min(88vw, 1280px)'

  const isInlineTransformed = zoom !== 1 || pan.x !== 0 || pan.y !== 0

  return (
    <>
      <div
        ref={inlineRef}
        className="not-prose group/mermaid relative my-8 bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-xl overflow-hidden shadow-inner transition-colors"
      >
        {/* Barra de controles de zoom y pantalla completa */}
        <div
          onClick={e => e.stopPropagation()}
          className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 rounded-lg bg-slate-950/85 backdrop-blur-sm border border-slate-800 px-1.5 py-1 text-xs text-slate-300 shadow-md opacity-100 md:opacity-75 md:group-hover/mermaid:opacity-100 transition-opacity select-none"
        >
          <button
            type="button"
            onClick={() => {
              setZoom(z => {
                const next = clampZoom(z - ZOOM_STEP)
                if (next === 1) setPan({ x: 0, y: 0 })
                return next
              })
            }}
            disabled={zoom <= MIN_ZOOM}
            title="Alejar"
            aria-label="Alejar diagrama"
            className="px-1.5 py-0.5 rounded hover:bg-slate-800 hover:text-cyan-400 disabled:opacity-40 disabled:pointer-events-none font-mono text-sm leading-none"
          >
            −
          </button>
          <button
            type="button"
            onClick={resetInline}
            title="Restablecer zoom (100%)"
            className="px-1.5 py-0.5 rounded hover:bg-slate-800 hover:text-cyan-400 font-mono text-[11px] min-w-[3rem] text-center"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() => setZoom(z => clampZoom(z + ZOOM_STEP))}
            disabled={zoom >= MAX_ZOOM}
            title="Acercar"
            aria-label="Acercar diagrama"
            className="px-1.5 py-0.5 rounded hover:bg-slate-800 hover:text-cyan-400 disabled:opacity-40 disabled:pointer-events-none font-mono text-sm leading-none"
          >
            +
          </button>
          <span className="h-3.5 w-px bg-slate-800 mx-0.5" aria-hidden="true" />
          <button
            type="button"
            onClick={openModal}
            title="Ampliar a pantalla completa"
            aria-label="Ampliar diagrama a pantalla completa"
            className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-800 text-slate-300 hover:text-cyan-400 font-medium text-[11px]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
            <span className="hidden sm:inline">Ampliar</span>
          </button>
        </div>

        {/* Contenedor del SVG inline */}
        <div
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleInlineClick}
          title={isInlineTransformed ? 'Arrastrá para mover el diagrama' : 'Clic para ampliar a pantalla completa'}
          className={`mermaid-wrapper flex justify-center p-6 pt-11 overflow-x-auto select-none ${
            isDragging
              ? 'cursor-grabbing'
              : isInlineTransformed
              ? 'cursor-grab'
              : 'cursor-zoom-in'
          }`}
        >
          <div
            style={
              isInlineTransformed
                ? {
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                  }
                : undefined
            }
            className={`w-full flex justify-center transition-transform duration-75 ease-out [&_svg]:max-w-full [&_svg]:h-auto ${MERMAID_SVG_THEME_CLASSES}`}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
      </div>

      {/* Modal pantalla completa (Lightbox) */}
      {isExpanded &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Vista ampliada del diagrama"
            className="fixed inset-0 z-[100] flex flex-col bg-slate-950/90 backdrop-blur-md select-none"
            onClick={() => {
              if (!modalDragRef.current.moved) closeModal()
              modalDragRef.current.moved = false
            }}
          >
            {/* Barra superior del modal */}
            <div
              onClick={e => e.stopPropagation()}
              className="flex items-center justify-between gap-4 px-4 py-3 border-b border-slate-800/80 bg-slate-950/80 text-xs text-slate-400"
            >
              <span className="hidden sm:inline font-mono text-slate-400">
                Rueda del mouse: zoom · Arrastrar: mover · Doble clic: 200% · Esc: cerrar
              </span>
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  type="button"
                  onClick={() => setModalZoom(z => clampZoom(z - ZOOM_STEP))}
                  disabled={modalZoom <= MIN_ZOOM}
                  title="Alejar (-)"
                  className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 hover:border-cyan-500 text-slate-200 hover:text-cyan-400 disabled:opacity-40 font-mono text-sm"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={resetModal}
                  title="Restablecer vista (0)"
                  className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 hover:border-cyan-500 text-slate-200 hover:text-cyan-400 font-mono min-w-[3.5rem] text-center"
                >
                  {Math.round(modalZoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => setModalZoom(z => clampZoom(z + ZOOM_STEP))}
                  disabled={modalZoom >= MAX_ZOOM}
                  title="Acercar (+)"
                  className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 hover:border-cyan-500 text-slate-200 hover:text-cyan-400 disabled:opacity-40 font-mono text-sm"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={resetModal}
                  className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-cyan-400"
                >
                  Ajustar
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  title="Cerrar (Esc)"
                  className="ml-2 flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-800 border border-slate-700 hover:border-cyan-500 text-slate-200 hover:text-white font-medium"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  Cerrar
                </button>
              </div>
            </div>

            {/* Lienzo interactivo con pan y zoom */}
            <div
              ref={modalViewportRef}
              onMouseDown={handleModalMouseDown}
              onMouseMove={handleModalMouseMove}
              onMouseUp={handleModalMouseUp}
              onMouseLeave={handleModalMouseUp}
              onDoubleClick={handleModalDoubleClick}
              className={`flex-1 flex items-center justify-center overflow-hidden p-6 ${
                isModalDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  width: modalBaseWidth,
                  transform: `translate(${modalPan.x}px, ${modalPan.y}px) scale(${modalZoom})`,
                  transformOrigin: 'center center',
                }}
                className={`flex justify-center items-center transition-transform duration-75 ease-out [&_svg]:!max-w-none [&_svg]:!w-full [&_svg]:!h-auto ${MERMAID_SVG_THEME_CLASSES}`}
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
