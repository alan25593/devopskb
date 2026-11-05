import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import OpensslSshBuilder from '@/components/tools/OpensslSshBuilder'
import ToolSchema from '@/components/ToolSchema'
import LearnMore from '@/components/LearnMore'
import { getToolArticles } from '@/lib/content'
import type { Metadata } from 'next'
import { SHARE_IMAGE } from '@/lib/seo'

const TITLE = 'OpenSSL & SSH Tunnel Command Builder'
const DESCRIPTION = 'Constructor interactivo de comandos OpenSSL (CSR con múltiples SANs, conversión PEM a PFX/PKCS12, inspección TLS) y túneles SSH (-L, -R, -D, ProxyJump).'
const PATH = '/tools/openssl-ssh/'

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

export default function OpensslSshPage() {
  const relatedArticles = getToolArticles('openssl-ssh')

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar mode="link" activeCategory={null} activeToolSlug="openssl-ssh" />
      <ToolSchema name="OpenSSL & SSH Command Builder" description={DESCRIPTION} url={PATH} />

      <main id="main-content" tabIndex={-1} className="flex-1 overflow-auto">
        <div className="pt-14 px-4 pb-6 md:p-6 max-w-5xl mx-auto">
          <nav aria-label="Ruta de navegación" className="mb-6">
            <ol className="flex items-center gap-1.5 text-sm text-gray-600 flex-wrap">
              <li><Link href="/" className="hover:text-green-400 transition-colors">Inicio</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/tools" className="hover:text-green-400 transition-colors">Herramientas</Link></li>
              <li aria-hidden="true">/</li>
              <li className="text-gray-400">OpenSSL & SSH Builder</li>
            </ol>
          </nav>

          <header className="mb-8">
            <h1 className="text-2xl font-bold text-gray-100 mb-2">OpenSSL & SSH Tunnel Command Builder</h1>
            <p className="text-gray-400 text-sm">
              Generá one-liners exactos de <code className="text-gray-300">openssl</code> (CSRs con SANs, certificados autofirmados, conversión entre PEM y <code className="text-gray-300">.pfx</code> para IIS/Nginx) y túneles <code className="text-gray-300">ssh</code> sin pelear con los flags.
            </p>
          </header>

          <OpensslSshBuilder />
          <LearnMore articles={relatedArticles} />
        </div>
      </main>
    </div>
  )
}
