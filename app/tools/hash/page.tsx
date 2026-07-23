import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import HashToolkit from '@/components/tools/HashToolkit'
import ToolSchema from '@/components/ToolSchema'
import LearnMore from '@/components/LearnMore'
import { getArticle } from '@/lib/content'
import type { Metadata } from 'next'

const TITLE = 'Hash & Base64 Toolkit | WiresOps'
const DESCRIPTION = 'Generá Hashes locales y codificá en Base64/URL. Todo ocurre en el navegador sin enviar datos a servidores.'
const PATH = '/tools/hash/'

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

export default function HashPage() {
  const relatedArticles = [
    getArticle('git', '01-fundamentos-y-flujo'),
    getArticle('linux', '07-seguridad-y-hardening'),
  ].filter(Boolean) as any[]

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar mode="link" activeCategory={null} activeToolSlug="hash" />
      <ToolSchema name="Hash & Base64 Toolkit" description={DESCRIPTION} url={PATH} />

      <main className="flex-1 overflow-auto">
        <div className="pt-14 px-4 pb-6 md:p-6 max-w-3xl mx-auto">
          <nav aria-label="Ruta de navegación" className="mb-6">
            <ol className="flex items-center gap-1.5 text-sm text-gray-600 flex-wrap">
              <li><Link href="/" className="hover:text-green-400 transition-colors">Inicio</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/tools" className="hover:text-green-400 transition-colors">Herramientas</Link></li>
              <li aria-hidden="true">/</li>
              <li className="text-gray-400">Hash & Base64 Toolkit</li>
            </ol>
          </nav>

          <header className="mb-8">
            <h1 className="text-2xl font-bold text-gray-100 mb-2">Hash & Base64 Toolkit</h1>
            <p className="text-gray-400 text-sm">
              Generá hashes criptográficos seguros y codificá/decodificá textos. Funciona de manera 100% offline utilizando la Web Crypto API de tu navegador, garantizando que tu información sensible nunca abandone tu equipo.
            </p>
          </header>

          <HashToolkit />
          <LearnMore articles={relatedArticles} />
        </div>
      </main>
    </div>
  )
}
