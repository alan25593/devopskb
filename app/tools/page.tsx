import Link from 'next/link'
import { TOOLS } from '@/lib/tools'
import Sidebar from '@/components/Sidebar'
import ToolsDashboard from '@/components/ToolsDashboard'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Herramientas DevOps',
  description: 'Utilidades para DevOps, DevSecOps y SRE. Todo corre 100% en tu navegador. Ningún dato se envía a servidores externos.',
}

export default function ToolsPage() {
  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar mode="link" activeCategory={null} activeToolSlug="tools" />

      <main className="flex-1 overflow-auto">
        <div className="pt-14 px-4 pb-12 md:p-8 max-w-5xl mx-auto">

          <nav aria-label="Ruta de navegación" className="mb-6">
            <ol className="flex items-center gap-1.5 text-sm text-gray-600">
              <li><Link href="/" className="hover:text-green-400 transition-colors">Inicio</Link></li>
              <li aria-hidden="true">/</li>
              <li className="text-gray-400 font-medium">Herramientas</li>
            </ol>
          </nav>

          <header className="mb-10">
            <h1 className="text-3xl font-bold text-gray-100 mb-3">Dashboard de Herramientas</h1>
            <p className="text-gray-400 text-lg">
              Utilidades para DevOps, DevSecOps y SRE. Todo corre <span className="text-green-400 font-medium">100% en tu navegador</span>. Ningún dato se envía a servidores externos.
            </p>
          </header>

          <ToolsDashboard tools={TOOLS} />

        </div>
      </main>
    </div>
  )
}



