import { getArticlesForSearch } from '@/lib/content'
import SearchPage from '@/components/SearchPage'

export default function Home() {
  const articles = getArticlesForSearch()
  return <SearchPage articles={articles} />
}
