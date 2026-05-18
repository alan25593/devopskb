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

export default function ArticlePage({ params }: Props) {
  const article = getArticle(params.category, params.slug)
  if (!article) notFound()

  const { prev, next } = getAdjacentArticles(params.category, params.slug)
  const categoryArticles = getArticlesByCategory(params.category)

  return (
    <ArticleView
      key={`${params.category}/${params.slug}`}
      article={article}
      prev={prev}
      next={next}
      categoryArticles={categoryArticles}
    />
  )
}
