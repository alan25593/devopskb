import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import DiffChecker from '@/components/tools/DiffChecker'
import ToolSchema from '@/components/ToolSchema'
import LearnMore from '@/components/LearnMore'
import { getToolArticles } from '@/lib/content'
import type { Metadata } from 'next'
import { SHARE_IMAGE } from '@/lib/seo'

const TITLE = 'Diff Checker — Comparador de Texto, YAML y Configs'
const DESCRIPTION = 'Compará dos bloques de código, archivos YAML, JSON, .env o salidas de Terraform lado a lado o en vista unificada. 100% en tu navegador sin enviar datos.'
const PATH = '/tools/diff/'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: PATH,
  },
  openGraph: {
    images: [SHARE_IMAGE],
    title: TITLE,
    description: DESCRIPTION,
    url: PATH,
    type: 'website',
  },
  twitter: {
    images: [SHARE_IMAGE],
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
}

export default function DiffPage() {
  const relatedArticles = getToolArticles('diff')

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar mode="link" activeCategory={null} activeToolSlug="diff" />
      <ToolSchema name="Diff Checker" description={DESCRIPTION} url={PATH} />

      <main id="main-content" tabIndex={-1} className="flex-1 overflow-auto">
        <div className="pt-14 px-4 pb-6 md:p-6 max-w-6xl mx-auto">
          <nav aria-label="Ruta de navegación" className="mb-6">
            <ol className="flex items-center gap-1.5 text-sm text-gray-600 flex-wrap">
              <li><Link href="/" className="hover:text-green-400 transition-colors">Inicio</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/tools" className="hover:text-green-400 transition-colors">Herramientas</Link></li>
              <li aria-hidden="true">/</li>
              <li className="text-gray-400">Diff Checker</li>
            </ol>
          </nav>

          <header className="mb-8">
            <h1 className="text-2xl font-bold text-gray-100 mb-2">Diff Checker (Comparador de Configs)</h1>
            <p className="text-gray-400 text-sm">
              Compará manifiestos de Kubernetes, archivos <code className="text-gray-300">.env</code>, JSONs de entornos o código fuente en vista dividida o unificada. Todo se procesa localmente sin subir secretos ni configuraciones a servidores externos.
            </p>
          </header>

          <DiffChecker />
          <LearnMore articles={relatedArticles} />
        </div>
      </main>
    </div>
  )
}
