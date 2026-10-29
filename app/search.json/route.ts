import { getArticlesForSearch } from '@/lib/content'

// Emitted as /search.json at build time: the Ctrl+K palette fetches it lazily on first open
export const dynamic = 'force-static'

export function GET() {
  return Response.json(getArticlesForSearch())
}
