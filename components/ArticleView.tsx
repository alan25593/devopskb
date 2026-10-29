import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { slugify } from '@/lib/content'
import type { Article, Heading as HeadingType, RelatedArticle } from '@/lib/content'
import { getCategoryLabel } from '@/lib/categories'
import type { Tool } from '@/lib/tools'
import Sidebar from './Sidebar'
import CategoryTag from './CategoryTag'
import MermaidDiagram from './MermaidDiagram'
import { CopyButton, ScrollToTop } from './ArticleInteractive'

function extractText(node: React.ReactNode): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (node !== null && typeof node === 'object' && 'props' in (node as object))
    return extractText((node as React.ReactElement).props.children)
  return ''
}

function Heading({ level, children }: { level: number; children: React.ReactNode }) {
  const text = extractText(children)
  const id = slugify(text)
  const Tag = `h${level}` as keyof JSX.IntrinsicElements
  return (
    <Tag id={id} className="group/heading relative scroll-mt-20">
      <a
        href={`#${id}`}
        className="absolute -left-5 top-0 bottom-0 flex items-center opacity-0 group-hover/heading:opacity-100 transition-opacity text-slate-600 hover:text-cyan-400 no-underline"
        aria-hidden="true"
      >
        #
      </a>
      {children}
    </Tag>
  )
}

function TableOfContents({ headings, className = "hidden xl:block w-64 shrink-0 pl-6 pt-4", isMobile = false }: { headings: HeadingType[], className?: string, isMobile?: boolean }) {
  if (!headings || headings.length === 0) return null
  
  const content = (
    <>
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">En esta página</h3>
      <ul className="space-y-2.5 text-sm">
        {headings.map(h => (
          <li key={h.id} style={{ paddingLeft: `${(h.level - 2) * 1}rem` }}>
            <a href={`#${h.id}`} className="text-slate-500 hover:text-cyan-400 transition-colors line-clamp-2 block leading-snug">
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
  related?: RelatedArticle[]
  tools?: Tool[]
}

export default function ArticleView({ article, prev, next, categoryArticles, related = [], tools = [] }: Props) {
  const categoryLabel = getCategoryLabel(article.category)

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar
        activeCategory={article.category}
        activeSlug={article.slug}
        categoryArticles={categoryArticles}
        mode="link"
      />

      <main id="article-main" className="flex-1 overflow-auto">
        <div className="pt-14 px-4 pb-6 md:p-6 max-w-[1200px] mx-auto flex flex-col xl:flex-row xl:items-start gap-8">
          
          <div className="flex-1 max-w-3xl xl:w-full">
            <nav aria-label="Ruta de navegación" className="mb-6">
              <ol className="flex items-center gap-1.5 text-sm text-slate-600 flex-wrap">
                <li><Link href="/" className="hover:text-cyan-400 transition-colors">Inicio</Link></li>
                <li aria-hidden="true">/</li>
                <li><Link href={`/category/${article.category}/`} className="hover:text-cyan-400 transition-colors">{categoryLabel}</Link></li>
                <li aria-hidden="true">/</li>
                <li className="text-slate-400 truncate max-w-[200px]" aria-current="page">{article.title}</li>
              </ol>
            </nav>

            <article>
              <header className="mb-10 pb-6 border-b border-slate-800/60">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <CategoryTag category={article.category} />
                  {article.tags.map(tag => (
                    <span key={tag} className="text-xs font-medium text-slate-400 bg-slate-800/80 border border-slate-700 px-2 py-0.5 rounded shrink-0">
                      {tag}
                    </span>
                  ))}
                  <span className="ml-auto text-xs text-slate-500 font-medium flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    {article.readingTime} min de lectura
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-100 mb-4">{article.title}</h1>
                {article.description && (
                  <p className="text-lg text-slate-400 leading-relaxed">{article.description}</p>
                )}
              </header>

              {tools.length > 0 && (
                <aside className="mb-10 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-900/50 bg-emerald-950/20 px-4 py-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mr-1">Probalo con</span>
                  {tools.map(t => (
                    <Link
                      key={t.id}
                      href={`${t.href}/`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-300 hover:border-emerald-600 hover:text-emerald-300 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={t.iconPath} /></svg>
                      {t.label}
                    </Link>
                  ))}
                </aside>
              )}

              <TableOfContents 
                headings={article.headings} 
                className="block xl:hidden mb-10 bg-slate-900/50 border border-slate-800 rounded-lg p-5" 
                isMobile={true} 
              />

              <div className="prose prose-invert prose-cyan prose-sm max-w-none
                prose-headings:text-slate-100 prose-headings:font-semibold
                prose-p:text-slate-300 prose-p:leading-relaxed
                prose-strong:text-slate-200
                prose-code:text-cyan-300
                prose-a:text-cyan-400 hover:prose-a:text-cyan-300 transition-colors
                prose-li:text-slate-300
                prose-blockquote:border-green-700 prose-blockquote:bg-cyan-900/10 prose-blockquote:px-4 prose-blockquote:py-2 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-slate-300
                prose-hr:border-slate-800/60
                prose-table:text-slate-300 prose-thead:text-slate-200
              ">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // The code renderer below draws its own frame: drop markdown's <pre> wrapper
                    pre: ({ children }) => <>{children}</>,
                    h1: ({ children }) => <Heading level={2}>{children}</Heading>,
                    h2: ({ children }) => <Heading level={2}>{children}</Heading>,
                    h3: ({ children }) => <Heading level={3}>{children}</Heading>,
                    h4: ({ children }) => <Heading level={4}>{children}</Heading>,
                    table: ({ children }) => <div className="overflow-x-auto my-6 border border-slate-800 rounded-lg"><table className="w-full text-left m-0">{children}</table></div>,
                    code(props) {
                      const { children, className, node, ...rest } = props
                      const match = /language-(\w+)/.exec(className || '')
                      
                      const raw = String(children)
                      // Fenced blocks without a language have no class but always end in a newline
                      if (!match && !raw.includes('\n')) {
                        return (
                          <code className="group/code relative inline-code" {...rest}>
                            {children}
                            <CopyButton text={extractText(children)} variant="inline" />
                          </code>
                        )
                      }

                      const language = match?.[1] ?? 'text'
                      const content = raw.replace(/\n$/, '')

                      if (language === 'mermaid') {
                        return <MermaidDiagram chart={content} />
                      }

                      const lineCount = content.split('\n').length
                      return (
                        <div className="not-prose relative group/code-block my-6 rounded-lg overflow-hidden border border-slate-800 shadow-sm">
                          <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
                            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{language}</span>
                          </div>
                          <SyntaxHighlighter
                            children={content}
                            style={vscDarkPlus}
                            language={language}
                            PreTag="div"
                            showLineNumbers={lineCount > 5}
                            lineNumberStyle={{ minWidth: '2.25em', color: '#475569' }}
                            customStyle={{ margin: 0, background: '#0d1117', padding: '1rem', fontSize: '0.8125rem', lineHeight: 1.6 }}
                            codeTagProps={{ style: { fontFamily: 'var(--font-mono)' } }}
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

              {related.length > 0 && (
                <section aria-labelledby="related-heading" className="mt-16 pt-8 border-t border-slate-800/60">
                  <h2 id="related-heading" className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-4">Artículos relacionados</h2>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {related.map(r => (
                      <Link
                        key={`${r.category}/${r.slug}`}
                        href={`/article/${r.category}/${r.slug}/`}
                        className="group flex flex-col gap-2 p-4 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-cyan-700 hover:bg-slate-800/50 transition-all"
                      >
                        <CategoryTag category={r.category} className="self-start" />
                        <span className="text-sm font-medium text-slate-300 group-hover:text-cyan-400 transition-colors line-clamp-2">{r.title}</span>
                        {r.description && <span className="text-xs text-slate-500 line-clamp-2">{r.description}</span>}
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {(prev || next) && (
                <nav aria-label="Navegación entre artículos" className={`${related.length > 0 ? 'mt-6' : 'mt-16 pt-8 border-t border-slate-800/60'} grid grid-cols-2 gap-4`}>
                  {prev ? (
                    <Link
                      href={`/article/${prev.category}/${prev.slug}/`}
                      className="group flex flex-col gap-1.5 p-4 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-cyan-700 hover:bg-slate-800/50 transition-all shadow-sm hover:shadow-md"
                    >
                      <span className="text-xs font-semibold text-slate-500 tracking-wider uppercase">← Anterior</span>
                      <span className="text-sm font-medium text-slate-300 group-hover:text-cyan-400 transition-colors line-clamp-2">{prev.title}</span>
                    </Link>
                  ) : <div />}
                  {next ? (
                    <Link
                      href={`/article/${next.category}/${next.slug}/`}
                      className="group flex flex-col gap-1.5 p-4 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-cyan-700 hover:bg-slate-800/50 transition-all shadow-sm hover:shadow-md text-right"
                    >
                      <span className="text-xs font-semibold text-slate-500 tracking-wider uppercase">Siguiente →</span>
                      <span className="text-sm font-medium text-slate-300 group-hover:text-cyan-400 transition-colors line-clamp-2">{next.title}</span>
                    </Link>
                  ) : <div />}
                </nav>
              )}
            </article>
          </div>

          <TableOfContents headings={article.headings} />
          
        </div>
      </main>

      <ScrollToTop targetId="article-main" />
    </div>
  )
}
