'use client'

import { useState, useEffect } from 'react'
import { Command } from 'cmdk'
import { useRouter } from 'next/navigation'
import { TOOLS } from '@/lib/tools'
import { CATEGORIES } from '@/lib/categories'
import type { SearchArticle } from '@/lib/content'

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [articles, setArticles] = useState<SearchArticle[]>([])
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  useEffect(() => {
    if (open && articles.length === 0) {
      fetch('/api/search')
        .then(res => res.json())
        .then(data => setArticles(data))
        .catch(console.error)
    }
  }, [open, articles.length])

  const runCommand = (command: () => void) => {
    setOpen(false)
    command()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] sm:pt-[20vh]">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden mx-4">
        <Command label="Global Command Menu" loop className="w-full">
          <div className="flex items-center px-4 border-b border-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 mr-2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <Command.Input 
              autoFocus
              placeholder="Buscar herramienta, tecnología o artículo... (ej: Docker, PromQL, yaml)" 
              className="w-full bg-transparent py-4 outline-none text-gray-100 placeholder:text-gray-500 text-sm md:text-base"
            />
            <div className="hidden sm:flex text-[10px] text-gray-600 bg-gray-800 px-2 py-1 rounded border border-gray-700 items-center gap-1">
              ESC para cerrar
            </div>
          </div>

          <Command.List className="max-h-[50vh] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-gray-500">
              No se encontraron resultados para tu búsqueda.
            </Command.Empty>

            <Command.Group heading="Herramientas (Tools)" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-gray-500 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider">
              {TOOLS.map((tool) => (
                <Command.Item
                  key={`tool-${tool.id}`}
                  onSelect={() => runCommand(() => router.push(tool.href))}
                  className="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-md cursor-pointer data-[selected=true]:bg-green-900/40 data-[selected=true]:text-green-300 text-gray-300 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70"><path d={tool.iconPath}/></svg>
                  <span className="text-sm font-medium">{tool.label}</span>
                </Command.Item>
              ))}
            </Command.Group>

            <div className="h-px bg-gray-800 my-2 mx-2" />

            {articles.length > 0 && (
              <>
                <Command.Group heading="Artículos (Base de Conocimiento)" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-gray-500 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider">
                  {articles.map((article) => (
                    <Command.Item
                      key={`article-${article.category}-${article.slug}`}
                      onSelect={() => runCommand(() => router.push(`/article/${article.category}/${article.slug}`))}
                      className="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-md cursor-pointer data-[selected=true]:bg-green-900/40 data-[selected=true]:text-green-300 text-gray-300 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70 text-gray-400">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                      </svg>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{article.title}</span>
                        <span className="text-[10px] text-gray-500 uppercase">{article.category}</span>
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>
                <div className="h-px bg-gray-800 my-2 mx-2" />
              </>
            )}

            <Command.Group heading="Categorías" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-gray-500 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider">
              {CATEGORIES.map((cat) => (
                <Command.Item
                  key={`cat-${cat.id}`}
                  onSelect={() => runCommand(() => router.push(`/?cat=${cat.id}`))}
                  className="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-md cursor-pointer data-[selected=true]:bg-blue-900/40 data-[selected=true]:text-blue-300 text-gray-300 transition-colors"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill={`#${cat.hex}`} className="opacity-80"><path d={cat.svgPath}/></svg>
                  <span className="text-sm font-medium">{cat.label}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  )
}
