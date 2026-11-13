import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth-helper'
import { getMultipleTickerQuotes } from '@/lib/portfolio/quotes'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const tickersParam = req.nextUrl.searchParams.get('tickers') || ''
  const tickers = tickersParam
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 40) // Límite defensivo

  if (tickers.length === 0) {
    return NextResponse.json({ quotes: {} })
  }

  const quotes = await getMultipleTickerQuotes(tickers)
  return NextResponse.json({ quotes })
}

