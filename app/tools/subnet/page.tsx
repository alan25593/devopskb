import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import SubnetCalculator from '@/components/tools/SubnetCalculator'
import ToolSchema from '@/components/ToolSchema'
import LearnMore from '@/components/LearnMore'
import { getArticle } from '@/lib/content'
import type { Metadata } from 'next'

const TITLE = 'Subnet Calculator | WiresOps'
const DESCRIPTION = 'Calculadora de subredes CIDR. Ingresá una dirección IP con prefijo y obtené red, broadcast, rango de hosts, máscara y wildcard de forma 100% local.'
const PATH = '/tools/subnet/'

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

export default function SubnetPage() {
  const relatedArticles = [
    getArticle('linux', '08-redes-y-dns'),
    getArticle('windows', '04-redes-y-firewall'),
  ].filter(Boolean) as any[]

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar mode="link" activeCategory={null} activeToolSlug="subnet" />
      <ToolSchema name="Subnet Calculator" description={DESCRIPTION} url={PATH} />

      <main className="flex-1 overflow-auto">
        <div className="pt-14 px-4 pb-6 md:p-6 max-w-3xl mx-auto">

          <nav aria-label="Ruta de navegación" className="mb-6">
            <ol className="flex items-center gap-1.5 text-sm text-gray-600 flex-wrap">
              <li><Link href="/" className="hover:text-green-400 transition-colors">Inicio</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/tools" className="hover:text-green-400 transition-colors">Herramientas</Link></li>
              <li aria-hidden="true">/</li>
              <li className="text-gray-400">Subnet Calculator</li>
            </ol>
          </nav>

          <header className="mb-8">
            <h1 className="text-2xl font-bold text-gray-100 mb-2">Subnet Calculator</h1>
            <p className="text-gray-400 text-sm">
              Ingresá una dirección IP con prefijo CIDR y calculá automáticamente la dirección de red, broadcast, rango de hosts utilizables, máscara de subred y wildcard.
            </p>
          </header>

          <SubnetCalculator />
          <LearnMore articles={relatedArticles} />
        </div>
      </main>
    </div>
  )
}
