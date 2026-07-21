import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import K8sAnalyzer from '@/components/tools/K8sAnalyzer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'K8s Manifest Analyzer | WiresOps',
  description: 'Linter de seguridad y buenas prácticas para manifiestos de Kubernetes.',
}

export default function K8sAnalyzerPage() {
  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar mode="link" activeCategory={null} activeToolSlug="k8s-analyzer" />

      <main className="flex-1 overflow-auto">
        <div className="pt-14 px-4 pb-6 md:p-6 max-w-6xl mx-auto">
          <nav aria-label="Ruta de navegación" className="mb-6">
            <ol className="flex items-center gap-1.5 text-sm text-gray-600 flex-wrap">
              <li><Link href="/" className="hover:text-green-400 transition-colors">Inicio</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/tools" className="hover:text-green-400 transition-colors">Herramientas</Link></li>
              <li aria-hidden="true">/</li>
              <li className="text-gray-400">Kubernetes Manifest Analyzer</li>
            </ol>
          </nav>

          <header className="mb-8">
            <h1 className="text-2xl font-bold text-gray-100 mb-2">Kubernetes Manifest Analyzer</h1>
            <p className="text-gray-400 text-sm">
              Pegá tus manifiestos de Kubernetes y descubrí configuraciones inseguras, atributos faltantes (resources, probes) y antipatrones de DevSecOps. Corre todo localmente.
            </p>
          </header>

          <K8sAnalyzer />
        </div>
      </main>
    </div>
  )
}
