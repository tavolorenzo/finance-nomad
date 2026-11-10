import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth-helper'
import { getRate } from '@/lib/fx'
import {
  AccountDetailClient,
  type TransactionWithRelations
} from '@/components/AccountDetailClient'
import type { Account, Institution, UserSettings } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function AccountDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ period?: string }>
}) {
  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)
  if (!user) redirect('/login')

  const todayStr = new Date().toISOString().slice(0, 10)
  const defaultPeriod = todayStr.slice(0, 7)
  const initialPeriod =
    resolvedSearchParams.period && /^\d{4}-\d{2}$/.test(resolvedSearchParams.period)
      ? resolvedSearchParams.period
      : defaultPeriod

  // Consulta en paralelo de cuenta, cuentas activas, transacciones asociadas y preferencias de moneda
  const [{ data: account }, { data: allAccounts }, { data: transactions }, { data: settings }] =
    await Promise.all([
      supabase
        .from('accounts')
        .select('*, institutions(*)')
        .eq('id', id)
        .eq('user_id', user.id)
        .single<Account & { institutions: Institution }>(),
      supabase
        .from('accounts')
        .select('*, institutions(name)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .returns<(Account & { institutions: { name: string } | null })[]>(),
      supabase
        .from('master_transactions')
        .select('*, categories(name), people(name)')
        .eq('account_id', id)
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .returns<TransactionWithRelations[]>(),
      supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle<UserSettings>()
    ])

  if (!account) notFound()

  const userDisplayCurrency = settings?.display_currency || account.currency_native
  const customRates: Record<string, number> = {}

  // 1. Tasas manuales configuradas por el usuario
  if (settings?.active_currencies && Array.isArray(settings.active_currencies)) {
    for (const c of settings.active_currencies) {
      if (
        c.rate_mode === 'manual' &&
        typeof c.custom_rate_against_global === 'number' &&
        c.custom_rate_against_global > 0
      ) {
        const globalToCustom = `${userDisplayCurrency.toUpperCase()}_${c.code.toUpperCase()}`
        const customToGlobal = `${c.code.toUpperCase()}_${userDisplayCurrency.toUpperCase()}`
        customRates[globalToCustom] = c.custom_rate_against_global
        customRates[customToGlobal] =
          Math.round((1 / c.custom_rate_against_global) * 1000000) / 1000000
      }
    }
  }

  // 2. Pre-resolver tasas de mercado para divisas involucradas
  const distinctCurrencies = new Set<string>([
    userDisplayCurrency.toUpperCase(),
    account.currency_native.toUpperCase()
  ])
  for (const tx of transactions ?? []) {
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
        // Fallback silencioso
      }
    })
  )

  return (
    <main className="max-w-5xl mx-auto p-4 md:p-6">
      <AccountDetailClient
        account={account}
        allAccounts={allAccounts ?? []}
        initialTransactions={transactions ?? []}
        initialUserSettings={settings}
        initialCustomRates={customRates}
        initialPeriod={initialPeriod}
        todayStr={todayStr}
      />
    </main>
  )
}
