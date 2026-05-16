'use client'

import { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { Article } from '@/lib/content'
import Sidebar from './Sidebar'
import CategoryTag from './CategoryTag'

// FlexSearch types are loose — cast to any where needed
// eslint-disable-next-line @typescript-eslint/no-require-imports
const _flexsearch = require('flexsearch')
// webpack may resolve the ESM bundle (default export) or CJS bundle (named exports)
const FlexDocument = _flexsearch.Document ?? _flexsearch.default?.Document

interface SearchPageProps {
  articles: Article[]
}

function SearchPageInner({ articles }: SearchPageProps) {
  const searchParams = useSearchParams()
  const initialCat = searchParams.get('cat')

  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(initialCat)
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

  // Build FlexSearch Document index once
  const index = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const idx = new FlexDocument({
      document: {
        id: 'id',
        index: [
          { field: 'keywords',    tokenize: 'strict', resolution: 9 },
          { field: 'title',       tokenize: 'strict', resolution: 8 },
          { field: 'category',    tokenize: 'strict', resolution: 7 },
          { field: 'description', tokenize: 'strict', resolution: 5 },
          { field: 'content',     tokenize: 'strict', resolution: 2 },
        ],
      },
    })

    articles.forEach((article, i) => {
      idx.add({
        id: i,
        title: article.title,
        category: article.category,
        keywords: article.keywords.join(' '),
        description: article.description,
        content: article.content,
      })
    })

    return idx
  }, [articles])

  const results = useMemo(() => {
    let filtered = articles

    const trimmed = query.trim()
    if (trimmed.length > 0) {
      const words = trimmed.split(/\s+/)

      // AND logic: each word must appear in the article
      let matchIds: Set<number> | null = null

      for (const word of words) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw: any[] = index.search(word, { limit: articles.length })
        const wordIds = new Set<number>()
        raw.forEach((fieldResult: { result: number[] }) => {
          fieldResult.result.forEach((id: number) => wordIds.add(id))
        })

        if (matchIds === null) {
          matchIds = wordIds
        } else {
          for (const id of [...matchIds]) {
            if (!wordIds.has(id)) matchIds.delete(id)
          }
        }
      }

      filtered = matchIds
        ? Array.from(matchIds).map(id => articles[id]).filter(Boolean)
        : []
    }

    if (activeCategory) {
      filtered = filtered.filter(a => a.category === activeCategory)
    }

    return filtered
  }, [query, activeCategory, articles, index])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        mode="filter"
      />

      <main className="flex-1 overflow-auto">
        <div className="pt-14 px-4 pb-6 md:p-6 max-w-3xl mx-auto">
          <div className="mb-6">
            <div className="relative">
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
            {query && (
              <p className="text-xs text-gray-600 mt-2">
                {results.length} resultado{results.length !== 1 ? 's' : ''}
                {activeCategory ? ` en ${activeCategory}` : ''}
              </p>
            )}
          </div>


          <div className="space-y-2">
            {results.length === 0 && query && (
              <div className="text-center py-16">
                <p className="text-gray-600 text-sm">Sin resultados para <span className="text-gray-400">"{query}"</span></p>
                <p className="text-gray-700 text-xs mt-2">Probá con otras palabras clave</p>
              </div>
            )}

            {results.length === 0 && !query && (
              <div className="text-center py-16">
                <p className="text-gray-700 text-sm">No hay artículos cargados aún.</p>
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

export default function SearchPage(props: SearchPageProps) {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-gray-600">Cargando...</div>}>
      <SearchPageInner {...props} />
    </Suspense>
  )
}
