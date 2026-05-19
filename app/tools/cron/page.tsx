import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import CronExplainer from '@/components/tools/CronExplainer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cron Explainer',
  description: 'Explicador de expresiones cron. Pegá una expresión cron y obtené una descripción en español campo por campo y las próximas ejecuciones.',
}

export default function CronPage() {
  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar mode="link" activeCategory={null} activeToolSlug="cron" />

      <main className="flex-1 overflow-auto">
        <div className="pt-14 px-4 pb-6 md:p-6 max-w-3xl mx-auto">

          <nav aria-label="Ruta de navegación" className="mb-6">
            <ol className="flex items-center gap-1.5 text-sm text-gray-600 flex-wrap">
              <li><Link href="/" className="hover:text-green-400 transition-colors">Inicio</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/tools" className="hover:text-green-400 transition-colors">Herramientas</Link></li>
              <li aria-hidden="true">/</li>
              <li className="text-gray-400">Cron Explainer</li>
            </ol>
          </nav>

          <header className="mb-8">
            <h1 className="text-2xl font-bold text-gray-100 mb-2">Cron Explainer</h1>
            <p className="text-gray-400 text-sm">
              Pegá una expresión cron de 5 campos y obtené una descripción detallada en español junto con las próximas ejecuciones. Útil para crontab, Kubernetes CronJobs y GitHub Actions schedules.
            </p>
          </header>

          <CronExplainer />
        </div>
      </main>
    </div>
  )
}
