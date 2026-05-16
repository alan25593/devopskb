'use client'

import { createContext, useContext, useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Article } from '@/lib/content'
import Sidebar from './Sidebar'
import CategoryTag from './CategoryTag'

const InsidePreContext = createContext(false)

function extractText(node: React.ReactNode): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (node !== null && typeof node === 'object' && 'props' in (node as object))
    return extractText((node as React.ReactElement).props.children)
  return ''
}

function ClipboardIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function CopyButton({ text, variant }: { text: string; variant: 'block' | 'inline' }) {
  const [copied, setCopied] = useState(false)

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  if (variant === 'block') {
    return (
      <button
        onClick={handleClick}
        title="Copiar"
        className="absolute top-2 right-2 opacity-100 md:opacity-0 md:group-hover/pre:opacity-100 transition-opacity
          flex items-center gap-1 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white
          rounded px-2 py-1 text-xs font-mono select-none"
      >
        {copied ? <><CheckIcon /> copiado</> : <><ClipboardIcon /> copiar</>}
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      title="Copiar"
      className="opacity-0 group-hover/code:opacity-100 transition-opacity
        inline-flex items-center align-middle ml-1 text-gray-500 hover:text-green-400 shrink-0"
    >
      {copied ? <CheckIcon /> : <ClipboardIcon />}
    </button>
  )
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  const text = extractText(children).trimEnd()
  return (
    <InsidePreContext.Provider value={true}>
      <div className="relative group/pre">
        <pre>{children}</pre>
        <CopyButton text={text} variant="block" />
      </div>
    </InsidePreContext.Provider>
  )
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[()[\]{}.,;:!?¿¡'"]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

function Heading({ level, children }: { level: number; children: React.ReactNode }) {
  const text = extractText(children)
  const id = slugify(text)
  const Tag = `h${level}` as keyof JSX.IntrinsicElements
  return (
    <Tag id={id} className="group/heading relative">
      <a
        href={`#${id}`}
        className="absolute -left-5 top-0 bottom-0 flex items-center opacity-0 group-hover/heading:opacity-100 transition-opacity text-gray-600 hover:text-green-400 no-underline"
        aria-hidden="true"
      >
        #
      </a>
      {children}
    </Tag>
  )
}

function InlineOrBlockCode({ children, className }: { children: React.ReactNode; className?: string }) {
  const insidePre = useContext(InsidePreContext)

  if (insidePre) {
    return <code className={className}>{children}</code>
  }

  const text = extractText(children)
  return (
    <span className="inline-flex items-center group/code">
      <code className={className}>{children}</code>
      <CopyButton text={text} variant="inline" />
    </span>
  )
}

function ScrollToTop({ targetRef }: { targetRef: React.RefObject<HTMLElement | null> }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = targetRef.current
    if (!el) return
    const onScroll = () => setVisible(el.scrollTop > 250)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [targetRef])

  const scrollUp = () => targetRef.current?.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <button
      onClick={scrollUp}
      title="Volver arriba"
      className={`fixed bottom-6 right-6 z-50 bg-gray-800 border border-gray-700 hover:border-green-500
        text-gray-500 hover:text-green-400 rounded-full p-3 shadow-lg
        transition-all duration-200
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  )
}

interface NavArticle {
  slug: string
  category: string
  title: string
}

interface Props {
  article: Article
  prev?: Article | null
  next?: Article | null
  categoryArticles?: NavArticle[]
}

export default function ArticleView({ article, prev, next, categoryArticles }: Props) {
  const mainRef = useRef<HTMLElement>(null)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        activeCategory={article.category}
        activeSlug={article.slug}
        categoryArticles={categoryArticles}
        mode="link"
      />

      <main ref={mainRef} className="flex-1 overflow-auto">
        <div className="pt-14 px-4 pb-6 md:p-6 max-w-3xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-green-400 transition-colors mb-6"
          >
            ← Volver a búsqueda
          </Link>

          <header className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <CategoryTag category={article.category} />
              {article.tags.map(tag => (
                <span key={tag} className="text-xs text-gray-400 bg-gray-800 border border-gray-700 px-2 py-0.5 rounded">
                  {tag}
                </span>
              ))}
            </div>
            <h1 className="text-2xl font-bold text-gray-100 mb-2">{article.title}</h1>
            {article.description && (
              <p className="text-gray-400 leading-relaxed">{article.description}</p>
            )}
          </header>

          <article className="prose prose-invert prose-green prose-sm max-w-none
            prose-headings:text-gray-100
            prose-p:text-gray-300
            prose-strong:text-gray-100
            prose-code:text-green-300
            prose-pre:bg-gray-900
            prose-a:text-green-400
            prose-li:text-gray-300
            prose-blockquote:border-green-700
            prose-blockquote:text-gray-400
            prose-hr:border-gray-800
            prose-table:text-gray-300
            prose-thead:text-gray-200
          ">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                pre:  ({ children }) => <CodeBlock>{children}</CodeBlock>,
                code: ({ children, className }) => (
                  <InlineOrBlockCode className={className}>{children}</InlineOrBlockCode>
                ),
                h1: ({ children }) => <Heading level={1}>{children}</Heading>,
                h2: ({ children }) => <Heading level={2}>{children}</Heading>,
                h3: ({ children }) => <Heading level={3}>{children}</Heading>,
                h4: ({ children }) => <Heading level={4}>{children}</Heading>,
                table: ({ children }) => (
                  <div className="overflow-x-auto">
                    <table>{children}</table>
                  </div>
                ),
              }}
            >
              {article.content}
            </ReactMarkdown>
          </article>

          {(prev || next) && (
            <nav className="mt-12 pt-6 border-t border-gray-800 grid grid-cols-2 gap-4">
              {prev ? (
                <Link
                  href={`/article/${prev.category}/${prev.slug}/`}
                  className="group flex flex-col gap-1 p-3 rounded-lg border border-gray-800 hover:border-green-700 transition-colors"
                >
                  <span className="text-xs text-gray-600">← Anterior</span>
                  <span className="text-sm text-gray-400 group-hover:text-green-400 transition-colors line-clamp-2">{prev.title}</span>
                </Link>
              ) : <div />}
              {next ? (
                <Link
                  href={`/article/${next.category}/${next.slug}/`}
                  className="group flex flex-col gap-1 p-3 rounded-lg border border-gray-800 hover:border-green-700 transition-colors text-right"
                >
                  <span className="text-xs text-gray-600">Siguiente →</span>
                  <span className="text-sm text-gray-400 group-hover:text-green-400 transition-colors line-clamp-2">{next.title}</span>
                </Link>
              ) : <div />}
            </nav>
          )}
        </div>
      </main>

      <ScrollToTop targetRef={mainRef} />
    </div>
  )
}
