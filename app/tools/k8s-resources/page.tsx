import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import K8sResourceCalculator from '@/components/tools/K8sResourceCalculator'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'K8s Resource Calculator | WiresOps',
  description: 'Calculá el total de CPU y RAM requeridos para tus Deployments multiplicados por sus réplicas.',
}

export default function K8sResourcesPage() {
  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar mode="link" activeCategory={null} activeToolSlug="k8s-resources" />

      <main className="flex-1 overflow-auto">
        <div className="pt-14 px-4 pb-6 md:p-6 max-w-6xl mx-auto">
          <nav aria-label="Ruta de navegación" className="mb-6">
            <ol className="flex items-center gap-1.5 text-sm text-gray-600 flex-wrap">
              <li><Link href="/" className="hover:text-green-400 transition-colors">Inicio</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/tools" className="hover:text-green-400 transition-colors">Herramientas</Link></li>
              <li aria-hidden="true">/</li>
              <li className="text-gray-400">K8s Resource Calculator</li>
            </ol>
          </nav>

          <header className="mb-8">
            <h1 className="text-2xl font-bold text-gray-100 mb-2">Kubernetes Resource Calculator</h1>
            <p className="text-gray-400 text-sm">
              Pegá tus YAMLs (Deployments, StatefulSets) y obtené al instante la suma total de resources (Requests y Limits) multiplicada por la cantidad de réplicas. Ideal para capacity planning.
            </p>
          </header>

          <K8sResourceCalculator />
        </div>
      </main>
    </div>
  )
}
