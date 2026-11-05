import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import ImageToolkit from '@/components/tools/ImageToolkit'
import ToolSchema from '@/components/ToolSchema'
import type { Metadata } from 'next'
import { SHARE_IMAGE } from '@/lib/seo'

const TITLE = 'WebP Image Optimizer & Favicon Pack Generator'
const DESCRIPTION = 'Comprimí y convertí imágenes PNG/JPG a WebP en el navegador sin subir archivos, o generá el pack completo de favicons (16x16, 32x32, apple-touch-icon, 192x192, 512x512).'
const PATH = '/tools/image-toolkit/'

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

export default function ImageToolkitPage() {
  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar mode="link" activeCategory={null} activeToolSlug="image-toolkit" />
      <ToolSchema name="WebP Image Optimizer & Favicon Generator" description={DESCRIPTION} url={PATH} />

      <main id="main-content" tabIndex={-1} className="flex-1 overflow-auto">
        <div className="pt-14 px-4 pb-6 md:p-6 max-w-5xl mx-auto">
          <nav aria-label="Ruta de navegación" className="mb-6">
            <ol className="flex items-center gap-1.5 text-sm text-gray-600 flex-wrap">
              <li><Link href="/" className="hover:text-green-400 transition-colors">Inicio</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/tools" className="hover:text-green-400 transition-colors">Herramientas</Link></li>
              <li aria-hidden="true">/</li>
              <li className="text-gray-400">WebP & Favicon Toolkit</li>
            </ol>
          </nav>

          <header className="mb-8">
            <h1 className="text-2xl font-bold text-gray-100 mb-2">Optimizador WebP & Generador de Favicons</h1>
            <p className="text-gray-400 text-sm">
              Convertí banners y fotos a formato <code className="text-gray-300">WebP</code> controlando calidad y dimensiones para mejorar Core Web Vitals, o exportá todos los tamaños de favicons e iconos PWA en un clic.
            </p>
          </header>

          <ImageToolkit />
        </div>
      </main>
    </div>
  )
}
