'use client'

import { useState, useMemo } from 'react'

export default function MetaTagsGenerator() {
  const [title, setTitle] = useState('WiresOps — Infraestructura Cloud, Kubernetes & DevOps as a Service')
  const [description, setDescription] = useState(
    'Especialistas en Kubernetes, Docker, CI/CD, Observabilidad con Grafana y automatización cloud para empresas que buscan escalar sin fricción.'
  )
  const [url, setUrl] = useState('https://wiresops.com')
  const [imageUrl, setImageUrl] = useState('https://wiresops.com/images/WiresOps-banner.png')
  const [siteName, setSiteName] = useState('WiresOps')
  const [themeColor, setThemeColor] = useState('#2EC4B6')
  const [codeTab, setCodeTab] = useState<'nextjs' | 'html' | 'jsonld'>('nextjs')
  const [copied, setCopied] = useState(false)

  const domain = useMemo(() => {
    try {
      return new URL(url).hostname
    } catch {
      return 'wiresops.com'
    }
  }, [url])

  const nextjsCode = useMemo(() => {
    return `import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '${title.replace(/'/g, "\\'")}',
  description: '${description.replace(/'/g, "\\'")}',
  alternates: {
    canonical: '${url}',
  },
  openGraph: {
    title: '${title.replace(/'/g, "\\'")}',
    description: '${description.replace(/'/g, "\\'")}',
    url: '${url}',
    siteName: '${siteName.replace(/'/g, "\\'")}',
    images: [
      {
        url: '${imageUrl}',
        width: 1200,
        height: 630,
        alt: '${siteName.replace(/'/g, "\\'")}',
      },
    ],
    locale: 'es_AR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '${title.replace(/'/g, "\\'")}',
    description: '${description.replace(/'/g, "\\'")}',
    images: ['${imageUrl}'],
  },
}`
  }, [title, description, url, imageUrl, siteName])

  const htmlCode = useMemo(() => {
    return `<!-- Primary Meta Tags -->
<title>${title}</title>
<meta name="title" content="${title}" />
<meta name="description" content="${description}" />
<meta name="theme-color" content="${themeColor}" />
<link rel="canonical" href="${url}" />

<!-- Open Graph / WhatsApp / Facebook -->
<meta property="og:type" content="website" />
<meta property="og:url" content="${url}" />
<meta property="og:site_name" content="${siteName}" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:image" content="${imageUrl}" />

<!-- Twitter / X -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
<meta name="twitter:image" content="${imageUrl}" />`
  }, [title, description, url, imageUrl, siteName, themeColor])

  const jsonLdCode = useMemo(() => {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: siteName,
      url,
      logo: imageUrl,
      description,
    }
    return `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`
  }, [siteName, url, imageUrl, description])

  const currentCode =
    codeTab === 'nextjs' ? nextjsCode : codeTab === 'html' ? htmlCode : jsonLdCode

  const copyCode = () => {
    navigator.clipboard.writeText(currentCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Inputs */}
        <div className="lg:col-span-6 bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Datos SEO & OpenGraph
          </h2>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400">Título de la Página (50–60 caracteres ideal)</span>
              <span className={`font-mono ${title.length > 65 ? 'text-amber-400' : 'text-green-400'}`}>
                {title.length} chars
              </span>
            </div>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 focus:border-green-500 rounded-lg px-3 py-2 text-xs text-gray-100 outline-none"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400">Meta Description (120–160 caracteres ideal)</span>
              <span className={`font-mono ${description.length > 160 ? 'text-amber-400' : 'text-green-400'}`}>
                {description.length} chars
              </span>
            </div>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-gray-950 border border-gray-800 focus:border-green-500 rounded-lg p-3 text-xs text-gray-100 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">URL Canónica</label>
              <input
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-gray-100"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Nombre del Sitio</label>
              <input
                type="text"
                value={siteName}
                onChange={e => setSiteName(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1">URL Imagen OpenGraph (1200×630)</label>
              <input
                type="text"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-gray-100"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Theme Color</label>
              <input
                type="text"
                value={themeColor}
                onChange={e => setThemeColor(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-gray-100"
              />
            </div>
          </div>
        </div>

        {/* Live Previews (Google + Social Card) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Google SERP Preview */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <span className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Vista Previa en Google Search
            </span>
            <div className="bg-gray-950 border border-gray-800 rounded-lg p-4 space-y-1">
              <div className="text-xs text-gray-400 truncate">{url}</div>
              <div className="text-base font-semibold text-blue-400 hover:underline truncate">
                {title}
              </div>
              <div className="text-xs text-gray-300 line-clamp-2 leading-relaxed">
                {description}
              </div>
            </div>
          </div>

          {/* WhatsApp / Social Preview */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <span className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Vista Previa en WhatsApp / Twitter / LinkedIn
            </span>
            <div className="bg-gray-950 border border-gray-800 rounded-lg overflow-hidden">
              <div className="h-28 bg-gray-900 border-b border-gray-800 flex items-center justify-center text-xs text-gray-500 font-mono px-4 text-center">
                OG Image (1200×630): {imageUrl}
              </div>
              <div className="p-3.5 space-y-1">
                <div className="text-[11px] uppercase text-gray-500 font-mono">{domain}</div>
                <div className="text-sm font-bold text-gray-100 truncate">{title}</div>
                <div className="text-xs text-gray-400 line-clamp-2">{description}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Generated Code */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {[
              { id: 'nextjs', label: 'Next.js App Router (Metadata)' },
              { id: 'html', label: 'HTML <head> Meta Tags' },
              { id: 'jsonld', label: 'JSON-LD Schema.org' },
            ].map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setCodeTab(t.id as 'nextjs' | 'html' | 'jsonld')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  codeTab === t.id
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={copyCode}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-xs text-green-400 font-medium"
          >
            {copied ? '¡Copiado!' : 'Copiar Código'}
          </button>
        </div>

        <pre className="bg-gray-950 border border-gray-800 rounded-xl p-4 font-mono text-xs text-green-300 overflow-x-auto">
          {currentCode}
        </pre>
      </div>
    </div>
  )
}
