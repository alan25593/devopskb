import Link from 'next/link'
import CategoryTag from './CategoryTag'

interface LearnMoreArticle {
  slug: string
  category: string
  title: string
  description: string
}

interface LearnMoreProps {
  articles: LearnMoreArticle[]
}

export default function LearnMore({ articles }: LearnMoreProps) {
  if (!articles || articles.length === 0) return null

  return (
    <section className="mt-12 pt-8 border-t border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-500">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        Aprendé más
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {articles.map(article => (
          <Link
            key={`${article.category}/${article.slug}`}
            href={`/article/${article.category}/${article.slug}/`}
            className="block overflow-hidden bg-slate-900/30 backdrop-blur-sm border border-slate-800 rounded-xl p-4 hover:border-cyan-500/40 hover:bg-slate-800/40 transition-all duration-300 group"
          >
            <div className="flex items-center gap-2 mb-2 min-w-0">
              <CategoryTag category={article.category} />
              <span className="font-medium text-slate-200 group-hover:text-cyan-300 truncate transition-colors flex-1 min-w-0">
                {article.title}
              </span>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed line-clamp-2">
              {article.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  )
}
