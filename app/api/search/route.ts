import { NextResponse } from 'next/server'
import { getArticlesForSearch } from '@/lib/content'

export async function GET() {
  const articles = getArticlesForSearch()
  return NextResponse.json(articles)
}
