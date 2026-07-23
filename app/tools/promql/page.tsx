import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import PromqlBuilder from '@/components/tools/PromqlBuilder'
import ToolSchema from '@/components/ToolSchema'
import LearnMore from '@/components/LearnMore'
import { getArticle } from '@/lib/content'
import type { Metadata } from 'next'

const TITLE = 'PromQL Builder | WiresOps'
const DESCRIPTION = 'Construí consultas PromQL complejas de forma visual paso a paso sin pelear con la sintaxis.'
const PATH = '/tools/promql/'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: PATH,
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: TITLE,
    description: DESCRIPTION,
  }
}

export default function PromqlPage() {
  const relatedArticles = [
    getArticle('kubernetes', '07-escalado-y-scheduling'),
    getArticle('kubernetes', '09-troubleshooting'),
  ].filter(Boolean) as any[]

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar mode="link" activeCategory={null} activeToolSlug="promql" />
      <ToolSchema name="PromQL Builder" description={DESCRIPTION} url={PATH} />

      <main className="flex-1 overflow-auto">
        <div className="pt-14 px-4 pb-6 md:p-6 max-w-5xl mx-auto">
          <nav aria-label="Ruta de navegación" className="mb-6">
            <ol className="flex items-center gap-1.5 text-sm text-gray-600 flex-wrap">
              <li><Link href="/" className="hover:text-green-400 transition-colors">Inicio</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/tools" className="hover:text-green-400 transition-colors">Herramientas</Link></li>
              <li aria-hidden="true">/</li>
              <li className="text-gray-400">PromQL Builder</li>
            </ol>
          </nav>

          <header className="mb-8">
            <h1 className="text-2xl font-bold text-gray-100 mb-2">PromQL Builder</h1>
            <p className="text-gray-400 text-sm">
              No vuelvas a pelear con la sintaxis de Prometheus. Seleccioná tu métrica, aplicá filtros, elegí funciones de tiempo y agregaciones, y el constructor armará la query perfecta por vos.
            </p>
          </header>

          <PromqlBuilder />
          <LearnMore articles={relatedArticles} />
        </div>
      </main>
    </div>
  )
}
