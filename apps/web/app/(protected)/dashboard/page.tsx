import { redirect } from 'next/navigation'
import { rethrowIfRedirect } from '@/lib/next/rethrow-redirect'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth-helper'
import { getAccountBalances, convertToDisplayCurrency } from '@/lib/networth'
import { DashboardClient } from '@/components/DashboardClient'
import type { Account, MasterTransaction, UserSettings } from '@/lib/types'
import type { AccountBalance } from '@/lib/ledger/types'

function monthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10)
  return { start, end }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)
  if (!user) redirect('/login')

  const today = new Date().toISOString().slice(0, 10)
  const { start, end } = monthRange()

  // Fase 1: Consultas iniciales en paralelo con tolerancia a fallos offline
  let settings: { display_currency: string; onboarding_completed?: boolean; active_currencies?: UserSettings['active_currencies'] } | null = null
  let accounts: (Account & { institutions: { name: string } })[] = []
  let transactions: MasterTransaction[] = []
  let estimates: any[] = []
  let balances: AccountBalance[] = []
  let netWorth = 0
  let realSpent = 0

  try {
    const [
      settingsRes,
      accountsRes,
      transactionsRes,
      estimatesRes,
      balancesRes
    ] = await Promise.all([
      supabase
        .from('user_settings')
        .select('display_currency, onboarding_completed, active_currencies')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('accounts')
        .select('id, name, type, currency_native, institutions!inner(name)')
        .eq('is_active', true)
        .eq('institutions.is_active', true)
        .returns<(Account & { institutions: { name: string } })[]>(),
      supabase
        .from('master_transactions')
        .select('*')
        .order('date', { ascending: false })
        .limit(5)
        .returns<MasterTransaction[]>(),
      supabase
        .from('budget_estimates')
        .select('*')
        .eq('is_active', true)
        .eq('type', 'EXPENSE_ESTIMATE'),
      getAccountBalances(supabase, today)
    ])

    settings = settingsRes.data
    accounts = accountsRes.data ?? []
    transactions = transactionsRes.data ?? []
    estimates = estimatesRes.data ?? []
    balances = balancesRes

    // Redirección inteligente al asistente de bienvenida si no hay cuentas configuradas
    if (accounts.length === 0 && !settings?.onboarding_completed) {
      redirect('/welcome')
    }

    const displayCurrency = settings?.display_currency ?? 'EUR'
    const categoryIds = estimates.map((e) => e.category_id)

    // Construir mapa de cotizaciones manuales si el usuario las configuró
    const customRates: Record<string, number> = {}
    if (settings?.active_currencies && Array.isArray(settings.active_currencies)) {
      for (const c of settings.active_currencies) {
        if (
          c.rate_mode === 'manual' &&
          typeof c.custom_rate_against_global === 'number' &&
          c.custom_rate_against_global > 0
        ) {
          const globalToCustom = `${displayCurrency.toUpperCase()}_${c.code.toUpperCase()}`
          const customToGlobal = `${c.code.toUpperCase()}_${displayCurrency.toUpperCase()}`
          customRates[globalToCustom] = c.custom_rate_against_global
          customRates[customToGlobal] = Math.round((1 / c.custom_rate_against_global) * 1000000) / 1000000
        }
      }
    }

    // Fase 2: Conversión de divisas y gasto del mes en paralelo
    const [netWorthVal, monthTxResult] = await Promise.all([
      convertToDisplayCurrency(balances, displayCurrency, today, customRates),
      categoryIds.length > 0
        ? supabase
            .from('master_transactions')
            .select('amount_account, category_id, date, type')
            .in('category_id', categoryIds)
            .eq('type', 'OUTCOME')
            .eq('status', 'COMPLETED')
            .gte('date', start)
            .lte('date', end)
        : Promise.resolve({ data: [] })
    ])
    netWorth = netWorthVal
    realSpent = (monthTxResult.data ?? []).reduce(
      (sum: number, t: { amount_account: number }) => sum + t.amount_account,
      0
    )
  } catch (error) {
    rethrowIfRedirect(error)
    // Si la conexión a Supabase no está disponible (offline), los datos se resuelven
    // reactivamente en el cliente mediante LedgerContext (IndexedDB).
  }

  const displayCurrency = settings?.display_currency ?? 'EUR'

  return (
    <DashboardClient
      initialAccounts={accounts}
      initialBalances={balances}
      initialTransactions={transactions}
      initialEstimates={estimates}
      displayCurrency={displayCurrency}
      initialNetWorth={netWorth}
      initialRealSpent={realSpent}
      monthStart={start}
      monthEnd={end}
    />
  )
}
