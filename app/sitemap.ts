import type { MetadataRoute } from 'next'
import { getAllArticles, getArticleLastModified } from '@/lib/content'
import { CATEGORIES } from '@/lib/categories'
import { TOOLS } from '@/lib/tools'

const BASE_URL = 'https://kb.wiresops.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const articles = getAllArticles().map(article => ({
    article,
    lastModified: getArticleLastModified(article.category, article.slug),
  }))

  const articleEntries: MetadataRoute.Sitemap = articles.map(({ article, lastModified }) => ({
    url: `${BASE_URL}/article/${article.category}/${article.slug}/`,
    lastModified,
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  // A category changes when any of its articles does
  const categoryEntries: MetadataRoute.Sitemap = CATEGORIES
    .map(cat => {
      const dates = articles.filter(a => a.article.category === cat.id).map(a => a.lastModified.getTime())
      return dates.length === 0 ? null : {
        url: `${BASE_URL}/category/${cat.id}/`,
        lastModified: new Date(Math.max(...dates)),
        changeFrequency: 'weekly' as const,
        priority: 0.9,
      }
    })
    .filter((e): e is NonNullable<typeof e> => e !== null)

  const toolEntries: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/tools/`, changeFrequency: 'monthly', priority: 0.7 },
    ...TOOLS.map(t => ({
      url: `${BASE_URL}${t.href}/`,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ]

  const latest = Math.max(...articles.map(a => a.lastModified.getTime()))

  return [
    {
      url: BASE_URL,
      lastModified: new Date(latest),
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...categoryEntries,
    ...toolEntries,
    ...articleEntries,
  ]
}
