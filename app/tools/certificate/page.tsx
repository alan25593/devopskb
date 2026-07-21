import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import CertificateInspector from '@/components/tools/CertificateInspector'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Certificate Inspector | WiresOps',
  description: 'Analizá certificados SSL/TLS desde una URL o pegando el texto PEM. Chequeá SANs, issuer y expiración.',
}

export default function CertificatePage() {
  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar mode="link" activeCategory={null} activeToolSlug="certificate" />

      <main className="flex-1 overflow-auto">
        <div className="pt-14 px-4 pb-6 md:p-6 max-w-3xl mx-auto">
          <nav aria-label="Ruta de navegación" className="mb-6">
            <ol className="flex items-center gap-1.5 text-sm text-gray-600 flex-wrap">
              <li><Link href="/" className="hover:text-green-400 transition-colors">Inicio</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/tools" className="hover:text-green-400 transition-colors">Herramientas</Link></li>
              <li aria-hidden="true">/</li>
              <li className="text-gray-400">Certificate Inspector</li>
            </ol>
          </nav>

          <header className="mb-8">
            <h1 className="text-2xl font-bold text-gray-100 mb-2">Certificate Inspector</h1>
            <p className="text-gray-400 text-sm">
              Ingresá un dominio para obtener su certificado TLS directo del servidor, o pegá un bloque de texto en formato PEM para parsearlo de forma local en el navegador.
            </p>
          </header>

          <CertificateInspector />
        </div>
      </main>
    </div>
  )
}
