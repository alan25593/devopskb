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

  const { results, isFuzzy } = useMemo(() => {
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

    return { results: filtered, isFuzzy: fuzzy }
  }, [query, activeCategory, articles, index])

  const isFiltering = query.length > 0 || activeCategory !== null

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-950">
      <Sidebar
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        mode="filter"
      />

      <main className="flex-1 overflow-auto relative">
        <div className={`mx-auto transition-all duration-300 ${isFiltering ? 'pt-14 px-4 pb-6 md:p-6 max-w-3xl' : 'pt-16 md:pt-24 px-4 pb-12 max-w-5xl'}`}>

          {!isFiltering && (
            <header className="mb-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
              <h1 className="text-4xl md:text-5xl font-bold text-slate-50 mb-4 tracking-tight">
                DevOps <span className="text-cyan-400">KB</span>
              </h1>
              <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto">
                Herramientas esenciales, comandos y guías para SREs y DevOps.
              </p>
            </header>
          )}

          <div className={`relative transition-all duration-500 z-20 ${isFiltering ? 'mb-4' : 'max-w-2xl mx-auto mb-16'}`}>
            <input
              ref={inputRef}
              type="text"
              placeholder='Buscar comandos, artículos o herramientas...'
              value={query}
              onChange={e => setQuery(e.target.value)}
              className={`w-full bg-slate-900/50 backdrop-blur-md border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 font-mono transition-all shadow-xl shadow-black/20 ${isFiltering ? 'rounded-lg px-4 py-3 pr-20 text-sm' : 'rounded-2xl px-6 py-4 md:py-5 pr-24 text-base md:text-lg hover:bg-slate-900/80'}`}
              autoFocus
            />
            <kbd className={`hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 items-center gap-1 text-xs text-slate-500 bg-slate-800 border border-slate-700 rounded px-2 py-1 font-mono pointer-events-none select-none transition-opacity ${isFiltering ? 'opacity-100' : 'opacity-70'}`}>
              Ctrl K
            </kbd>
          </div>

          {!isFiltering && (
            <div className="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">
              
              <section>
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-500"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                  Quick Access
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                  {[
                    { name: 'Password Generator', path: '/tools/password', icon: <><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></> },
                    { name: 'JWT Decoder', path: '/tools/jwt', icon: <><path d="M15 7a2 2 0 0 1 2 2m4 0a6 6 0 0 1-7.743 5.743L11 17H9v2H7v2H4a1 1 0 0 1-1-1v-2.586a1 1 0 0 1 .293-.707l5.964-5.964A6 6 0 1 1 21 9z"></path></> },
                    { name: 'Subnet Calculator', path: '/tools/subnet', icon: <><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"></path></> },
                    { name: 'JSON Formatter', path: '/tools/json', icon: <><path d="M4 6h16M4 12h16M4 18h7"></path></> }
                  ].map(tool => (
                    <Link key={tool.path} href={tool.path} className="group relative overflow-hidden bg-slate-900/40 backdrop-blur-sm border border-slate-800 rounded-xl p-4 hover:border-cyan-500/50 hover:bg-slate-800/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-cyan-900/20 flex items-center md:items-start md:flex-col gap-3 md:gap-0">
                      <div className="text-cyan-400 md:mb-3 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300 transform origin-left shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          {tool.icon}
                        </svg>
                      </div>
                      <h3 className="text-sm font-medium text-slate-200 group-hover:text-cyan-300 transition-colors">{tool.name}</h3>
                    </Link>
                  ))}
                </div>
              </section>

              <section>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2 sm:gap-0">
                  <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                    Explorar por Tecnología
                  </h2>
                  <span className="text-xs text-slate-500">{articles.length} artículos</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className="group flex flex-col items-center justify-center gap-3 bg-slate-900/30 backdrop-blur-sm border border-slate-800 rounded-2xl p-5 hover:border-emerald-500/50 hover:bg-slate-800/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-900/10"
                    >
                      <svg role="img" viewBox="0 0 24 24" width="28" height="28" fill={`#${cat.hex}`} className="opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300">
                        <path d={cat.svgPath} />
                      </svg>
                      <span className="text-xs font-medium text-slate-300 group-hover:text-emerald-300 transition-colors">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  Últimos Artículos
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {articles.slice(0, 4).map(article => (
                    <Link
                      key={`${article.category}/${article.slug}`}
                      href={`/article/${article.category}/${article.slug}/`}
                      className="block bg-slate-900/30 backdrop-blur-sm border border-slate-800 rounded-xl p-4 hover:border-purple-500/40 hover:bg-slate-800/40 transition-all duration-300 group"
                    >
                      <div className="flex items-center gap-2 mb-2 min-w-0">
                        <CategoryTag category={article.category} />
                        <span className="font-medium text-slate-200 group-hover:text-purple-300 truncate transition-colors flex-1 min-w-0">
                          {article.title}
                        </span>
                      </div>
                      <p className="text-slate-500 text-sm leading-relaxed line-clamp-2">
                        {article.description}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>

            </div>
          )}

          {isFiltering && (
            <div className="animate-in fade-in duration-300">
              <div className="flex flex-wrap gap-2 mb-4">
                {CATEGORIES.map(cat => {
                  const isActive = activeCategory === cat.id
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(isActive ? null : cat.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        isActive
                          ? 'bg-cyan-900/30 border-cyan-700/50 text-cyan-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                      }`}
                    >
                      <svg role="img" viewBox="0 0 24 24" width="12" height="12" fill={`#${cat.hex}`} aria-hidden="true" className={isActive ? '' : 'opacity-70'}>
                        <path d={cat.svgPath} />
                      </svg>
                      {cat.label}
                    </button>
                  )
                })}
                {activeCategory && (
                  <button
                    onClick={() => setActiveCategory(null)}
                    className="px-3 py-1.5 rounded-full text-xs border border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700 transition-colors"
                  >
                    × limpiar
                  </button>
                )}
              </div>

              {query && (
                <p className="text-xs text-slate-500 mb-4 flex items-center gap-2">
                  <span>
                    {results.length} resultado{results.length !== 1 ? 's' : ''}
                    {activeCategory ? ` en ${activeCategory}` : ''}
                  </span>
                  {isFuzzy && results.length > 0 && (
                    <span className="text-amber-500/70 bg-amber-950/30 border border-amber-900/50 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
                      búsqueda aproximada
                    </span>
                  )}
                </p>
              )}

              <div className="space-y-3">
                {results.length === 0 && query && (
                  <div className="text-center py-16 bg-slate-900/20 rounded-xl border border-slate-800/50 border-dashed">
                    <p className="text-slate-400 text-sm">Sin resultados para <span className="text-slate-300 font-medium">"{query}"</span></p>
                    <p className="text-slate-600 text-xs mt-2">
                      {query.trim().split(/\s+/).some(w => w.length < 2)
                        ? 'Usá palabras de al menos 2 caracteres'
                        : 'Probá con otras palabras clave'}
                    </p>
                  </div>
                )}

                {results.length === 0 && !query && activeCategory && (
                  <div className="text-center py-16 bg-slate-900/20 rounded-xl border border-slate-800/50 border-dashed">
                    <p className="text-slate-500 text-sm">No hay artículos en esta categoría.</p>
                  </div>
                )}

                {results.map(article => (
                  <Link
                    key={`${article.category}/${article.slug}`}
                    href={`/article/${article.category}/${article.slug}/`}
                    className="block bg-slate-900/40 backdrop-blur-sm border border-slate-800 rounded-xl p-4 hover:border-cyan-700/50 hover:bg-slate-800/60 transition-all duration-300 group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <CategoryTag category={article.category} />
                      <span className="font-medium text-slate-200 group-hover:text-cyan-300 truncate transition-colors">
                        {article.title}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed line-clamp-2 mb-3">
                      {article.description}
                    </p>
                    {article.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {article.keywords.slice(0, 3).map(kw => (
                          <span key={kw} className="text-[10px] text-slate-500 bg-slate-950/50 border border-slate-800/80 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
