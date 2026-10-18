import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth-helper'
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard'
import type { MasterTransaction, Category, Account } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)
  if (!user) redirect('/login')

  let transactions: MasterTransaction[] = []
  let categories: Category[] = []
  let accounts: Account[] = []
  let displayCurrency = 'EUR'

  try {
    const [
      { data: txData },
      { data: catData },
      { data: accData },
      { data: settingsData }
    ] = await Promise.all([
      supabase
        .from('master_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(200)
        .returns<MasterTransaction[]>(),

      supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true })
        .returns<Category[]>(),

      supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .returns<Account[]>(),

      supabase
        .from('user_settings')
        .select('display_currency')
        .eq('user_id', user.id)
        .maybeSingle()
    ])

    transactions = txData ?? []
    categories = catData ?? []
    accounts = accData ?? []
    displayCurrency = settingsData?.display_currency ?? 'EUR'
  } catch {
    // Si la conexión falla (offline), AnalyticsDashboard toma los datos reactivos desde LedgerContext
  }

  return (
    <main className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">
          Análisis de Datos & Flujos
        </h1>
        <p className="text-xs text-text-muted mt-1">
          Métricas de consumo, comparativa mensual de ingresos/gastos y distribución multi-moneda.
        </p>
      </div>

      <AnalyticsDashboard
        initialTransactions={transactions}
        categories={categories}
        accounts={accounts}
        displayCurrency={displayCurrency}
      />
    </main>
  )
}
