import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import PasswordGenerator from '@/components/tools/PasswordGenerator'
import ToolSchema from '@/components/ToolSchema'
import LearnMore from '@/components/LearnMore'
import { getToolArticles } from '@/lib/content'
import type { Metadata } from 'next'
import { SHARE_IMAGE } from '@/lib/seo'

const TITLE = 'Password Generator'
const DESCRIPTION = 'Generá contraseñas seguras o passphrases con alto nivel de entropía. Soporte para generación múltiple y reglas personalizadas.'
const PATH = '/tools/password/'

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

export default function PasswordPage() {
  const relatedArticles = getToolArticles('password')

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-950">
      <Sidebar mode="link" activeCategory={null} activeToolSlug="password" />
      <ToolSchema name="Password Generator" description={DESCRIPTION} url={PATH} />

      <main className="flex-1 overflow-auto">
        <div className="pt-14 px-4 pb-6 md:p-6 max-w-3xl mx-auto">
          <nav aria-label="Ruta de navegación" className="mb-6">
            <ol className="flex items-center gap-1.5 text-sm text-slate-500 flex-wrap">
              <li><Link href="/" className="hover:text-cyan-400 transition-colors">Inicio</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/tools" className="hover:text-cyan-400 transition-colors">Herramientas</Link></li>
              <li aria-hidden="true">/</li>
              <li className="text-slate-300">Password Generator</li>
            </ol>
          </nav>

          <header className="mb-8">
            <h1 className="text-2xl font-bold text-slate-100 mb-2">Password Generator</h1>
            <p className="text-slate-400 text-sm">
              Generá contraseñas seguras o passphrases con alto nivel de entropía. Todas las operaciones se realizan localmente en tu navegador sin enviar datos a ningún servidor.
            </p>
          </header>

          <PasswordGenerator />
          <LearnMore articles={relatedArticles} />
        </div>
      </main>
    </div>
  )
}
