import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import YamlValidator from '@/components/tools/YamlValidator'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'YAML Validator',
  description: 'Validador y formateador de YAML para Kubernetes, Docker Compose y GitHub Actions. Detecta errores de indentación con línea y columna exactas.',
}

export default function YamlPage() {
  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar mode="link" activeCategory={null} activeToolSlug="yaml" />

      <main className="flex-1 overflow-auto">
        <div className="pt-14 px-4 pb-6 md:p-6 max-w-3xl mx-auto">

          <nav aria-label="Ruta de navegación" className="mb-6">
            <ol className="flex items-center gap-1.5 text-sm text-gray-600 flex-wrap">
              <li><Link href="/" className="hover:text-green-400 transition-colors">Inicio</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/tools" className="hover:text-green-400 transition-colors">Herramientas</Link></li>
              <li aria-hidden="true">/</li>
              <li className="text-gray-400">YAML Validator</li>
            </ol>
          </nav>

          <header className="mb-8">
            <h1 className="text-2xl font-bold text-gray-100 mb-2">YAML Validator</h1>
            <p className="text-gray-400 text-sm">
              Pegá un manifiesto de Kubernetes, Docker Compose, GitHub Actions o cualquier YAML. Validación en tiempo real con línea y columna exactas del error, más formateo limpio con indentación estándar.
            </p>
          </header>

          <YamlValidator />
        </div>
      </main>
    </div>
  )
}
