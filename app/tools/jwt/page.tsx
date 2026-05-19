import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import JwtDecoder from '@/components/tools/JwtDecoder'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'JWT Decoder',
  description: 'Decodificador de tokens JWT. Visualizá header, payload y estado de expiración sin enviar el token a ningún servidor.',
}

export default function JwtPage() {
  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar mode="link" activeCategory={null} activeToolSlug="jwt" />

      <main className="flex-1 overflow-auto">
        <div className="pt-14 px-4 pb-6 md:p-6 max-w-3xl mx-auto">

          <nav aria-label="Ruta de navegación" className="mb-6">
            <ol className="flex items-center gap-1.5 text-sm text-gray-600 flex-wrap">
              <li><Link href="/" className="hover:text-green-400 transition-colors">Inicio</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/tools" className="hover:text-green-400 transition-colors">Herramientas</Link></li>
              <li aria-hidden="true">/</li>
              <li className="text-gray-400">JWT Decoder</li>
            </ol>
          </nav>

          <header className="mb-8">
            <h1 className="text-2xl font-bold text-gray-100 mb-2">JWT Decoder</h1>
            <p className="text-gray-400 text-sm">
              Decodificá un token JWT y visualizá el header, payload y estado de expiración. Todo corre en el browser — el token nunca sale de tu máquina.
            </p>
          </header>

          <JwtDecoder />
        </div>
      </main>
    </div>
  )
}
