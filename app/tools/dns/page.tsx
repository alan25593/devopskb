import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import DnsToolkit from '@/components/tools/DnsToolkit'
import ToolSchema from '@/components/ToolSchema'
import LearnMore from '@/components/LearnMore'
import { getArticle } from '@/lib/content'
import type { Metadata } from 'next'

const TITLE = 'DNS Toolkit | WiresOps'
const DESCRIPTION = 'Lookup DNS y Reverse IP. Consulta registros A, AAAA, MX, TXT, CNAME y más en vivo.'
const PATH = '/tools/dns/'

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

export default function DnsPage() {
  const relatedArticles = [
    getArticle('linux', '08-redes-y-dns'),
    getArticle('windows', '04-redes-y-firewall'),
  ].filter(Boolean) as any[]

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar mode="link" activeCategory={null} activeToolSlug="dns" />
      <ToolSchema name="DNS Toolkit" description={DESCRIPTION} url={PATH} />

      <main className="flex-1 overflow-auto">
        <div className="pt-14 px-4 pb-6 md:p-6 max-w-3xl mx-auto">
          <nav aria-label="Ruta de navegación" className="mb-6">
            <ol className="flex items-center gap-1.5 text-sm text-gray-600 flex-wrap">
              <li><Link href="/" className="hover:text-green-400 transition-colors">Inicio</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/tools" className="hover:text-green-400 transition-colors">Herramientas</Link></li>
              <li aria-hidden="true">/</li>
              <li className="text-gray-400">DNS Toolkit</li>
            </ol>
          </nav>

          <header className="mb-8">
            <h1 className="text-2xl font-bold text-gray-100 mb-2">DNS Toolkit</h1>
            <p className="text-gray-400 text-sm">
              Ejecutá consultas DNS directamente contra los servidores raíz configurados en la plataforma. Soporta registros A, AAAA, MX, TXT, NS y Reverse Lookup para IPs.
            </p>
          </header>

          <DnsToolkit />
          <LearnMore articles={relatedArticles} />
        </div>
      </main>
    </div>
  )
}
