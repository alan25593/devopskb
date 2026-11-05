import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import ColorPicker from '@/components/tools/ColorPicker'
import ToolSchema from '@/components/ToolSchema'
import type { Metadata } from 'next'
import { SHARE_IMAGE } from '@/lib/seo'

const TITLE = 'Color Picker & Converter — Selector y Conversor de Colores'
const DESCRIPTION = 'Selector y conversor de colores gratuito. Obtené códigos HEX, RGB, RGBA, HSL, HSV, CMYK, CSS y Tailwind con paletas oficiales de WiresOps, marcas cloud y cálculo de contraste WCAG.'
const PATH = '/tools/color/'

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

export default function ColorPickerPage() {
  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar mode="link" activeCategory={null} activeToolSlug="color" />
      <ToolSchema name="Color Picker & Converter" description={DESCRIPTION} url={PATH} />

      <main id="main-content" tabIndex={-1} className="flex-1 overflow-auto">
        <div className="pt-14 px-4 pb-6 md:p-6 max-w-5xl mx-auto">

          <nav aria-label="Ruta de navegación" className="mb-6">
            <ol className="flex items-center gap-1.5 text-sm text-gray-600 flex-wrap">
              <li><Link href="/" className="hover:text-green-400 transition-colors">Inicio</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/tools" className="hover:text-green-400 transition-colors">Herramientas</Link></li>
              <li aria-hidden="true">/</li>
              <li className="text-gray-400">Color Picker & Converter</li>
            </ol>
          </nav>

          <header className="mb-8">
            <h1 className="text-2xl font-bold text-gray-100 mb-2">Color Picker & Conversor</h1>
            <p className="text-gray-400 text-sm">
              Seleccioná, convertí y analizá colores en tiempo real. Soporta valores HEX, RGB, RGBA, HSL, HSV, CMYK, clases de Tailwind CSS, verificación de accesibilidad WCAG 2.1 y paletas predefinidas de WiresOps, marcas cloud y diseño. Todo se ejecuta de forma local en tu navegador.
            </p>
          </header>

          <ColorPicker />
        </div>
      </main>
    </div>
  )
}
