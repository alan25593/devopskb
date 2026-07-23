import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import CidrVisualizer from '@/components/tools/CidrVisualizer'
import ToolSchema from '@/components/ToolSchema'
import LearnMore from '@/components/LearnMore'
import { getArticle } from '@/lib/content'
import type { Metadata } from 'next'

const TITLE = 'CIDR Visualizer | WiresOps'
const DESCRIPTION = 'Visualizá un bloque de red grande segmentado en subredes más pequeñas de forma jerárquica.'
const PATH = '/tools/cidr/'

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

export default function CidrPage() {
  const relatedArticles = [
    getArticle('linux', '08-redes-y-dns'),
    getArticle('kubernetes', '04-networking'),
  ].filter(Boolean) as any[]

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar mode="link" activeCategory={null} activeToolSlug="cidr" />
      <ToolSchema name="CIDR Visualizer" description={DESCRIPTION} url={PATH} />

      <main className="flex-1 overflow-auto">
        <div className="pt-14 px-4 pb-6 md:p-6 max-w-4xl mx-auto">
          <nav aria-label="Ruta de navegación" className="mb-6">
            <ol className="flex items-center gap-1.5 text-sm text-gray-600 flex-wrap">
              <li><Link href="/" className="hover:text-green-400 transition-colors">Inicio</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/tools" className="hover:text-green-400 transition-colors">Herramientas</Link></li>
              <li aria-hidden="true">/</li>
              <li className="text-gray-400">CIDR Visualizer</li>
            </ol>
          </nav>

          <header className="mb-8">
            <h1 className="text-2xl font-bold text-gray-100 mb-2">CIDR Visualizer</h1>
            <p className="text-gray-400 text-sm">
              ¿Tenés un bloque de red grande (ej. VPC /16) y querés dividirlo en subredes más chicas (ej. /24)? Esta herramienta te genera visualmente todas las subredes resultantes con sus rangos.
            </p>
          </header>

          <CidrVisualizer />
          <LearnMore articles={relatedArticles} />
        </div>
      </main>
    </div>
  )
}
