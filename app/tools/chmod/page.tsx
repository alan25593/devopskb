import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import ChmodCalculator from '@/components/tools/ChmodCalculator'
import ToolSchema from '@/components/ToolSchema'
import LearnMore from '@/components/LearnMore'
import { getToolArticles } from '@/lib/content'
import type { Metadata } from 'next'
import { SHARE_IMAGE } from '@/lib/seo'

const TITLE = 'Chmod Calculator — Calculadora de Permisos Linux (Octal y Simbólico)'
const DESCRIPTION = 'Calculá permisos de Linux en formato octal (755, 600, 4755) y simbólico (-rwxr-xr-x) con soporte para SUID, SGID y Sticky Bit. Generá comandos chmod y chown al instante.'
const PATH = '/tools/chmod/'

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

export default function ChmodPage() {
  const relatedArticles = getToolArticles('chmod')

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar mode="link" activeCategory={null} activeToolSlug="chmod" />
      <ToolSchema name="Chmod Calculator" description={DESCRIPTION} url={PATH} />

      <main id="main-content" tabIndex={-1} className="flex-1 overflow-auto">
        <div className="pt-14 px-4 pb-6 md:p-6 max-w-5xl mx-auto">
          <nav aria-label="Ruta de navegación" className="mb-6">
            <ol className="flex items-center gap-1.5 text-sm text-gray-600 flex-wrap">
              <li><Link href="/" className="hover:text-green-400 transition-colors">Inicio</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/tools" className="hover:text-green-400 transition-colors">Herramientas</Link></li>
              <li aria-hidden="true">/</li>
              <li className="text-gray-400">Chmod Calculator</li>
            </ol>
          </nav>

          <header className="mb-8">
            <h1 className="text-2xl font-bold text-gray-100 mb-2">Calculadora de Permisos Linux (Chmod & Chown)</h1>
            <p className="text-gray-400 text-sm">
              Convertí entre notación octal (<code className="text-gray-300">0755</code>, <code className="text-gray-300">0600</code>) y simbólica (<code className="text-gray-300">-rwxr-xr-x</code>), incluyendo bits especiales (SUID, SGID, Sticky Bit) y presets seguros para claves SSH, servidores web y scripts.
            </p>
          </header>

          <ChmodCalculator />
          <LearnMore articles={relatedArticles} />
        </div>
      </main>
    </div>
  )
}
