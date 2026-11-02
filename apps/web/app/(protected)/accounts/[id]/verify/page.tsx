import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth-helper'
import {
  CreditCardStatementVerifier,
  type StatementTransactionRow
} from '@/components/credit-card-verify/CreditCardStatementVerifier'
import type { Account, Category, Person } from '@/lib/types'

export const metadata = {
  title: 'Verificar Estado de Cuenta — Finance Nomad',
  description: 'Compará tus registros con el estado de cuenta mensual de tu tarjeta de crédito'
}

export default async function AccountVerifyStatementPage({
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

  const [
    { data: account },
    { data: transactions },
    { data: categories },
    { data: people },
    { data: settings }
  ] = await Promise.all([
    supabase
      .from('accounts')
      .select('*, institutions(name)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single<Account & { institutions: { name: string } | null }>(),
    supabase
      .from('master_transactions')
      .select('*, categories(name), people(name)')
      .eq('account_id', id)
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .returns<StatementTransactionRow[]>(),
    supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('name')
      .returns<Category[]>(),
    supabase
      .from('people')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('name')
      .returns<Person[]>(),
    supabase
      .from('user_settings')
      .select('display_currency')
      .eq('user_id', user.id)
      .maybeSingle<{ display_currency: string }>()
  ])

  if (!account || account.type !== 'credit_card') {
    notFound()
  }

  const todayPeriod = new Date().toISOString().slice(0, 7)
  const initialPeriod =
    resolvedSearchParams.period && /^\d{4}-\d{2}$/.test(resolvedSearchParams.period)
      ? resolvedSearchParams.period
      : todayPeriod

  return (
    <main className="max-w-5xl mx-auto p-4 md:p-6">
      <CreditCardStatementVerifier
        account={account}
        transactions={transactions ?? []}
        categories={categories ?? []}
        people={people ?? []}
        initialPeriod={initialPeriod}
        displayCurrency={settings?.display_currency || account.currency_native}
      />
    </main>
  )
}

