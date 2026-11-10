import { redirect } from 'next/navigation'
import { rethrowIfRedirect } from '@/lib/next/rethrow-redirect'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth-helper'
import { getAccountBalances, convertToDisplayCurrency } from '@/lib/networth'
import { DashboardClient } from '@/components/DashboardClient'
import type { Account, MasterTransaction, UserSettings, LoanWithInstallments, Person, Category } from '@/lib/types'
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
  let loans: LoanWithInstallments[] = []
  let people: Person[] = []
  let categories: Category[] = []
  let balances: AccountBalance[] = []
  let netWorth = 0
  let realSpent = 0
  const customRates: Record<string, number> = {}

  try {
    const [
      settingsRes,
      accountsRes,
      transactionsRes,
      estimatesRes,
      loansRes,
      peopleRes,
      categoriesRes,
      balancesRes
    ] = await Promise.all([
      supabase
        .from('user_settings')
        .select('display_currency, onboarding_completed, active_currencies')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('accounts')
        .select('id, name, type, currency_native, closing_day, due_day, credit_limit, is_active, institutions!inner(name)')
        .eq('is_active', true)
        .eq('institutions.is_active', true)
        .returns<(Account & { institutions: { name: string } })[]>(),
      supabase
        .from('master_transactions')
        .select('*')
        .order('date', { ascending: false })
        .limit(300)
        .returns<MasterTransaction[]>(),
      supabase
        .from('budget_estimates')
        .select('*')
        .eq('is_active', true)
        .eq('type', 'EXPENSE_ESTIMATE'),
      supabase
        .from('loans')
        .select(`
          *,
          institution:counterparty_institution_id (id, name),
          person:beneficiary_person_id (id, name),
          installments:loan_installments (*)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('people')
        .select('id, name, is_active')
        .returns<Person[]>(),
      supabase
        .from('categories')
        .select('id, name, icon, color')
        .order('name', { ascending: true })
        .returns<Category[]>(),
      getAccountBalances(supabase, today)
    ])

    settings = settingsRes.data
    accounts = accountsRes.data ?? []
    transactions = transactionsRes.data ?? []
    estimates = estimatesRes.data ?? []
    loans = (loansRes.data as unknown as LoanWithInstallments[]) ?? []
    people = peopleRes.data ?? []
    categories = categoriesRes.data ?? []
    balances = balancesRes

    // Redirección inteligente al asistente de bienvenida si no hay cuentas configuradas
    if (accounts.length === 0 && !settings?.onboarding_completed) {
      redirect('/welcome')
    }

    const displayCurrency = settings?.display_currency ?? 'EUR'
    const categoryIds = estimates.map((e) => e.category_id)

    // Construir mapa de cotizaciones manuales si el usuario las configuró
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
            .select('amount_account, currency_account, category_id, date, type')
            .in('category_id', categoryIds)
            .eq('type', 'OUTCOME')
            .eq('status', 'COMPLETED')
            .gte('date', start)
            .lte('date', end)
        : Promise.resolve({ data: [] })
    ])
    netWorth = netWorthVal

    const txBalances: AccountBalance[] = (monthTxResult.data ?? []).map(
      (t: { amount_account: number; currency_account?: string }, idx: number) => ({
        accountId: `tx-${idx}`,
        currency: t.currency_account || displayCurrency,
        balance: Math.abs(Number(t.amount_account))
      })
    )
    realSpent =
      txBalances.length > 0
        ? await convertToDisplayCurrency(txBalances, displayCurrency, today, customRates)
        : 0

    // Normalizar estimated_amount de cada estimado a displayCurrency para que el Dashboard sume divisas homogéneas
    estimates = await Promise.all(
      estimates.map(async (est: any) => {
        const estCurrency = est.currency || displayCurrency
        if (estCurrency.toUpperCase() === displayCurrency.toUpperCase()) {
          return est
        }
        const convertedEst = await convertToDisplayCurrency(
          [{ accountId: est.id, currency: estCurrency, balance: Number(est.estimated_amount) }],
          displayCurrency,
          today,
          customRates
        )
        return {
          ...est,
          estimated_amount: convertedEst > 0 ? convertedEst : Number(est.estimated_amount),
          currency: displayCurrency
        }
      })
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
      initialLoans={loans}
      initialPeople={people}
      initialCategories={categories}
      initialCustomRates={customRates}
      displayCurrency={displayCurrency}
      initialNetWorth={netWorth}
      initialRealSpent={realSpent}
      monthStart={start}
      monthEnd={end}
    />
  )
}
