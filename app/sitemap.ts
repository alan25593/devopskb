import type { MetadataRoute } from 'next'
import { getAllArticles } from '@/lib/content'
import { TOOLS } from '@/lib/tools'

const BASE_URL = 'https://devopskb.vercel.app'

export default function sitemap(): MetadataRoute.Sitemap {
  const articles = getAllArticles()

  const articleEntries: MetadataRoute.Sitemap = articles.map(article => ({
    url: `${BASE_URL}/article/${article.category}/${article.slug}/`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  const toolEntries: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/tools/`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    ...TOOLS.map(t => ({
      url: `${BASE_URL}${t.href}/`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ]

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...toolEntries,
    ...articleEntries,
  ]
}
