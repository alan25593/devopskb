import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import QRGenerator from '@/components/tools/QRGenerator'
import ToolSchema from '@/components/ToolSchema'
import type { Metadata } from 'next'
import { SHARE_IMAGE } from '@/lib/seo'

const TITLE = 'QR Code Generator'
const DESCRIPTION = 'Generador de códigos QR gratuito. Crea códigos QR personalizados con colores y sin fondo. Descargá en PNG o SVG.'
const PATH = '/tools/qr/'

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

export default function QRPage() {
  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar mode="link" activeCategory={null} activeToolSlug="qr" />
      <ToolSchema name="QR Code Generator" description={DESCRIPTION} url={PATH} />

      <main id="main-content" tabIndex={-1} className="flex-1 overflow-auto">
        <div className="pt-14 px-4 pb-6 md:p-6 max-w-5xl mx-auto">

          <nav aria-label="Ruta de navegación" className="mb-6">
            <ol className="flex items-center gap-1.5 text-sm text-gray-600 flex-wrap">
              <li><Link href="/" className="hover:text-green-400 transition-colors">Inicio</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/tools" className="hover:text-green-400 transition-colors">Herramientas</Link></li>
              <li aria-hidden="true">/</li>
              <li className="text-gray-400">QR Generator</li>
            </ol>
          </nav>

          <header className="mb-8">
            <h1 className="text-2xl font-bold text-gray-100 mb-2">Generador de Códigos QR</h1>
            <p className="text-gray-400 text-sm">
              Creá códigos QR personalizados al instante. Soporta modo vector (SVG) y bitmap (PNG), personalización de colores, fondos transparentes y niveles de corrección de errores. Todo el procesamiento se hace localmente en tu navegador.
            </p>
          </header>

          <QRGenerator />
        </div>
      </main>
    </div>
  )
}
