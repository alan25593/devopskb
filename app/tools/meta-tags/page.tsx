import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import MetaTagsGenerator from '@/components/tools/MetaTagsGenerator'
import ToolSchema from '@/components/ToolSchema'
import type { Metadata } from 'next'
import { SHARE_IMAGE } from '@/lib/seo'

const TITLE = 'SEO Meta Tags, OpenGraph & Next.js Metadata Generator'
const DESCRIPTION = 'Generador visual de Meta Tags SEO, OpenGraph (WhatsApp, Twitter/X, LinkedIn) y JSON-LD Schema.org con código listo para Next.js App Router y HTML.'
const PATH = '/tools/meta-tags/'

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

export default function MetaTagsPage() {
  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar mode="link" activeCategory={null} activeToolSlug="meta-tags" />
      <ToolSchema name="SEO Meta Tags & Next.js Metadata Generator" description={DESCRIPTION} url={PATH} />

      <main id="main-content" tabIndex={-1} className="flex-1 overflow-auto">
        <div className="pt-14 px-4 pb-6 md:p-6 max-w-5xl mx-auto">
          <nav aria-label="Ruta de navegación" className="mb-6">
            <ol className="flex items-center gap-1.5 text-sm text-gray-600 flex-wrap">
              <li><Link href="/" className="hover:text-green-400 transition-colors">Inicio</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/tools" className="hover:text-green-400 transition-colors">Herramientas</Link></li>
              <li aria-hidden="true">/</li>
              <li className="text-gray-400">Meta Tags & OpenGraph</li>
            </ol>
          </nav>

          <header className="mb-8">
            <h1 className="text-2xl font-bold text-gray-100 mb-2">Generador de Meta Tags, OpenGraph & Next.js Metadata</h1>
            <p className="text-gray-400 text-sm">
              Previsualizá en tiempo real cómo se verá tu sitio en Google, WhatsApp y redes sociales, y exportá el bloque <code className="text-gray-300">export const metadata: Metadata</code> de Next.js o las etiquetas HTML y JSON-LD.
            </p>
          </header>

          <MetaTagsGenerator />
        </div>
      </main>
    </div>
  )
}
