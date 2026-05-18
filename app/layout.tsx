import type { Metadata, Viewport } from 'next'
import './globals.css'

const BASE_URL = 'https://devopskb.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'DevOps KB',
    template: '%s | DevOps KB',
  },
  description: 'Base de conocimiento DevOps — Docker, Kubernetes, Terraform, Linux, Git y Windows. Snippets listos para copiar.',
  openGraph: {
    siteName: 'DevOps KB',
    type: 'website',
    locale: 'es_AR',
    url: BASE_URL,
  },
  twitter: {
    card: 'summary',
    title: 'DevOps KB',
    description: 'Base de conocimiento DevOps — Docker, Kubernetes, Terraform, Linux, Git y Windows.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-950 text-gray-100 antialiased">
        {children}
      </body>
    </html>
  )
}
