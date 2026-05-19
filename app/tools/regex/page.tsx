import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import RegexTester from '@/components/tools/RegexTester'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Regex Tester',
  description: 'Construí, testá y entendé expresiones regulares. Librería de patrones comunes, builder guiado y explicación token por token.',
}

export default function RegexPage() {
  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar mode="link" activeCategory={null} activeToolSlug="regex" />

      <main className="flex-1 overflow-auto">
        <div className="pt-14 px-4 pb-6 md:p-6 max-w-3xl mx-auto">

          <nav aria-label="Ruta de navegación" className="mb-6">
            <ol className="flex items-center gap-1.5 text-sm text-gray-600 flex-wrap">
              <li><Link href="/" className="hover:text-green-400 transition-colors">Inicio</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/tools" className="hover:text-green-400 transition-colors">Herramientas</Link></li>
              <li aria-hidden="true">/</li>
              <li className="text-gray-400">Regex Tester</li>
            </ol>
          </nav>

          <header className="mb-8">
            <h1 className="text-2xl font-bold text-gray-100 mb-2">Regex Tester</h1>
            <p className="text-gray-400 text-sm">
              Construí expresiones regulares desde cero con el builder guiado, usá patrones predefinidos comunes, o pegá uno existente y entendé qué hace cada parte.
            </p>
          </header>

          <RegexTester />
        </div>
      </main>
    </div>
  )
}
