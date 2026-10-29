import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { SHARE_IMAGE } from '@/lib/seo'
import { CATEGORIES, groupByTrack } from '@/lib/categories'
import { getAllArticles } from '@/lib/content'
import Sidebar from '@/components/Sidebar'

const BASE_URL = 'https://kb.wiresops.com'

interface Props {
  params: { category: string }
}

export function generateStaticParams() {
  const withArticles = new Set(getAllArticles().map(a => a.category))
  return CATEGORIES.filter(c => withArticles.has(c.id)).map(c => ({ category: c.id }))
}

export function generateMetadata({ params }: Props): Metadata {
  const cat = CATEGORIES.find(c => c.id === params.category)
  if (!cat) return {}

  const title = `${cat.label}: guías, comandos y troubleshooting`
  const canonicalUrl = `/category/${cat.id}/`

  return {
    title,
    description: cat.description,
    keywords: [cat.label, `${cat.label} guía`, `${cat.label} troubleshooting`, 'DevOps', 'SRE'],
    alternates: { canonical: canonicalUrl },
    openGraph: { images: [SHARE_IMAGE], title, description: cat.description, type: 'website', url: canonicalUrl },
    twitter: { card: 'summary_large_image', images: [SHARE_IMAGE], title, description: cat.description },
  }
}

export default function CategoryPage({ params }: Props) {
  const cat = CATEGORIES.find(c => c.id === params.category)
  if (!cat) notFound()

  const articles = getAllArticles().filter(a => a.category === cat.id)
  if (articles.length === 0) notFound()

  const totalMinutes = articles.reduce((sum, a) => sum + a.readingTime, 0)
  const categoryUrl = `${BASE_URL}/category/${cat.id}/`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: `${cat.label} — DevOps KB`,
        description: cat.description,
        url: categoryUrl,
        inLanguage: 'es',
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: articles.length,
          itemListElement: articles.map((a, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `${BASE_URL}/article/${a.category}/${a.slug}/`,
            name: a.title,
          })),
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: BASE_URL },
          { '@type': 'ListItem', position: 2, name: cat.label, item: categoryUrl },
        ],
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="flex h-dvh overflow-hidden">
        <Sidebar
          activeCategory={cat.id}
          categoryArticles={articles.map(({ slug, category, title }) => ({ slug, category, title }))}
          mode="link"
        />

        <main className="flex-1 overflow-auto">
          <div className="pt-14 px-4 pb-10 md:p-6 max-w-4xl mx-auto">
            <nav aria-label="Ruta de navegación" className="mb-6">
              <ol className="flex items-center gap-1.5 text-sm text-slate-600">
                <li><Link href="/" className="hover:text-cyan-400 transition-colors">Inicio</Link></li>
                <li aria-hidden="true">/</li>
                <li className="text-slate-400" aria-current="page">{cat.label}</li>
              </ol>
            </nav>

            <header className="mb-10 pb-6 border-b border-slate-800/60">
              <div className="flex items-center gap-3 mb-4">
                <svg role="img" viewBox="0 0 24 24" width="36" height="36" fill={`#${cat.hex}`} aria-hidden="true">
                  <path d={cat.svgPath} />
                </svg>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-100">{cat.label}</h1>
              </div>
              <p className="text-lg text-slate-400 leading-relaxed mb-4">{cat.description}</p>
              <p className="text-xs text-slate-500">
                {articles.length} artículos · {totalMinutes} min de lectura en total
              </p>
            </header>

            {groupByTrack(cat.id, articles.map((a, i) => ({ ...a, position: i + 1 }))).map(group => (
            <section key={group.label ?? 'all'} className="mb-10">
            {group.label && (
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">
                {group.label} <span className="text-slate-600 normal-case tracking-normal font-normal">· {group.items.length} artículos</span>
              </h2>
            )}
            <ol className="space-y-3">
              {group.items.map(a => (
                <li key={a.slug}>
                  <Link
                    href={`/article/${a.category}/${a.slug}/`}
                    className="group flex gap-4 bg-slate-900/40 border border-slate-800 rounded-xl p-4 hover:border-cyan-700/50 hover:bg-slate-800/60 transition-all duration-300"
                  >
                    <span className="text-xs font-mono text-slate-600 group-hover:text-cyan-500 pt-0.5 w-6 shrink-0 text-right transition-colors">
                      {String(a.position).padStart(2, '0')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3 mb-1">
                        <h3 className="font-medium text-slate-200 group-hover:text-cyan-300 transition-colors">{a.title}</h3>
                        <span className="text-[11px] text-slate-500 shrink-0">{a.readingTime} min</span>
                      </div>
                      {a.description && (
                        <p className="text-slate-400 text-sm leading-relaxed line-clamp-2">{a.description}</p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
            </section>
            ))}
          </div>
        </main>
      </div>
    </>
  )
}
