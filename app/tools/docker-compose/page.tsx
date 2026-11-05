import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import DockerConverter from '@/components/tools/DockerConverter'
import ToolSchema from '@/components/ToolSchema'
import LearnMore from '@/components/LearnMore'
import { getToolArticles } from '@/lib/content'
import type { Metadata } from 'next'
import { SHARE_IMAGE } from '@/lib/seo'

const TITLE = 'Docker Run ⇄ Docker Compose Converter'
const DESCRIPTION = 'Convertí comandos docker run a archivos docker-compose.yml limpios (con volúmenes, redes, puertos y límites de recursos) y viceversa al instante.'
const PATH = '/tools/docker-compose/'

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

export default function DockerComposePage() {
  const relatedArticles = getToolArticles('docker-compose')

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar mode="link" activeCategory={null} activeToolSlug="docker-compose" />
      <ToolSchema name="Docker Run to Docker Compose Converter" description={DESCRIPTION} url={PATH} />

      <main id="main-content" tabIndex={-1} className="flex-1 overflow-auto">
        <div className="pt-14 px-4 pb-6 md:p-6 max-w-5xl mx-auto">
          <nav aria-label="Ruta de navegación" className="mb-6">
            <ol className="flex items-center gap-1.5 text-sm text-gray-600 flex-wrap">
              <li><Link href="/" className="hover:text-green-400 transition-colors">Inicio</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/tools" className="hover:text-green-400 transition-colors">Herramientas</Link></li>
              <li aria-hidden="true">/</li>
              <li className="text-gray-400">Docker Run ⇄ Compose</li>
            </ol>
          </nav>

          <header className="mb-8">
            <h1 className="text-2xl font-bold text-gray-100 mb-2">Docker Run ⇄ Docker Compose Converter</h1>
            <p className="text-gray-400 text-sm">
              Transformá cualquier one-liner de <code className="text-gray-300">docker run</code> en un manifiesto <code className="text-gray-300">docker-compose.yml</code> listo para producción (detectando automáticamente volúmenes nombrados, redes externas y límites de CPU/RAM) o extraé los comandos desde un Compose existente.
            </p>
          </header>

          <DockerConverter />
          <LearnMore articles={relatedArticles} />
        </div>
      </main>
    </div>
  )
}
