import { getAllStaticParams, getArticle, getAdjacentArticles, getArticlesByCategory, getArticleLastModified, getRelatedArticles } from '@/lib/content'
import { getCategoryLabel } from '@/lib/categories'
import ArticleView from '@/components/ArticleView'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

export function generateStaticParams() {
  return getAllStaticParams()
}

interface Props {
  params: { category: string; slug: string }
}

export function generateMetadata({ params }: Props): Metadata {
  const article = getArticle(params.category, params.slug)
  if (!article) return {}

  const categoryLabel = getCategoryLabel(params.category)
  const keywords = [...new Set([...article.keywords, ...article.tags, categoryLabel, 'DevOps', 'SRE'])]
  const description = article.description || `Guía de ${article.title} — DevOps KB`
  const canonicalUrl = `/article/${params.category}/${params.slug}/`

  return {
    title: article.title,
    description,
    keywords,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: article.title,
      description,
      type: 'article',
      url: canonicalUrl,
      tags: article.tags,
    },
    twitter: {
      card: 'summary',
      title: article.title,
      description,
    },
  }
}

const BASE_URL = 'https://kb.wiresops.com'

export default function ArticlePage({ params }: Props) {
  const article = getArticle(params.category, params.slug)
  if (!article) notFound()

  const { prev, next } = getAdjacentArticles(params.category, params.slug)
  const categoryArticles = getArticlesByCategory(params.category)
  const related = getRelatedArticles(
    params.category,
    params.slug,
    [prev, next].filter(Boolean).map(a => `${a!.category}/${a!.slug}`)
  )

  const categoryLabel = getCategoryLabel(params.category)
  const articleUrl = `${BASE_URL}/article/${params.category}/${params.slug}/`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TechArticle',
        headline: article.title,
        description: article.description,
        keywords: [...article.keywords, ...article.tags].join(', '),
        url: articleUrl,
        dateModified: getArticleLastModified(params.category, params.slug).toISOString(),
        inLanguage: 'es',
        publisher: { '@type': 'Organization', name: 'DevOps KB', url: BASE_URL },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: BASE_URL },
          { '@type': 'ListItem', position: 2, name: categoryLabel, item: `${BASE_URL}/category/${params.category}/` },
          { '@type': 'ListItem', position: 3, name: article.title, item: articleUrl },
        ],
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ArticleView
        key={`${params.category}/${params.slug}`}
        article={article}
        prev={prev}
        next={next}
        categoryArticles={categoryArticles}
        related={related}
      />
    </>
  )
}
