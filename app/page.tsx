import { getAllArticles } from '@/lib/content'
import SearchPage from '@/components/SearchPage'

export default function Home() {
  const articles = getAllArticles()
  return <SearchPage articles={articles} />
}
