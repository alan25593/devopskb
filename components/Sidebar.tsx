'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CATEGORIES } from '@/lib/categories'

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

interface NavArticle {
  slug: string
  category: string
  title: string
}

interface SidebarProps {
  activeCategory?: string | null
  activeSlug?: string
  onCategoryChange?: (cat: string | null) => void
  mode?: 'filter' | 'link'
  categoryArticles?: NavArticle[]
}

export default function Sidebar({ activeCategory, activeSlug, onCategoryChange, mode = 'filter', categoryArticles }: SidebarProps) {
  const [open, setOpen] = useState(false)

  const close = () => setOpen(false)

  const navContent = (
    <>
      {mode === 'filter' && onCategoryChange && (
        <button
          onClick={() => { onCategoryChange(null); close() }}
          className={`w-full text-left px-3 py-2 rounded-md text-sm mb-1 transition-colors ${
            !activeCategory
              ? 'bg-green-900/50 text-green-300 font-medium'
              : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
          }`}
        >
          Todos
        </button>
      )}

      {CATEGORIES.map(cat => {
        const isActive = activeCategory === cat.id
        const commonClass = `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm mb-1 transition-colors ${
          isActive
            ? 'bg-green-900/50 text-green-300 font-medium'
            : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
        }`

        if (mode === 'link') {
          return (
            <div key={cat.id}>
              <Link href={`/?cat=${cat.id}`} className={commonClass} onClick={close}>
                <BrandIcon hex={cat.hex} svgPath={cat.svgPath} label={cat.label} />
                <span>{cat.label}</span>
              </Link>
              {isActive && categoryArticles && categoryArticles.length > 0 && (
                <div className="ml-5 mt-0.5 mb-2 border-l border-gray-800 pl-3 space-y-0.5">
                  {categoryArticles.map(a => {
                    const isCurrentArticle = a.slug === activeSlug
                    const shortTitle = a.title.replace(
                      new RegExp(`^(terraform|docker|kubernetes|git)[\\s:—–-]+`, 'i'), ''
                    )
                    return (
                      <Link
                        key={a.slug}
                        href={`/article/${a.category}/${a.slug}/`}
                        onClick={close}
                        title={a.title}
                        className={`block text-xs py-1 px-2 rounded truncate transition-colors ${
                          isCurrentArticle
                            ? 'text-green-400 bg-green-900/20 font-medium'
                            : 'text-gray-600 hover:text-gray-200 hover:bg-gray-800/60'
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
            onClick={() => { onCategoryChange?.(isActive ? null : cat.id); close() }}
            className={`w-full ${commonClass}`}
          >
            <BrandIcon hex={cat.hex} svgPath={cat.svgPath} label={cat.label} />
            <span>{cat.label}</span>
          </button>
        )
      })}
    </>
  )

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="md:hidden fixed top-3 left-3 z-50 p-2 rounded-md bg-gray-900 border border-gray-800 text-gray-400 hover:text-white transition-colors"
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
        'w-64 md:w-56 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col h-screen',
        'transition-transform duration-200 ease-in-out md:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}>

        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" onClick={close}>
            <span className="text-green-400 font-bold text-lg">DevOps</span>
            <span className="text-gray-400 font-bold text-lg">KB</span>
          </Link>
          <button
            className="md:hidden text-gray-500 hover:text-white p-1 transition-colors"
            onClick={close}
            aria-label="Cerrar menú"
          >
            <XIcon />
          </button>
        </div>

        <nav className="p-3 flex-1 overflow-y-auto">
          <p className="text-xs text-gray-600 uppercase tracking-wider mb-2 px-2">Tecnologías</p>
          {navContent}
        </nav>

        <div className="p-4 border-t border-gray-800 space-y-2">
          <p className="text-xs text-gray-600">Tu wiki DevOps</p>
          <p className="text-xs text-gray-700">100% local · sin internet</p>
          <div>
            <p className="text-xs text-gray-600">Creado por</p>
            <a
              href="https://www.linkedin.com/in/alan-lampert/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:text-green-400 transition-colors"
            >
              Alan Lampert ↗
            </a>
          </div>
        </div>
      </aside>
    </>
  )
}
