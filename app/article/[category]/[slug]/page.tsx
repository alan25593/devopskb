import { getAllStaticParams, getArticle, getAdjacentArticles, getArticlesByCategory } from '@/lib/content'
import ArticleView from '@/components/ArticleView'
import { notFound } from 'next/navigation'

export function generateStaticParams() {
  return getAllStaticParams()
}

interface Props {
  params: { category: string; slug: string }
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
