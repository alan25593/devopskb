import { getArticlesForSearch } from '@/lib/content'
import SearchPage from '@/components/SearchPage'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
}

export default function Home() {
  const articles = getArticlesForSearch()
  return <SearchPage articles={articles} />
}
