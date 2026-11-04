import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PersonDetailClient } from '@/components/PersonDetailClient'
import type { Account, Category, MasterTransaction, Person } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function PersonDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ period?: string }>
}) {
  const { id } = await params
  const resolvedSearch = searchParams ? await searchParams : {}
  const supabase = await createClient()

  const todayStr = new Date().toISOString().slice(0, 10)
  const defaultPeriod = todayStr.slice(0, 7)
  const initialPeriod =
    resolvedSearch.period && /^\d{4}-\d{2}$/.test(resolvedSearch.period)
      ? resolvedSearch.period
      : defaultPeriod

  const [
    { data: person },
    { data: transactions },
    { data: settings },
    { data: accounts },
    { data: categories }
  ] = await Promise.all([
    supabase.from('people').select('*').eq('id', id).single<Person>(),
    supabase
      .from('master_transactions')
      .select('*')
      .eq('person_id', id)
      .order('date', { ascending: true })
      .returns<MasterTransaction[]>(),
    supabase.from('user_settings').select('whatsapp_template').maybeSingle(),
    supabase
      .from('accounts')
      .select('*, institutions(name)')
      .eq('is_active', true)
      .returns<(Account & { institutions?: { name: string } })[]>(),
    supabase.from('categories').select('*').returns<Category[]>()
  ])
  if (!person) notFound()

  return (
    <main className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
      <PersonDetailClient
        person={person}
        initialTransactions={transactions ?? []}
        whatsappTemplate={settings?.whatsapp_template ?? null}
        initialAccounts={accounts ?? []}
        initialCategories={categories ?? []}
        initialPeriod={initialPeriod}
        todayStr={todayStr}
      />
    </main>
  )
}
