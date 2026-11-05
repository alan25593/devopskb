import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import UuidGenerator from '@/components/tools/UuidGenerator'
import ToolSchema from '@/components/ToolSchema'
import LearnMore from '@/components/LearnMore'
import { getToolArticles } from '@/lib/content'
import type { Metadata } from 'next'
import { SHARE_IMAGE } from '@/lib/seo'

const TITLE = 'UUID v4 / v7, ULID & NanoID Bulk Generator & Timestamp Decoder'
const DESCRIPTION = 'Generador masivo de identificadores únicos UUID v7 (ordenables por tiempo para bases de datos), UUID v4, ULID y NanoID, con decodificador de timestamp integrado.'
const PATH = '/tools/uuid/'

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

export default function UuidPage() {
  const relatedArticles = getToolArticles('uuid')

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar mode="link" activeCategory={null} activeToolSlug="uuid" />
      <ToolSchema name="UUID v7/v4, ULID & NanoID Generator" description={DESCRIPTION} url={PATH} />

      <main id="main-content" tabIndex={-1} className="flex-1 overflow-auto">
        <div className="pt-14 px-4 pb-6 md:p-6 max-w-5xl mx-auto">
          <nav aria-label="Ruta de navegación" className="mb-6">
            <ol className="flex items-center gap-1.5 text-sm text-gray-600 flex-wrap">
              <li><Link href="/" className="hover:text-green-400 transition-colors">Inicio</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/tools" className="hover:text-green-400 transition-colors">Herramientas</Link></li>
              <li aria-hidden="true">/</li>
              <li className="text-gray-400">UUID / ULID Generator</li>
            </ol>
          </nav>

          <header className="mb-8">
            <h1 className="text-2xl font-bold text-gray-100 mb-2">Generador e Inspector de UUID (v4 / v7), ULID & NanoID</h1>
            <p className="text-gray-400 text-sm">
              Generá lotes de identificadores criptográficamente seguros (<code className="text-gray-300">crypto.getRandomValues</code>) listos para JSON o SQL, o inspeccioná el timestamp embebido en cualquier UUID v7 o ULID.
            </p>
          </header>

          <UuidGenerator />
          <LearnMore articles={relatedArticles} />
        </div>
      </main>
    </div>
  )
}
