import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import RbacViewer from '@/components/tools/RbacViewer'
import ToolSchema from '@/components/ToolSchema'
import LearnMore from '@/components/LearnMore'
import { getToolArticles } from '@/lib/content'
import type { Metadata } from 'next'
import { SHARE_IMAGE } from '@/lib/seo'

const TITLE = 'RBAC Viewer'
const DESCRIPTION = 'Inspeccioná RoleBindings y Roles para generar una matriz visual de permisos en Kubernetes.'
const PATH = '/tools/rbac/'

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

export default function RbacPage() {
  const relatedArticles = getToolArticles('rbac')

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar mode="link" activeCategory={null} activeToolSlug="rbac" />
      <ToolSchema name="RBAC Viewer" description={DESCRIPTION} url={PATH} />

      <main id="main-content" tabIndex={-1} className="flex-1 overflow-auto">
        <div className="pt-14 px-4 pb-6 md:p-6 max-w-7xl mx-auto">
          <nav aria-label="Ruta de navegación" className="mb-6">
            <ol className="flex items-center gap-1.5 text-sm text-gray-600 flex-wrap">
              <li><Link href="/" className="hover:text-green-400 transition-colors">Inicio</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/tools" className="hover:text-green-400 transition-colors">Herramientas</Link></li>
              <li aria-hidden="true">/</li>
              <li className="text-gray-400">RBAC Viewer</li>
            </ol>
          </nav>

          <header className="mb-8">
            <h1 className="text-2xl font-bold text-gray-100 mb-2">RBAC Viewer</h1>
            <p className="text-gray-400 text-sm">
              Analizá manifiestos de Role, ClusterRole, RoleBinding y ClusterRoleBinding. Visualizá qué Usuarios o ServiceAccounts tienen permisos sobre qué recursos, mapeando los vínculos automáticamente.
            </p>
          </header>

          <RbacViewer />
          <LearnMore articles={relatedArticles} />
        </div>
      </main>
    </div>
  )
}
