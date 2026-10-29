import type { Metadata, Viewport } from 'next'
import './globals.css'
import CommandPalette from '@/components/CommandPalette'

const BASE_URL = 'https://kb.wiresops.com'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'DevOps KB - Snippets de Docker, Kubernetes, Linux y más',
    template: '%s | DevOps KB',
  },
  description: 'Base de conocimiento DevOps — Docker, Kubernetes, Jenkins, Terraform, Linux, Git y Windows. Snippets listos para copiar.',
  manifest: '/site.webmanifest',
  icons: {
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ],
  },
  openGraph: {
    siteName: 'DevOps KB',
    title: 'DevOps KB - Snippets de Docker, Kubernetes, Linux y más',
    type: 'website',
    locale: 'es_AR',
    url: BASE_URL,
    images: [
      {
        url: `${BASE_URL}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: 'DevOps KB',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@wiresops',
    title: 'DevOps KB - Snippets de Docker, Kubernetes, Linux y más',
    description: 'Base de conocimiento DevOps — Docker, Kubernetes, Jenkins, Terraform, Linux, Git y Windows.',
    images: [`${BASE_URL}/og-image.jpg`],
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
  themeColor: '#020617',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-100 overflow-x-hidden">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "DevOps KB",
              "url": BASE_URL,
              "description": "Base de conocimiento DevOps — Docker, Kubernetes, Jenkins, Terraform, Linux, Git y Windows. Snippets listos para copiar."
            })
          }}
        />
        {/* Keyboard users skip the sidebar (8 categories + 18 tools) straight to the page content */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[200] focus:rounded-md focus:bg-cyan-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-950"
        >
          Saltar al contenido
        </a>
        {children}
        <CommandPalette />
      </body>
    </html>
  )
}
