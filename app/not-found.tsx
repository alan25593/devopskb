import Link from 'next/link'
import type { Metadata } from 'next'
import Sidebar from '@/components/Sidebar'
import { CATEGORIES } from '@/lib/categories'
import { TOOLS } from '@/lib/tools'

export const metadata: Metadata = {
  title: 'Página no encontrada',
  description: 'La página que buscás no existe o cambió de dirección. Buscá en la base de conocimiento o elegí una tecnología.',
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar mode="link" activeCategory={null} />

      <main id="main-content" tabIndex={-1} className="flex-1 overflow-auto">
        <div className="pt-16 md:pt-24 px-4 pb-12 max-w-3xl mx-auto">
          <p className="font-mono text-sm text-cyan-400 mb-3">404</p>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-100 mb-4">Esta página no existe</h1>
          <p className="text-slate-400 text-lg leading-relaxed mb-8">
            Puede que el artículo haya cambiado de dirección. Buscalo por tema o comando:
          </p>

          <form action="/" method="get" className="mb-12" role="search">
            <label htmlFor="notfound-search" className="sr-only">Buscar en la base de conocimiento</label>
            <input
              id="notfound-search"
              name="q"
              type="search"
              autoFocus
              placeholder="Ej: liberar job colgado, rotar logs, terraform state"
              className="w-full bg-slate-900/60 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl px-5 py-4 font-mono focus:outline-none focus-visible:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-500/40"
            />
          </form>

          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">Tecnologías</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
            {CATEGORIES.map(cat => (
              <Link
                key={cat.id}
                href={`/category/${cat.id}/`}
                className="flex items-center gap-2.5 bg-slate-900/40 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-300 hover:border-cyan-500/50 hover:text-cyan-300 transition-colors"
              >
                <svg role="img" viewBox="0 0 24 24" width="18" height="18" fill={`#${cat.hex}`} aria-hidden="true">
                  <path d={cat.svgPath} />
                </svg>
                {cat.label}
              </Link>
            ))}
          </div>

          <p className="text-sm text-slate-400">
            ¿Buscabas una herramienta? Están las {TOOLS.length} en{' '}
            <Link href="/tools/" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">el dashboard de herramientas</Link>.
          </p>
        </div>
      </main>
    </div>
  )
}
