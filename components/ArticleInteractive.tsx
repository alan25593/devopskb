'use client'

// Interactive islands of the (server-rendered) article page

import { useState, useEffect } from 'react'

function ClipboardIcon({ size = 14 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export function CopyButton({ text, variant }: { text: string; variant: 'block' | 'inline' }) {
  const [copied, setCopied] = useState(false)

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  if (variant === 'block') {
    return (
      <button
        onClick={handleClick}
        title="Copiar"
        className="absolute top-2 right-2 opacity-100 md:opacity-0 md:group-hover/code-block:opacity-100 transition-opacity
          flex items-center gap-1 bg-slate-800 border border-slate-700 hover:border-cyan-600 hover:bg-slate-700 text-slate-300 hover:text-white
          rounded px-2 py-1 text-xs font-mono select-none shadow-sm"
      >
        {copied ? <><CheckIcon /> copiado</> : <><ClipboardIcon /> copiar</>}
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      title="Copiar"
      // Floats over the chip's corner so it takes no room in the text flow
      className="absolute -top-2.5 -right-2.5 z-10 hidden group-hover/code:flex items-center justify-center
        w-5 h-5 rounded bg-slate-800 border border-slate-600 text-slate-400 hover:text-cyan-400 hover:border-cyan-600 shadow"
    >
      {copied ? <CheckIcon size={11} /> : <ClipboardIcon size={11} />}
    </button>
  )
}

export function ScrollToTop({ targetId }: { targetId: string }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = document.getElementById(targetId)
    if (!el) return
    const onScroll = () => setVisible(el.scrollTop > 250)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [targetId])

  const scrollUp = () => document.getElementById(targetId)?.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <button
      onClick={scrollUp}
      title="Volver arriba"
      className={`fixed bottom-6 right-6 z-50 bg-slate-800 border border-slate-700 hover:border-cyan-500
        text-slate-500 hover:text-cyan-400 rounded-full p-3 shadow-lg
        transition-all duration-200
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  )
}
