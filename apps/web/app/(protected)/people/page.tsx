import { createClient } from '@/lib/supabase/server'
import {
  PeopleDirectoryClient,
  type PendingPersonRow
} from '@/components/PeopleDirectoryClient'
import type { Person } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function PeoplePage({
  searchParams
}: {
  searchParams?: Promise<{ period?: string }>
}) {
  const resolvedParams = searchParams ? await searchParams : {}
  const supabase = await createClient()
  const todayStr = new Date().toISOString().slice(0, 10)
  const defaultPeriod = todayStr.slice(0, 7)
  const initialPeriod =
    resolvedParams.period && /^\d{4}-\d{2}$/.test(resolvedParams.period)
      ? resolvedParams.period
      : defaultPeriod

  let people: Person[] = []
  let pending: PendingPersonRow[] = []

  try {
    const [{ data: peopleData }, { data: pendingData }] = await Promise.all([
      supabase
        .from('people')
        .select('*')
        .neq('name', 'Personal')
        .returns<Person[]>(),
      supabase
        .from('master_transactions')
        .select(
          'id, person_id, amount_account, currency_account, settled_amount, settled_at, accounting_period, date, installment_total, type'
        )
        .is('settled_at', null)
        .eq('type', 'OUTCOME')
        .not('person_id', 'is', null)
        .returns<PendingPersonRow[]>()
    ])
    people = peopleData ?? []
    pending = pendingData ?? []
  } catch {
    // Si la conexión falla (offline), PeopleDirectoryClient hidrata desde LedgerContext
  }

  return (
    <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <PeopleDirectoryClient
        initialPeople={people}
        initialPending={pending}
        initialPeriod={initialPeriod}
        todayStr={todayStr}
      />
    </main>
  )
}
