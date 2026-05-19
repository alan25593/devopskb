import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import SubnetCalculator from '@/components/tools/SubnetCalculator'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Subnet Calculator',
  description: 'Calculadora de subredes CIDR. Ingresá una dirección IP con prefijo y obtené red, broadcast, rango de hosts, máscara y wildcard.',
}

export default function SubnetPage() {
  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar mode="link" activeCategory={null} activeToolSlug="subnet" />

      <main className="flex-1 overflow-auto">
        <div className="pt-14 px-4 pb-6 md:p-6 max-w-3xl mx-auto">

          <nav aria-label="Ruta de navegación" className="mb-6">
            <ol className="flex items-center gap-1.5 text-sm text-gray-600 flex-wrap">
              <li><Link href="/" className="hover:text-green-400 transition-colors">Inicio</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/tools" className="hover:text-green-400 transition-colors">Herramientas</Link></li>
              <li aria-hidden="true">/</li>
              <li className="text-gray-400">Subnet Calculator</li>
            </ol>
          </nav>

          <header className="mb-8">
            <h1 className="text-2xl font-bold text-gray-100 mb-2">Subnet Calculator</h1>
            <p className="text-gray-400 text-sm">
              Ingresá una dirección IP con prefijo CIDR y calculá automáticamente la dirección de red, broadcast, rango de hosts utilizables, máscara de subred y wildcard.
            </p>
          </header>

          <SubnetCalculator />
        </div>
      </main>
    </div>
  )
}
