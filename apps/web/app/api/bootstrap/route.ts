import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth-helper'
import { getAccountBalances } from '@/lib/networth'
import { getRatesMatrix } from '@/lib/fx'
import type { Account, Category, Institution, MasterTransaction, Person, UserSettings } from '@/lib/types'
import type { AccountBalance } from '@/lib/ledger/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const tenDaysAgoDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
  const tenDaysAgo = tenDaysAgoDate.toISOString().slice(0, 10)

  // Consultas optimizadas en paralelo
  const [
    { data: settings },
    { data: accounts },
    { data: categories },
    { data: people },
    { data: estimates },
    { data: recentTransactions },
    rpcBalancesResult
  ] = await Promise.all([
    supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle<UserSettings>(),

    supabase
      .from('accounts')
      .select('id, institution_id, name, type, currency_native, credit_limit, is_active, institutions!inner(id, name, is_active)')
      .eq('is_active', true)
      .eq('institutions.is_active', true)
      .order('name'),

    supabase
      .from('categories')
      .select('*')
      .order('name')
      .returns<Category[]>(),

    supabase
      .from('people')
      .select('*')
      .order('name')
      .returns<Person[]>(),

    supabase
      .from('budget_estimates')
      .select('*')
      .eq('is_active', true),

    // Transacciones de los últimos 10 días o hasta 30 recientes
    supabase
      .from('master_transactions')
      .select('*')
      .gte('date', tenDaysAgo)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50)
      .returns<MasterTransaction[]>(),

    // Intenta usar la RPC optimizada en Postgres
    supabase.rpc('get_account_balances_summary', { p_as_of_date: today })
  ])

  let balances: AccountBalance[] = []
  if (!rpcBalancesResult.error && rpcBalancesResult.data) {
    balances = rpcBalancesResult.data.map((r: { account_id: string; currency: string; balance: number }) => ({
      accountId: r.account_id,
      currency: r.currency,
      balance: Number(r.balance)
    }))
  } else {
    // Fallback de compatibilidad con getAccountBalances si la migración aún no fue ejecutada
    balances = await getAccountBalances(supabase, today)
  }

  const displayCurr = settings?.display_currency || 'EUR'
  const activeCurrs = (settings?.active_currencies || []).map((c) => c.code)
  const accountCurrs = (accounts || []).map((a) => a.currency_native)
  const uniqueCurrencies = Array.from(
    new Set([displayCurr, ...activeCurrs, ...accountCurrs, 'USD', 'EUR', 'ARS'])
  ).filter(Boolean)

  const fxRates: Record<string, number> = await getRatesMatrix(uniqueCurrencies).catch(() => ({}))

  // Inyectar tasas manuales configuradas contra la moneda global
  if (settings?.active_currencies && Array.isArray(settings.active_currencies)) {
    for (const c of settings.active_currencies) {
      if (
        c.rate_mode === 'manual' &&
        typeof c.custom_rate_against_global === 'number' &&
        c.custom_rate_against_global > 0
      ) {
        const globalToCustom = `${displayCurr.toUpperCase()}_${c.code.toUpperCase()}`
        const customToGlobal = `${c.code.toUpperCase()}_${displayCurr.toUpperCase()}`
        fxRates[globalToCustom] = c.custom_rate_against_global
        fxRates[customToGlobal] = Math.round((1 / c.custom_rate_against_global) * 1000000) / 1000000
      }
    }
  }

  return NextResponse.json({
    userId: user.id,
    asOfDate: today,
    settings: settings ?? {
      user_id: user.id,
      display_currency: 'EUR',
      theme: 'system'
    },
    accounts: accounts ?? [],
    categories: categories ?? [],
    people: people ?? [],
    estimates: estimates ?? [],
    balances,
    recentTransactions: recentTransactions ?? [],
    fxRates
  })
}
