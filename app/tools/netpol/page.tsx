import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import NetpolVisualizer from '@/components/tools/NetpolVisualizer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'NetworkPolicy Visualizer | WiresOps',
  description: 'Convertí NetworkPolicies de Kubernetes en diagramas visuales interactivos para entender los flujos de tráfico.',
}

export default function NetpolPage() {
  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar mode="link" activeCategory={null} activeToolSlug="netpol" />

      <main className="flex-1 overflow-auto">
        <div className="pt-14 px-4 pb-6 md:p-6 max-w-7xl mx-auto">
          <nav aria-label="Ruta de navegación" className="mb-6">
            <ol className="flex items-center gap-1.5 text-sm text-gray-600 flex-wrap">
              <li><Link href="/" className="hover:text-green-400 transition-colors">Inicio</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/tools" className="hover:text-green-400 transition-colors">Herramientas</Link></li>
              <li aria-hidden="true">/</li>
              <li className="text-gray-400">NetworkPolicy Visualizer</li>
            </ol>
          </nav>

          <header className="mb-8">
            <h1 className="text-2xl font-bold text-gray-100 mb-2">NetworkPolicy Visualizer</h1>
            <p className="text-gray-400 text-sm">
              Entendé fácilmente qué tráfico se permite entrar o salir de tus Pods. Convierte el YAML de una NetworkPolicy en un diagrama visual claro y estructurado (Ingress → Target ← Egress).
            </p>
          </header>

          <NetpolVisualizer />
        </div>
      </main>
    </div>
  )
}
