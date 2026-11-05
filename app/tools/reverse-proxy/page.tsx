import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import ReverseProxyBuilder from '@/components/tools/ReverseProxyBuilder'
import ToolSchema from '@/components/ToolSchema'
import LearnMore from '@/components/LearnMore'
import { getToolArticles } from '@/lib/content'
import type { Metadata } from 'next'
import { SHARE_IMAGE } from '@/lib/seo'

const TITLE = 'Nginx, Traefik & Caddy Reverse Proxy Config Generator'
const DESCRIPTION = 'Generador visual de bloques server {} de Nginx, labels de Traefik para Docker Compose y Caddyfile con soporte para SSL, WebSockets, HSTS y Rate Limiting.'
const PATH = '/tools/reverse-proxy/'

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

export default function ReverseProxyPage() {
  const relatedArticles = getToolArticles('reverse-proxy')

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar mode="link" activeCategory={null} activeToolSlug="reverse-proxy" />
      <ToolSchema name="Reverse Proxy Config Generator" description={DESCRIPTION} url={PATH} />

      <main id="main-content" tabIndex={-1} className="flex-1 overflow-auto">
        <div className="pt-14 px-4 pb-6 md:p-6 max-w-5xl mx-auto">
          <nav aria-label="Ruta de navegación" className="mb-6">
            <ol className="flex items-center gap-1.5 text-sm text-gray-600 flex-wrap">
              <li><Link href="/" className="hover:text-green-400 transition-colors">Inicio</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/tools" className="hover:text-green-400 transition-colors">Herramientas</Link></li>
              <li aria-hidden="true">/</li>
              <li className="text-gray-400">Reverse Proxy Builder</li>
            </ol>
          </nav>

          <header className="mb-8">
            <h1 className="text-2xl font-bold text-gray-100 mb-2">Generador de Reverse Proxy (Nginx, Traefik & Caddy)</h1>
            <p className="text-gray-400 text-sm">
              Armá configuraciones listas para producción con TLS 1.3, redirección HTTPS, soporte para WebSockets, headers de seguridad y límites de subida en un par de clics.
            </p>
          </header>

          <ReverseProxyBuilder />
          <LearnMore articles={relatedArticles} />
        </div>
      </main>
    </div>
  )
}
