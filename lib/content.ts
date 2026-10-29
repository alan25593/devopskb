import fs from 'fs'
import { execFileSync } from 'child_process'
import path from 'path'
import matter from 'gray-matter'

const contentDir = path.join(process.cwd(), 'content')

let _cache: Article[] | null = null

export interface Heading {
  level: number
  text: string
  id: string
}

export interface Article {
  slug: string
  category: string
  title: string
  description: string
  keywords: string[]
  tags: string[]
  content: string
  readingTime: number
  headings: Heading[]
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function extractHeadings(content: string): Heading[] {
  const headings: Heading[] = []
  // Matches ## or ### at the start of a line
  const regex = /^(#{2,3})\s+(.+)$/gm
  let match
  while ((match = regex.exec(content)) !== null) {
    headings.push({
      level: match[1].length,
      text: match[2].trim(),
      id: slugify(match[2].trim())
    })
  }
  return headings
}

function calculateReadingTime(content: string): number {
  const wordCount = content.split(/\s+/).length
  return Math.max(1, Math.ceil(wordCount / 200))
}

// Slugs of a category's articles in stable order (README.md is category docs, not an article)
function listArticleSlugs(categoryPath: string): string[] {
  return fs.readdirSync(categoryPath)
    .filter(f => f.endsWith('.md') && f.toLowerCase() !== 'readme.md')
    .sort()
    .map(f => f.replace(/\.md$/, ''))
}

// The page header already renders the frontmatter title, so drop a leading "# Title" from the body
function stripLeadingH1(content: string): string {
  return content.replace(/^\s*#\s+[^\n]*\n/, '')
}

function parseArticle(category: string, slug: string, raw: string): Article {
  const { data, content: rawContent } = matter(raw)
  const content = stripLeadingH1(rawContent)
  return {
    slug,
    category,
    title: data.title ?? slug,
    description: data.description ?? '',
    keywords: Array.isArray(data.keywords) ? data.keywords : [],
    tags: Array.isArray(data.tags) ? data.tags : [],
    content,
    readingTime: calculateReadingTime(content),
    headings: extractHeadings(content)
  }
}

export function getAllArticles(): Article[] {
  if (_cache) return _cache

  const articles: Article[] = []

  if (!fs.existsSync(contentDir)) return articles

  const categories = fs.readdirSync(contentDir).sort()

  for (const category of categories) {
    const categoryPath = path.join(contentDir, category)
    if (!fs.statSync(categoryPath).isDirectory()) continue

    for (const slug of listArticleSlugs(categoryPath)) {
      const raw = fs.readFileSync(path.join(categoryPath, `${slug}.md`), 'utf-8')
      articles.push(parseArticle(category, slug, raw))
    }
  }

  _cache = articles
  return articles
}

export function getArticle(category: string, slug: string): Article | null {
  const filePath = path.join(contentDir, category, `${slug}.md`)
  if (!fs.existsSync(filePath)) return null

  return parseArticle(category, slug, fs.readFileSync(filePath, 'utf-8'))
}

export type SearchArticle = Omit<Article, 'content' | 'headings'>

export function getArticlesForSearch(): SearchArticle[] {
  return getAllArticles().map(({ content: _content, headings: _headings, ...rest }) => rest)
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

// Last commit date of the article file; falls back to mtime when git is unavailable (e.g. Docker build without .git)
export function getArticleLastModified(category: string, slug: string): Date {
  const filePath = path.join(contentDir, category, `${slug}.md`)
  try {
    const iso = execFileSync('git', ['log', '-1', '--format=%cI', '--', filePath], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
    if (iso) return new Date(iso)
  } catch {}
  return fs.statSync(filePath).mtime
}

export function getAdjacentArticles(category: string, slug: string): {
  prev: Article | null
  next: Article | null
} {
  const categoryPath = path.join(contentDir, category)
  if (!fs.existsSync(categoryPath)) return { prev: null, next: null }

  const slugs = listArticleSlugs(categoryPath)

  const idx = slugs.indexOf(slug)
  return {
    prev: idx > 0 ? getArticle(category, slugs[idx - 1]) : null,
    next: idx < slugs.length - 1 ? getArticle(category, slugs[idx + 1]) : null,
  }
}
