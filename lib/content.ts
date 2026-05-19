import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const contentDir = path.join(process.cwd(), 'content')

let _cache: Article[] | null = null

export interface Article {
  slug: string
  category: string
  title: string
  description: string
  keywords: string[]
  tags: string[]
  content: string
}

export function getAllArticles(): Article[] {
  if (_cache) return _cache

  const articles: Article[] = []

  if (!fs.existsSync(contentDir)) return articles

  const categories = fs.readdirSync(contentDir)

  for (const category of categories) {
    const categoryPath = path.join(contentDir, category)
    if (!fs.statSync(categoryPath).isDirectory()) continue

    const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.md'))

    for (const file of files) {
      const slug = file.replace('.md', '')
      const filePath = path.join(categoryPath, file)
      const raw = fs.readFileSync(filePath, 'utf-8')
      const { data, content } = matter(raw)

      articles.push({
        slug,
        category,
        title: data.title ?? slug,
        description: data.description ?? '',
        keywords: Array.isArray(data.keywords) ? data.keywords : [],
        tags: Array.isArray(data.tags) ? data.tags : [],
        content,
      })
    }
  }

  _cache = articles
  return articles
}

export function getArticle(category: string, slug: string): Article | null {
  const filePath = path.join(contentDir, category, `${slug}.md`)
  if (!fs.existsSync(filePath)) return null

  const raw = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = matter(raw)

  return {
    slug,
    category,
    title: data.title ?? slug,
    description: data.description ?? '',
    keywords: Array.isArray(data.keywords) ? data.keywords : [],
    tags: Array.isArray(data.tags) ? data.tags : [],
    content,
  }
}

export type SearchArticle = Omit<Article, 'content'>

export function getArticlesForSearch(): SearchArticle[] {
  return getAllArticles().map(({ content: _content, ...rest }) => rest)
}

export function getAllStaticParams() {
  const articles = getAllArticles()
  return articles.map(a => ({ category: a.category, slug: a.slug }))
}

export function getArticlesByCategory(category: string): Pick<Article, 'slug' | 'category' | 'title'>[] {
  return getAllArticles()
    .filter(a => a.category === category)
    .map(({ slug, category: cat, title }) => ({ slug, category: cat, title }))
}

export function getAdjacentArticles(category: string, slug: string): {
  prev: Article | null
  next: Article | null
} {
  const categoryPath = path.join(contentDir, category)
  if (!fs.existsSync(categoryPath)) return { prev: null, next: null }

  const slugs = fs.readdirSync(categoryPath)
    .filter(f => f.endsWith('.md'))
    .sort()
    .map(f => f.replace('.md', ''))

  const idx = slugs.indexOf(slug)
  return {
    prev: idx > 0 ? getArticle(category, slugs[idx - 1]) : null,
    next: idx < slugs.length - 1 ? getArticle(category, slugs[idx + 1]) : null,
  }
}
