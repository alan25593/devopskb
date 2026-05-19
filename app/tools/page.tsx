import Link from 'next/link'
import { TOOLS } from '@/lib/tools'
import Sidebar from '@/components/Sidebar'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Herramientas DevOps',
  description: 'Herramientas interactivas para DevOps: Subnet Calculator, Cron Explainer, JWT Decoder, YAML Validator y JSON Formatter. Todo corre en el browser.',
}

export default function ToolsPage() {
  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar mode="link" activeCategory={null} />

      <main className="flex-1 overflow-auto">
        <div className="pt-14 px-4 pb-6 md:p-6 max-w-3xl mx-auto">

          <nav aria-label="Ruta de navegación" className="mb-6">
            <ol className="flex items-center gap-1.5 text-sm text-gray-600">
              <li><Link href="/" className="hover:text-green-400 transition-colors">Inicio</Link></li>
              <li aria-hidden="true">/</li>
              <li className="text-gray-400">Herramientas</li>
            </ol>
          </nav>

          <header className="mb-8">
            <h1 className="text-2xl font-bold text-gray-100 mb-2">Herramientas DevOps</h1>
            <p className="text-gray-400">Utilidades interactivas para el día a día. Todo corre en el browser, sin enviar datos a ningún servidor.</p>
          </header>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TOOLS.map(tool => (
              <Link
                key={tool.id}
                href={tool.href}
                className="group flex flex-col gap-3 p-5 bg-gray-900 border border-gray-800 rounded-lg hover:border-green-700 hover:bg-gray-800/50 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-gray-800 border border-gray-700 group-hover:border-green-800 flex items-center justify-center transition-colors">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18" height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-green-400"
                  >
                    <path d={tool.iconPath} />
                  </svg>
                </div>
                <div>
                  <h2 className="font-semibold text-gray-100 group-hover:text-white text-sm mb-1">{tool.label}</h2>
                  <p className="text-gray-500 text-xs leading-relaxed">{tool.description}</p>
                </div>
                <span className="text-xs text-green-600 group-hover:text-green-400 transition-colors mt-auto">
                  Abrir →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
