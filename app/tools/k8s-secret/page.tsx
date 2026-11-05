import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import K8sSecretTool from '@/components/tools/K8sSecretTool'
import ToolSchema from '@/components/ToolSchema'
import LearnMore from '@/components/LearnMore'
import { getToolArticles } from '@/lib/content'
import type { Metadata } from 'next'
import { SHARE_IMAGE } from '@/lib/seo'

const TITLE = 'Kubernetes Secret Base64 Decoder & Builder (Opaque / DockerConfigJson)'
const DESCRIPTION = 'Decodificá todos los valores Base64 de un manifiesto Secret de Kubernetes a texto plano de una sola vez, o generá un Secret (Opaque o ImagePullSecret) desde un .env.'
const PATH = '/tools/k8s-secret/'

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

export default function K8sSecretPage() {
  const relatedArticles = getToolArticles('k8s-secret')

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar mode="link" activeCategory={null} activeToolSlug="k8s-secret" />
      <ToolSchema name="Kubernetes Secret Base64 Decoder & Builder" description={DESCRIPTION} url={PATH} />

      <main id="main-content" tabIndex={-1} className="flex-1 overflow-auto">
        <div className="pt-14 px-4 pb-6 md:p-6 max-w-5xl mx-auto">
          <nav aria-label="Ruta de navegación" className="mb-6">
            <ol className="flex items-center gap-1.5 text-sm text-gray-600 flex-wrap">
              <li><Link href="/" className="hover:text-green-400 transition-colors">Inicio</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/tools" className="hover:text-green-400 transition-colors">Herramientas</Link></li>
              <li aria-hidden="true">/</li>
              <li className="text-gray-400">K8s Secret Decoder & Builder</li>
            </ol>
          </nav>

          <header className="mb-8">
            <h1 className="text-2xl font-bold text-gray-100 mb-2">Kubernetes Secret Base64 Decoder & Builder</h1>
            <p className="text-gray-400 text-sm">
              Pegá un manifiesto <code className="text-gray-300">kind: Secret</code> para decodificar todas sus claves Base64 en masa, o armá un Secret nuevo (incluyendo <code className="text-gray-300">kubernetes.io/dockerconfigjson</code> para registries privados) 100% offline en tu navegador.
            </p>
          </header>

          <K8sSecretTool />
          <LearnMore articles={relatedArticles} />
        </div>
      </main>
    </div>
  )
}
