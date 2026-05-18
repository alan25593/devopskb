'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import type { SearchArticle } from '@/lib/content'
import { CATEGORIES } from '@/lib/categories'
import Sidebar from './Sidebar'
import CategoryTag from './CategoryTag'

// FlexSearch types are loose — cast to any where needed
// eslint-disable-next-line @typescript-eslint/no-require-imports
const _flexsearch = require('flexsearch')
// webpack may resolve the ESM bundle (default export) or CJS bundle (named exports)
const FlexDocument = _flexsearch.Document ?? _flexsearch.default?.Document

interface SearchPageProps {
  articles: SearchArticle[]
}

export default function SearchPage({ articles }: SearchPageProps) {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return new URLSearchParams(window.location.search).get('cat')
  })
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Build FlexSearch Document index once from metadata only (no full content)
  const index = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const idx = new FlexDocument({
      document: {
        id: 'id',
        index: [
          { field: 'keywords',    tokenize: 'forward', resolution: 9 },
          { field: 'tags',        tokenize: 'forward', resolution: 8 },
          { field: 'title',       tokenize: 'forward', resolution: 8 },
          { field: 'category',    tokenize: 'forward', resolution: 7 },
          { field: 'description', tokenize: 'forward', resolution: 5 },
        ],
      },
    })

    articles.forEach((article, i) => {
      idx.add({
        id: i,
        title: article.title,
        category: article.category,
        tags: article.tags.join(' '),
        keywords: article.keywords.join(' '),
        description: article.description,
      })
    })

    return idx
  }, [articles])

  const [isFuzzy, setIsFuzzy] = useState(false)

  const results = useMemo(() => {
    let filtered = articles
    let fuzzy = false

    const trimmed = query.trim()
    if (trimmed.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const searchWord = (word: string, opts: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw: any[] = index.search(word, opts)
        const ids = new Set<number>()
        raw.forEach((f: { result: number[] }) => f.result.forEach(id => ids.add(id)))
        return ids
      }

      const words = trimmed.split(/\s+/).filter(w => w.length >= 2)
      if (words.length === 0) {
        filtered = articles
      } else {
        // Primary: AND logic — each word must appear (prefix match)
        let matchIds: Set<number> | null = null
        for (const word of words) {
          const ids = searchWord(word, { limit: articles.length })
          matchIds = matchIds === null ? ids : new Set([...matchIds].filter((id: number) => ids.has(id)))
        }

        if (!matchIds || matchIds.size === 0) {
          // Fallback: OR logic with FlexSearch suggest — any word match
          fuzzy = true
          const allIds = new Set<number>()
          for (const word of words) {
            searchWord(word, { limit: articles.length, suggest: true })
              .forEach(id => allIds.add(id))
          }
          filtered = Array.from(allIds).map(id => articles[id]).filter(Boolean)
        } else {
          filtered = Array.from(matchIds).map(id => articles[id]).filter(Boolean)
        }
      }
    }

    if (activeCategory) {
      filtered = filtered.filter(a => a.category === activeCategory)
    }

    setIsFuzzy(fuzzy)
    return filtered
  }, [query, activeCategory, articles, index])

  const isFiltering = query.length > 0 || activeCategory !== null

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        mode="filter"
      />

      <main className="flex-1 overflow-auto">
        <div className="pt-14 px-4 pb-6 md:p-6 max-w-3xl mx-auto">

          {!isFiltering && (
            <header className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-gray-100 mb-2">
                DevOps <span className="text-green-400">KB</span>
              </h1>
              <p className="text-gray-400 text-sm leading-relaxed">
                Comandos, snippets y guías para Docker, Kubernetes, Terraform, Linux, Git y Windows.
              </p>
              <p className="text-xs text-gray-600 mt-2">
                {articles.length} artículos · {CATEGORIES.length} tecnologías · snippets listos para copiar
              </p>
            </header>
          )}

          <div className="mb-4">
            <div className="relative mb-3">
              <input
                ref={inputRef}
                type="text"
                placeholder='Buscar... (ej: "forzar git push", "borrar contenedores y volumen")'
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 pr-20 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 font-mono text-sm"
                autoFocus
              />
              <kbd className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 items-center gap-1 text-xs text-gray-600 bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 font-mono pointer-events-none select-none">
                Ctrl K
              </kbd>
            </div>

            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => {
                const isActive = activeCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(isActive ? null : cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      isActive
                        ? 'bg-green-900/50 border-green-700 text-green-300'
                        : 'bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'
                    }`}
                  >
                    <svg role="img" viewBox="0 0 24 24" width="11" height="11" fill={`#${cat.hex}`} aria-hidden="true">
                      <path d={cat.svgPath} />
                    </svg>
                    {cat.label}
                  </button>
                )
              })}
              {activeCategory && (
                <button
                  onClick={() => setActiveCategory(null)}
                  className="px-3 py-1 rounded-full text-xs border border-gray-800 text-gray-600 hover:text-gray-400 transition-colors"
                >
                  × limpiar
                </button>
              )}
            </div>

            {query && (
              <p className="text-xs text-gray-600 mt-2 flex items-center gap-2">
                <span>
                  {results.length} resultado{results.length !== 1 ? 's' : ''}
                  {activeCategory ? ` en ${activeCategory}` : ''}
                </span>
                {isFuzzy && results.length > 0 && (
                  <span className="text-yellow-600/70 border border-yellow-700/40 rounded px-1.5 py-0.5 text-xs">
                    búsqueda aproximada
                  </span>
                )}
              </p>
            )}
          </div>

          <div className="space-y-2">
            {results.length === 0 && query && (
              <div className="text-center py-16">
                <p className="text-gray-600 text-sm">Sin resultados para <span className="text-gray-400">"{query}"</span></p>
                <p className="text-gray-700 text-xs mt-2">
                  {query.trim().split(/\s+/).some(w => w.length < 2)
                    ? 'Usá palabras de al menos 2 caracteres'
                    : 'Probá con otras palabras clave'}
                </p>
              </div>
            )}

            {results.length === 0 && !query && activeCategory && (
              <div className="text-center py-16">
                <p className="text-gray-700 text-sm">No hay artículos en esta categoría.</p>
              </div>
            )}

            {results.map(article => (
              <Link
                key={`${article.category}/${article.slug}`}
                href={`/article/${article.category}/${article.slug}/`}
                className="block bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-green-700 hover:bg-gray-800/50 transition-colors group"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <CategoryTag category={article.category} />
                  <span className="font-medium text-gray-100 group-hover:text-white truncate">
                    {article.title}
                  </span>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed line-clamp-2">
                  {article.description}
                </p>
                {article.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {article.keywords.slice(0, 3).map(kw => (
                      <span key={kw} className="text-xs text-gray-400 bg-gray-800 border border-gray-700 px-1.5 py-0.5 rounded">
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
