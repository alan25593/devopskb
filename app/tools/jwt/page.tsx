import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import JwtDecoder from '@/components/tools/JwtDecoder'
import ToolSchema from '@/components/ToolSchema'
import LearnMore from '@/components/LearnMore'
import { getArticle } from '@/lib/content'
import type { Metadata } from 'next'

const TITLE = 'JWT Decoder | WiresOps'
const DESCRIPTION = 'Decodificador de tokens JWT. Visualizá header, payload y estado de expiración sin enviar el token a ningún servidor.'
const PATH = '/tools/jwt/'

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

export default function JwtPage() {
  const relatedArticles = [
    getArticle('docker', '07-seguridad'),
    getArticle('linux', '07-seguridad-y-hardening'),
  ].filter(Boolean) as any[]

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar mode="link" activeCategory={null} activeToolSlug="jwt" />
      <ToolSchema name="JWT Decoder" description={DESCRIPTION} url={PATH} />

      <main className="flex-1 overflow-auto">
        <div className="pt-14 px-4 pb-6 md:p-6 max-w-3xl mx-auto">

          <nav aria-label="Ruta de navegación" className="mb-6">
            <ol className="flex items-center gap-1.5 text-sm text-gray-600 flex-wrap">
              <li><Link href="/" className="hover:text-green-400 transition-colors">Inicio</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/tools" className="hover:text-green-400 transition-colors">Herramientas</Link></li>
              <li aria-hidden="true">/</li>
              <li className="text-gray-400">JWT Decoder</li>
            </ol>
          </nav>

          <header className="mb-8">
            <h1 className="text-2xl font-bold text-gray-100 mb-2">JWT Decoder</h1>
            <p className="text-gray-400 text-sm">
              Decodificá un token JWT y visualizá el header, payload y estado de expiración. Todo corre en el browser — el token nunca sale de tu máquina.
            </p>
          </header>

          <JwtDecoder />
          <LearnMore articles={relatedArticles} />
        </div>
      </main>
    </div>
  )
}
