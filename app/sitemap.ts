import type { MetadataRoute } from 'next'
import { getAllArticles } from '@/lib/content'

const BASE_URL = 'https://devopskb.vercel.app'

export default function sitemap(): MetadataRoute.Sitemap {
  const articles = getAllArticles()

  const articleEntries: MetadataRoute.Sitemap = articles.map(article => ({
    url: `${BASE_URL}/article/${article.category}/${article.slug}/`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...articleEntries,
  ]
}
