'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import type { Article, Heading as HeadingType } from '@/lib/content'
import Sidebar from './Sidebar'
import CategoryTag from './CategoryTag'
import MermaidDiagram from './MermaidDiagram'

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
        className="absolute top-2 right-2 opacity-100 md:opacity-0 md:group-hover/code-block:opacity-100 transition-opacity
          flex items-center gap-1 bg-gray-800 border border-gray-700 hover:border-green-600 hover:bg-gray-700 text-gray-300 hover:text-white
          rounded px-2 py-1 text-xs font-mono select-none shadow-sm"
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
    <Tag id={id} className="group/heading relative scroll-mt-20">
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

function TableOfContents({ headings, className = "hidden xl:block w-64 shrink-0 pl-6 pt-4", isMobile = false }: { headings: HeadingType[], className?: string, isMobile?: boolean }) {
  if (!headings || headings.length === 0) return null
  
  const content = (
    <>
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-800 pb-2">En esta página</h3>
      <ul className="space-y-2.5 text-sm">
        {headings.map(h => (
          <li key={h.id} style={{ paddingLeft: `${(h.level - 2) * 1}rem` }}>
            <a href={`#${h.id}`} className="text-gray-500 hover:text-green-400 transition-colors line-clamp-2 block leading-snug">
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </>
  )

  if (isMobile) {
    return (
      <div className={className}>
        {content}
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="sticky top-20">
        {content}
      </div>
    </div>
  )
}

const CATEGORY_LABELS: Record<string, string> = {
  docker: 'Docker', git: 'Git', kubernetes: 'Kubernetes',
  linux: 'Linux', terraform: 'Terraform', windows: 'Windows',
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
  const categoryLabel = CATEGORY_LABELS[article.category] ?? article.category

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar
        activeCategory={article.category}
        activeSlug={article.slug}
        categoryArticles={categoryArticles}
        mode="link"
      />

      <main ref={mainRef} className="flex-1 overflow-auto">
        <div className="pt-14 px-4 pb-6 md:p-6 max-w-[1200px] mx-auto flex flex-col xl:flex-row xl:items-start gap-8">
          
          <div className="flex-1 max-w-3xl xl:w-full">
            <nav aria-label="Ruta de navegación" className="mb-6">
              <ol className="flex items-center gap-1.5 text-sm text-gray-600 flex-wrap">
                <li><Link href="/" className="hover:text-green-400 transition-colors">Inicio</Link></li>
                <li aria-hidden="true">/</li>
                <li><Link href={`/?cat=${article.category}`} className="hover:text-green-400 transition-colors">{categoryLabel}</Link></li>
                <li aria-hidden="true">/</li>
                <li className="text-gray-400 truncate max-w-[200px]" aria-current="page">{article.title}</li>
              </ol>
            </nav>

            <article>
              <header className="mb-10 pb-6 border-b border-gray-800/60">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <CategoryTag category={article.category} />
                  {article.tags.map(tag => (
                    <span key={tag} className="text-xs font-medium text-gray-400 bg-gray-800/80 border border-gray-700 px-2 py-0.5 rounded shrink-0">
                      {tag}
                    </span>
                  ))}
                  <span className="ml-auto text-xs text-gray-500 font-medium flex items-center gap-1.5 bg-gray-900 px-2.5 py-1 rounded border border-gray-800">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    {article.readingTime} min de lectura
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-100 mb-4">{article.title}</h1>
                {article.description && (
                  <p className="text-lg text-gray-400 leading-relaxed">{article.description}</p>
                )}
              </header>

              <TableOfContents 
                headings={article.headings} 
                className="block xl:hidden mb-10 bg-gray-900/50 border border-gray-800 rounded-lg p-5" 
                isMobile={true} 
              />

              <div className="prose prose-invert prose-green prose-sm max-w-none
                prose-headings:text-gray-100 prose-headings:font-semibold
                prose-p:text-gray-300 prose-p:leading-relaxed
                prose-strong:text-gray-200
                prose-code:text-green-300
                prose-a:text-green-400 hover:prose-a:text-green-300 transition-colors
                prose-li:text-gray-300
                prose-blockquote:border-green-700 prose-blockquote:bg-green-900/10 prose-blockquote:px-4 prose-blockquote:py-2 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-gray-300
                prose-hr:border-gray-800/60
                prose-table:text-gray-300 prose-thead:text-gray-200
              ">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => <Heading level={2}>{children}</Heading>,
                    h2: ({ children }) => <Heading level={2}>{children}</Heading>,
                    h3: ({ children }) => <Heading level={3}>{children}</Heading>,
                    h4: ({ children }) => <Heading level={4}>{children}</Heading>,
                    table: ({ children }) => <div className="overflow-x-auto my-6 border border-gray-800 rounded-lg"><table className="w-full text-left m-0">{children}</table></div>,
                    code(props) {
                      const { children, className, node, ...rest } = props
                      const match = /language-(\w+)/.exec(className || '')
                      
                      if (!match) {
                        const text = extractText(children)
                        return (
                          <span className="inline-flex items-center group/code bg-gray-800/60 border border-gray-700/50 rounded px-1.5 py-0.5">
                            <code className="text-green-400 font-mono text-[0.85em] before:content-none after:content-none" {...rest}>{children}</code>
                            <CopyButton text={text} variant="inline" />
                          </span>
                        )
                      }
                      
                      const language = match[1]
                      const content = String(children).replace(/\n$/, '')
                      
                      if (language === 'mermaid') {
                        return <MermaidDiagram chart={content} />
                      }
                      
                      return (
                        <div className="relative group/code-block my-6 rounded-lg overflow-hidden border border-gray-800 shadow-sm">
                          <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
                            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">{language}</span>
                          </div>
                          <SyntaxHighlighter
                            children={content}
                            style={vscDarkPlus}
                            language={language}
                            PreTag="div"
                            showLineNumbers={true}
                            customStyle={{ margin: 0, background: '#0d1117', padding: '1rem', fontSize: '0.875rem' }}
                            codeTagProps={{ style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' } }}
                          />
                          <CopyButton text={content} variant="block" />
                        </div>
                      )
                    }
                  }}
                >
                  {article.content}
                </ReactMarkdown>
              </div>

              {(prev || next) && (
                <nav aria-label="Navegación entre artículos" className="mt-16 pt-8 border-t border-gray-800/60 grid grid-cols-2 gap-4">
                  {prev ? (
                    <Link
                      href={`/article/${prev.category}/${prev.slug}/`}
                      className="group flex flex-col gap-1.5 p-4 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-green-700 hover:bg-gray-800/50 transition-all shadow-sm hover:shadow-md"
                    >
                      <span className="text-xs font-semibold text-gray-500 tracking-wider uppercase">← Anterior</span>
                      <span className="text-sm font-medium text-gray-300 group-hover:text-green-400 transition-colors line-clamp-2">{prev.title}</span>
                    </Link>
                  ) : <div />}
                  {next ? (
                    <Link
                      href={`/article/${next.category}/${next.slug}/`}
                      className="group flex flex-col gap-1.5 p-4 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-green-700 hover:bg-gray-800/50 transition-all shadow-sm hover:shadow-md text-right"
                    >
                      <span className="text-xs font-semibold text-gray-500 tracking-wider uppercase">Siguiente →</span>
                      <span className="text-sm font-medium text-gray-300 group-hover:text-green-400 transition-colors line-clamp-2">{next.title}</span>
                    </Link>
                  ) : <div />}
                </nav>
              )}
            </article>
          </div>

          <TableOfContents headings={article.headings} />
          
        </div>
      </main>

      <ScrollToTop targetRef={mainRef} />
    </div>
  )
}
