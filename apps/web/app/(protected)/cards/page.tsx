import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth-helper'
import { getRate } from '@/lib/fx'
import { CreditCardsDashboard } from '@/components/cards/CreditCardsDashboard'
import type { CardAccountWithInstitution } from '@/lib/credit-cards/analytics'
import type { Category, MasterTransaction, Person, UserSettings } from '@/lib/types'

export const metadata = {
  title: 'Tarjetas de Crédito — Finance Nomad',
  description: 'Centro de control, análisis de resúmenes, proyección de cuotas y gastos compartidos en tarjetas de crédito'
}

export const dynamic = 'force-dynamic'

export default async function CreditCardsPage({
  searchParams
}: {
  searchParams?: Promise<{ period?: string }>
}) {
  const resolvedParams = searchParams ? await searchParams : {}
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)
  if (!user) redirect('/login')

  const todayStr = new Date().toISOString().slice(0, 10)
  const defaultPeriod = todayStr.slice(0, 7)
  const initialPeriod =
    resolvedParams.period && /^\d{4}-\d{2}$/.test(resolvedParams.period)
      ? resolvedParams.period
      : defaultPeriod

  let accounts: CardAccountWithInstitution[] = []
  let transactions: MasterTransaction[] = []
  let categories: Category[] = []
  let people: Person[] = []
  let displayCurrency = 'EUR'
  const customRates: Record<string, number> = {}

  try {
    const [
      { data: accData },
      { data: txData },
      { data: catData },
      { data: peopleData },
      { data: settingsData }
    ] = await Promise.all([
      supabase
        .from('accounts')
        .select('*, institutions(id, name, is_active)')
        .eq('user_id', user.id)
        .order('name', { ascending: true })
        .returns<CardAccountWithInstitution[]>(),
      supabase
        .from('master_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .returns<MasterTransaction[]>(),
      supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true })
        .returns<Category[]>(),
      supabase
        .from('people')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true })
        .returns<Person[]>(),
      supabase
        .from('user_settings')
        .select('display_currency, active_currencies')
        .eq('user_id', user.id)
        .maybeSingle<{
          display_currency: string
          active_currencies?: UserSettings['active_currencies']
        }>()
    ])

    accounts = accData ?? []
    transactions = txData ?? []
    categories = catData ?? []
    people = peopleData ?? []
    displayCurrency = settingsData?.display_currency || 'EUR'

    // 1. Tasas manuales configuradas por el usuario
    if (settingsData?.active_currencies && Array.isArray(settingsData.active_currencies)) {
      for (const c of settingsData.active_currencies) {
        if (
          c.rate_mode === 'manual' &&
          typeof c.custom_rate_against_global === 'number' &&
          c.custom_rate_against_global > 0
        ) {
          const g = displayCurrency.toUpperCase()
          const code = c.code.toUpperCase()
          customRates[`${g}_${code}`] = c.custom_rate_against_global
          customRates[`${code}_${g}`] = 1 / c.custom_rate_against_global
        }
      }
    }

    // 2. Pre-resolver tasas de mercado para las monedas operadas en tarjetas hacia displayCurrency y nativa
    const distinctCurrencies = new Set<string>([displayCurrency.toUpperCase()])
    for (const acc of accounts) {
      if (acc.type === 'credit_card' && acc.currency_native) {
        distinctCurrencies.add(acc.currency_native.toUpperCase())
      }
    }
    for (const tx of transactions) {
      if (tx.currency_original) distinctCurrencies.add(tx.currency_original.toUpperCase())
      if (tx.currency_account) distinctCurrencies.add(tx.currency_account.toUpperCase())
    }

    const pairsToFetch: [string, string][] = []
    const currs = Array.from(distinctCurrencies)
    for (const from of currs) {
      for (const to of currs) {
        if (from !== to && !customRates[`${from}_${to}`]) {
          pairsToFetch.push([from, to])
        }
      }
    }

    await Promise.all(
      pairsToFetch.map(async ([from, to]) => {
        try {
          const r = await getRate(todayStr, from, to)
          if (r > 0) {
            customRates[`${from}_${to}`] = r
          }
        } catch {
          // Fallback silencioso a 1:1 o caché del cliente
        }
      })
    )
  } catch {
    // Si está offline, CreditCardsDashboard hidrata desde LedgerContext (IndexedDB)
  }

  return (
    <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">
          Tarjetas de Crédito
        </h1>
        <p className="text-xs text-text-muted mt-0.5">
          Analizá tus resúmenes mensuales, proyección de cuotas futuras y gastos compartidos en un solo lugar
        </p>
      </div>

      <CreditCardsDashboard
        initialAccounts={accounts}
        initialTransactions={transactions}
        initialCategories={categories}
        initialPeople={people}
        initialDisplayCurrency={displayCurrency}
        initialCustomRates={customRates}
        initialPeriod={initialPeriod}
        todayStr={todayStr}
      />
    </main>
  )
}
