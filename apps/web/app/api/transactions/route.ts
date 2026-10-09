import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth-helper'
import type { MasterTransaction } from '@/lib/types'

export async function GET(req: Request) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const beforeDate = searchParams.get('beforeDate')
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '30', 10)))

  let query = supabase
    .from('master_transactions')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (beforeDate) {
    query = query.lt('date', beforeDate)
  }

  const { data: transactions, error } = await query.returns<MasterTransaction[]>()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const hasMore = (transactions?.length ?? 0) === limit
  const nextCursor = transactions && transactions.length > 0 ? transactions[transactions.length - 1].date : null

  return NextResponse.json({
    transactions: transactions ?? [],
    hasMore,
    nextCursor
  })
}
