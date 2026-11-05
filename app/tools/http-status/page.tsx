import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import HttpStatusExplorer from '@/components/tools/HttpStatusExplorer'
import ToolSchema from '@/components/ToolSchema'
import LearnMore from '@/components/LearnMore'
import { getToolArticles } from '@/lib/content'
import type { Metadata } from 'next'
import { SHARE_IMAGE } from '@/lib/seo'

const TITLE = 'HTTP Status Codes & Cloudflare Error Reference (502, 504, 520–526)'
const DESCRIPTION = 'Guía interactiva de códigos de estado HTTP (2xx a 5xx) y errores específicos de Cloudflare y Nginx (499, 520, 521, 522, 524, 525, 526) con causas reales en Kubernetes/Docker y cómo solucionarlos.'
const PATH = '/tools/http-status/'

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

export default function HttpStatusPage() {
  const relatedArticles = getToolArticles('http-status')

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar mode="link" activeCategory={null} activeToolSlug="http-status" />
      <ToolSchema name="HTTP Status & Cloudflare Error Explorer" description={DESCRIPTION} url={PATH} />

      <main id="main-content" tabIndex={-1} className="flex-1 overflow-auto">
        <div className="pt-14 px-4 pb-6 md:p-6 max-w-5xl mx-auto">
          <nav aria-label="Ruta de navegación" className="mb-6">
            <ol className="flex items-center gap-1.5 text-sm text-gray-600 flex-wrap">
              <li><Link href="/" className="hover:text-green-400 transition-colors">Inicio</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/tools" className="hover:text-green-400 transition-colors">Herramientas</Link></li>
              <li aria-hidden="true">/</li>
              <li className="text-gray-400">HTTP & Cloudflare Status</li>
            </ol>
          </nav>

          <header className="mb-8">
            <h1 className="text-2xl font-bold text-gray-100 mb-2">HTTP Status & Cloudflare / Nginx Error Explorer</h1>
            <p className="text-gray-400 text-sm">
              Referencia rápida orientada a SRE y DevOps: qué significa cada código HTTP (<code className="text-gray-300">2xx</code>–<code className="text-gray-300">5xx</code>) y los códigos propios de Cloudflare (<code className="text-gray-300">520</code>–<code className="text-gray-300">526</code>) y Nginx (<code className="text-gray-300">499</code>), por qué ocurren en tus contenedores o Ingress y cómo destrabarlos.
            </p>
          </header>

          <HttpStatusExplorer />
          <LearnMore articles={relatedArticles} />
        </div>
      </main>
    </div>
  )
}
