import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import ConfigConverter from '@/components/tools/ConfigConverter'
import ToolSchema from '@/components/ToolSchema'
import LearnMore from '@/components/LearnMore'
import { getToolArticles } from '@/lib/content'
import type { Metadata } from 'next'
import { SHARE_IMAGE } from '@/lib/seo'

const TITLE = 'Config Converter — YAML ⇄ JSON ⇄ .env ⇄ TOML ⇄ K8s env'
const DESCRIPTION = 'Convertí archivos de configuración al instante entre YAML, JSON, .env (Dotenv), TOML y bloques env: para Pods de Kubernetes.'
const PATH = '/tools/config-converter/'

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

export default function ConfigConverterPage() {
  const relatedArticles = getToolArticles('config-converter')

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar mode="link" activeCategory={null} activeToolSlug="config-converter" />
      <ToolSchema name="Config Format Converter" description={DESCRIPTION} url={PATH} />

      <main id="main-content" tabIndex={-1} className="flex-1 overflow-auto">
        <div className="pt-14 px-4 pb-6 md:p-6 max-w-5xl mx-auto">
          <nav aria-label="Ruta de navegación" className="mb-6">
            <ol className="flex items-center gap-1.5 text-sm text-gray-600 flex-wrap">
              <li><Link href="/" className="hover:text-green-400 transition-colors">Inicio</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/tools" className="hover:text-green-400 transition-colors">Herramientas</Link></li>
              <li aria-hidden="true">/</li>
              <li className="text-gray-400">Config Converter</li>
            </ol>
          </nav>

          <header className="mb-8">
            <h1 className="text-2xl font-bold text-gray-100 mb-2">Conversor Universal de Configs (YAML ⇄ JSON ⇄ .env ⇄ TOML)</h1>
            <p className="text-gray-400 text-sm">
              Transformá configuraciones entre YAML, JSON, archivos <code className="text-gray-300">.env</code>, <code className="text-gray-300">config.toml</code> (GitLab Runner / Wrangler) y listas <code className="text-gray-300">env:</code> para manifiestos de Kubernetes sin salir del navegador.
            </p>
          </header>

          <ConfigConverter />
          <LearnMore articles={relatedArticles} />
        </div>
      </main>
    </div>
  )
}
