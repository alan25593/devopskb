import { NextRequest, NextResponse } from 'next/server'
import dns from 'dns/promises'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const domain = searchParams.get('domain')
  const type = searchParams.get('type') || 'A'

  if (!domain) {
    return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
  }

  try {
    let result: any = []

    if (type === 'ALL') {
      const types = ['A', 'AAAA', 'MX', 'TXT', 'NS']
      const results: any = {}
      await Promise.all(types.map(async (t) => {
        try {
          results[t] = await dns.resolve(domain, t as any)
        } catch {
          results[t] = []
        }
      }))
      result = results
    } else if (type === 'REVERSE') {
      result = await dns.reverse(domain)
    } else {
      result = await dns.resolve(domain, type as any)
    }

    return NextResponse.json({ result })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'DNS lookup failed' }, { status: 400 })
  }
}

