import { getAllStaticParams, getArticle, getAdjacentArticles, getArticlesByCategory } from '@/lib/content'
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

  const categoryLabel = params.category.charAt(0).toUpperCase() + params.category.slice(1)
  const keywords = [...new Set([...article.keywords, ...article.tags, categoryLabel, 'DevOps', 'SRE'])]
  const description = article.description || `Guía de ${article.title} — DevOps KB`

  return {
    title: article.title,
    description,
    keywords,
    openGraph: {
      title: article.title,
      description,
      type: 'article',
      url: `/article/${params.category}/${params.slug}/`,
      tags: article.tags,
    },
    twitter: {
      card: 'summary',
      title: article.title,
      description,
    },
  }
}

const BASE_URL = 'https://devopskb.vercel.app'

const CATEGORY_LABELS: Record<string, string> = {
  docker: 'Docker', git: 'Git', kubernetes: 'Kubernetes',
  linux: 'Linux', terraform: 'Terraform', windows: 'Windows',
}

export default function ArticlePage({ params }: Props) {
  const article = getArticle(params.category, params.slug)
  if (!article) notFound()

  const { prev, next } = getAdjacentArticles(params.category, params.slug)
  const categoryArticles = getArticlesByCategory(params.category)

  const categoryLabel = CATEGORY_LABELS[params.category] ?? params.category
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
        inLanguage: 'es',
        publisher: { '@type': 'Organization', name: 'DevOps KB', url: BASE_URL },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: BASE_URL },
          { '@type': 'ListItem', position: 2, name: categoryLabel, item: `${BASE_URL}/?cat=${params.category}` },
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
      />
    </>
  )
}
