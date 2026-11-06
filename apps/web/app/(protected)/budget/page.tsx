import { createClient } from '@/lib/supabase/server'
import { getRatesMatrix } from '@/lib/fx'
import { buildCustomRatesMap } from '@/lib/budget/calculations'
import { BudgetClient } from '@/components/budget/BudgetClient'
import type {
  Account,
  BudgetEstimate,
  Category,
  LoanWithInstallments,
  MasterTransaction,
  Person,
  UserSettings
} from '@/lib/types'

export default async function BudgetPage() {
  const supabase = await createClient()
  const now = new Date()
  const initialPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  let estimates: BudgetEstimate[] = []
  let transactions: MasterTransaction[] = []
  let loans: LoanWithInstallments[] = []
  let categories: Category[] = []
  let accounts: (Account & { institutions?: { name: string } | null })[] = []
  let people: Person[] = []
  let settings: Pick<UserSettings, 'display_currency' | 'active_currencies'> | null = null

  try {
    const [
      estRes,
      txRes,
      loansRes,
      catRes,
      accRes,
      peopleRes,
      settingsRes
    ] = await Promise.all([
      supabase
        .from('budget_estimates')
        .select('*, categories(id, name, icon, color)')
        .order('due_day', { ascending: true }),
      supabase
        .from('master_transactions')
        .select('*')
        .in('type', ['OUTCOME', 'INCOME'])
        .order('date', { ascending: false })
        .limit(500),
      supabase
        .from('loans')
        .select('*, installments:loan_installments(*)')
        .eq('is_active', true)
        .eq('direction', 'BORROWED'),
      supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true }),
      supabase
        .from('accounts')
        .select('id, name, type, currency_native, credit_limit, closing_day, institution_id, is_active, institutions(name)')
        .eq('is_active', true),
      supabase
        .from('people')
        .select('id, name, phone, is_active'),
      supabase
        .from('user_settings')
        .select('display_currency, active_currencies')
        .maybeSingle()
    ])

    estimates = (estRes.data as BudgetEstimate[]) ?? []
    transactions = (txRes.data as MasterTransaction[]) ?? []
    loans = (loansRes.data as unknown as LoanWithInstallments[]) ?? []
    categories = (catRes.data as Category[]) ?? []
    accounts =
      (accRes.data as unknown as (Account & {
        institutions?: { name: string } | null
      })[]) ?? []
    people = (peopleRes.data as Person[]) ?? []
    settings = settingsRes.data
  } catch {
    // Si la conexión falla (offline), mostramos estado seguro hidratado con cliente
  }

  const displayCurrency = settings?.display_currency ?? 'EUR'
  const activeCurrencyCodes = Array.isArray(settings?.active_currencies)
    ? settings!.active_currencies.map((c) => c.code)
    : ['EUR', 'USD', 'UYU', 'ARS', 'AUD', 'NZD']

  const allCurrencies = Array.from(
    new Set([
      displayCurrency,
      ...activeCurrencyCodes,
      ...estimates.map((e) => e.currency),
      ...accounts.map((a) => a.currency_native)
    ])
  )

  let marketRates: Record<string, number> = {}
  try {
    marketRates = await getRatesMatrix(allCurrencies)
  } catch {
    // Fallback silencioso a tasas manuales
  }

  const ratesMap = buildCustomRatesMap(
    displayCurrency,
    settings?.active_currencies,
    marketRates
  )

  return (
    <main className="max-w-5xl mx-auto p-4 md:p-6">
      <BudgetClient
        initialPeriod={initialPeriod}
        initialEstimates={estimates}
        initialTransactions={transactions}
        initialLoans={loans}
        categories={categories}
        accounts={accounts}
        people={people}
        displayCurrency={displayCurrency}
        currencies={allCurrencies}
        ratesMap={ratesMap}
      />
    </main>
  )
}
