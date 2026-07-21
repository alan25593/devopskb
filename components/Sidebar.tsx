'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CATEGORIES } from '@/lib/categories'
import { TOOLS } from '@/lib/tools'

const SHORT_TITLE_RE = /^(terraform|docker|kubernetes|git|linux|windows)[\s:—–-]+/i

function BrandIcon({ hex, svgPath, label, size = 15 }: { hex: string; svgPath: string; label: string; size?: number }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={`#${hex}`}
      aria-label={label}
      style={{ flexShrink: 0 }}
    >
      <path d={svgPath} />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
  )
}

interface NavArticle {
  slug: string
  category: string
  title: string
}

interface SidebarProps {
  activeCategory?: string | null
  activeSlug?: string
  activeToolSlug?: string
  onCategoryChange?: (cat: string | null) => void
  mode?: 'filter' | 'link'
  categoryArticles?: NavArticle[]
}

export default function Sidebar({ activeCategory, activeSlug, activeToolSlug, onCategoryChange, mode = 'filter', categoryArticles }: SidebarProps) {
  const [open, setOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const close = () => setOpen(false)
  const toggleCollapse = () => setIsCollapsed(!isCollapsed)

  const navContent = (
    <>
      {mode === 'filter' && onCategoryChange && (
        <button
          onClick={() => { onCategoryChange(null); close() }}
          title="Todos"
          className={`w-full text-left px-3 py-2 rounded-md text-sm mb-1 transition-colors ${
            !activeCategory
              ? 'bg-cyan-900/50 text-cyan-300 font-medium'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          } ${isCollapsed ? 'text-center flex justify-center' : ''}`}
        >
          {isCollapsed ? <span className="font-bold">ALL</span> : 'Todos'}
        </button>
      )}

      {CATEGORIES.map(cat => {
        const isActive = activeCategory === cat.id
        const commonClass = `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm mb-1 transition-colors ${
          isActive
            ? 'bg-cyan-900/50 text-cyan-300 font-medium'
            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
        } ${isCollapsed ? 'justify-center px-0' : ''}`

        if (mode === 'link') {
          return (
            <div key={cat.id}>
              <Link href={`/?cat=${cat.id}`} className={commonClass} onClick={close} title={cat.label}>
                <BrandIcon hex={cat.hex} svgPath={cat.svgPath} label={cat.label} size={isCollapsed ? 18 : 15} />
                {!isCollapsed && <span>{cat.label}</span>}
              </Link>
              {isActive && !isCollapsed && categoryArticles && categoryArticles.length > 0 && (
                <div className="ml-5 mt-0.5 mb-2 border-l border-slate-800 pl-3 space-y-0.5">
                  {categoryArticles.map(a => {
                    const isCurrentArticle = a.slug === activeSlug
                    const shortTitle = a.title.replace(SHORT_TITLE_RE, '')
                    return (
                      <Link
                        key={a.slug}
                        href={`/article/${a.category}/${a.slug}/`}
                        onClick={close}
                        title={a.title}
                        className={`block text-xs py-1 px-2 rounded truncate transition-colors ${
                          isCurrentArticle
                            ? 'text-cyan-400 bg-cyan-900/20 font-medium'
                            : 'text-slate-600 hover:text-slate-200 hover:bg-slate-800/60'
                        }`}
                      >
                        {shortTitle}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        }

        return (
          <button
            key={cat.id}
            title={cat.label}
            onClick={() => { onCategoryChange?.(isActive ? null : cat.id); close() }}
            className={`w-full ${commonClass}`}
          >
            <BrandIcon hex={cat.hex} svgPath={cat.svgPath} label={cat.label} size={isCollapsed ? 18 : 15} />
            {!isCollapsed && <span>{cat.label}</span>}
          </button>
        )
      })}
    </>
  )

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="md:hidden fixed top-3 left-3 z-50 p-2 rounded-md bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors shadow-sm"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
      >
        <MenuIcon />
      </button>

      {/* Mobile backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={close}
        />
      )}

      {/* Sidebar panel */}
      <aside className={[
        'fixed md:static inset-y-0 left-0 z-50',
        'shrink-0 bg-slate-950 md:bg-slate-900 border-r border-slate-800 flex flex-col h-dvh',
        'transition-all duration-300 ease-in-out md:translate-x-0',
        open ? 'translate-x-0 w-64' : '-translate-x-full md:w-56',
        !open && isCollapsed ? 'md:w-[68px]' : 'md:w-56'
      ].join(' ')}>

        <div className={`p-4 border-b border-slate-800 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed ? (
            <Link href="/" className="flex items-center gap-2" onClick={close}>
              <span className="text-cyan-400 font-bold text-lg">DevOps</span>
              <span className="text-slate-400 font-bold text-lg">KB</span>
            </Link>
          ) : (
             <Link href="/" className="flex items-center justify-center font-bold text-cyan-400 text-lg" onClick={close}>
               D
             </Link>
          )}

          <button
            className="hidden md:flex text-slate-500 hover:text-slate-300 p-1 transition-colors rounded hover:bg-slate-800"
            onClick={toggleCollapse}
            aria-label="Toggle Sidebar"
          >
            {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </button>

          <button
            className="md:hidden text-slate-500 hover:text-white p-1 transition-colors"
            onClick={close}
            aria-label="Cerrar menú"
          >
            <XIcon />
          </button>
        </div>

        <nav className="p-3 flex-1 overflow-y-auto overflow-x-hidden">
          {!isCollapsed && <p className="text-xs text-slate-600 uppercase tracking-wider mb-2 px-2">Tecnologías</p>}
          {navContent}

          {!isCollapsed ? (
            <p className="text-xs text-slate-600 uppercase tracking-wider mt-5 mb-2 px-2">Herramientas</p>
          ) : (
            <div className="border-t border-slate-800 my-3 mx-2"></div>
          )}
          
          <Link
            href="/tools"
            onClick={close}
            title="Herramientas"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm mb-1 transition-colors ${
              activeToolSlug === 'tools' || (typeof window !== 'undefined' && window.location.pathname === '/tools')
                ? 'bg-cyan-900/50 text-cyan-300 font-medium'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            } ${isCollapsed ? 'justify-center px-0' : ''}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={isCollapsed ? 18 : 15} height={isCollapsed ? 18 : 15}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0 }}
            >
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            {!isCollapsed && <span>Dashboard Herramientas</span>}
          </Link>
        </nav>

        {isCollapsed ? (
           <div className="p-4 border-t border-slate-800 flex justify-center pb-[max(1rem,env(safe-area-inset-bottom))]">
             <button title="Info de WiresOps" className="text-slate-500 hover:text-cyan-400 transition-colors">
               <InfoIcon />
             </button>
           </div>
        ) : (
          <div className="p-4 border-t border-slate-800 space-y-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <p className="text-xs text-slate-600">Tu wiki DevOps</p>
            <a
              href="https://github.com/alan25593/devopskb"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-700 hover:text-cyan-400 transition-colors"
            >100% local · sin internet ↗</a>
            <p className="text-xs text-slate-600">
              Creado por <a
                href="https://www.linkedin.com/in/alan-lampert/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-500 hover:text-cyan-400 transition-colors"
              >Alan Lampert ↗</a>
            </p>
            <a href="https://cafecito.app/tudevopsjr" rel="noopener" target="_blank" className="block mt-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                srcSet="https://cdn.cafecito.app/imgs/buttons/button_4.png 1x, https://cdn.cafecito.app/imgs/buttons/button_4_2x.png 2x, https://cdn.cafecito.app/imgs/buttons/button_4_3.75x.png 3.75x"
                src="https://cdn.cafecito.app/imgs/buttons/button_4.png"
                alt="Invitame un café en cafecito.app"
                className="h-8 w-auto max-w-full"
              />
            </a>
            <p className="text-xs text-slate-600 pt-3">
              © 2026 <a href="https://wiresops.com" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">WiresOps LLC</a>.<br />Todos los derechos reservados.
            </p>
          </div>
        )}
      </aside>
    </>
  )
}
