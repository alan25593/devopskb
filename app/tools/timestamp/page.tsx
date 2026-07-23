import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import TimestampConverter from '@/components/tools/TimestampConverter'
import ToolSchema from '@/components/ToolSchema'
import LearnMore from '@/components/LearnMore'
import { getArticle } from '@/lib/content'
import type { Metadata } from 'next'

const TITLE = 'Unix Timestamp Converter | WiresOps'
const DESCRIPTION = 'Convertí timestamps (Epoch, ISO8601, RFC3339) entre UTC y Local. Herramienta para DevOps.'
const PATH = '/tools/timestamp/'

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

export default function TimestampPage() {
  const relatedArticles = [
    getArticle('linux', '02-debugging-y-performance'),
    getArticle('windows', '07-event-logs-y-monitoreo'),
  ].filter(Boolean) as any[]

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar mode="link" activeCategory={null} activeToolSlug="timestamp" />
      <ToolSchema name="Unix Timestamp Converter" description={DESCRIPTION} url={PATH} />

      <main className="flex-1 overflow-auto">
        <div className="pt-14 px-4 pb-6 md:p-6 max-w-3xl mx-auto">
          <nav aria-label="Ruta de navegación" className="mb-6">
            <ol className="flex items-center gap-1.5 text-sm text-gray-600 flex-wrap">
              <li><Link href="/" className="hover:text-green-400 transition-colors">Inicio</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/tools" className="hover:text-green-400 transition-colors">Herramientas</Link></li>
              <li aria-hidden="true">/</li>
              <li className="text-gray-400">Unix Timestamp Converter</li>
            </ol>
          </nav>

          <header className="mb-8">
            <h1 className="text-2xl font-bold text-gray-100 mb-2">Unix Timestamp Converter</h1>
            <p className="text-gray-400 text-sm">
              Convertí fácilmente entre timestamps Epoch, ISO8601 y fechas locales. Ideal para debuggear logs, expiraciones de tokens y bases de datos.
            </p>
          </header>

          <TimestampConverter />
          <LearnMore articles={relatedArticles} />
        </div>
      </main>
    </div>
  )
}
