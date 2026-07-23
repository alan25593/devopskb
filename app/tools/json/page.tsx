import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import JsonFormatter from '@/components/tools/JsonFormatter'
import ToolSchema from '@/components/ToolSchema'
import LearnMore from '@/components/LearnMore'
import { getArticle } from '@/lib/content'
import type { Metadata } from 'next'

const TITLE = 'JSON Formatter | WiresOps'
const DESCRIPTION = 'Formateador y minificador de JSON. Pegá JSON minificado y expandilo al instante con indentación limpia. Detecta errores con línea y columna exactas.'
const PATH = '/tools/json/'

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

export default function JsonPage() {
  const relatedArticles = [
    getArticle('linux', '03-procesamiento-de-texto'),
    getArticle('kubernetes', '02-kubectl'),
  ].filter(Boolean) as any[]

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar mode="link" activeCategory={null} activeToolSlug="json" />
      <ToolSchema name="JSON Formatter" description={DESCRIPTION} url={PATH} />

      <main className="flex-1 overflow-auto">
        <div className="pt-14 px-4 pb-6 md:p-6 max-w-3xl mx-auto">

          <nav aria-label="Ruta de navegación" className="mb-6">
            <ol className="flex items-center gap-1.5 text-sm text-gray-600 flex-wrap">
              <li><Link href="/" className="hover:text-green-400 transition-colors">Inicio</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/tools" className="hover:text-green-400 transition-colors">Herramientas</Link></li>
              <li aria-hidden="true">/</li>
              <li className="text-gray-400">JSON Formatter</li>
            </ol>
          </nav>

          <header className="mb-8">
            <h1 className="text-2xl font-bold text-gray-100 mb-2">JSON Formatter</h1>
            <p className="text-gray-400 text-sm">
              Pegá JSON minificado o desordenado y expandilo con indentación limpia. También minifica para copiar en una línea. Al pegar se formatea automáticamente.
            </p>
          </header>

          <JsonFormatter />
          <LearnMore articles={relatedArticles} />
        </div>
      </main>
    </div>
  )
}
