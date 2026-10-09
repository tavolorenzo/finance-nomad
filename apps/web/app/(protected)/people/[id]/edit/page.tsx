import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PersonForm } from '@/components/PersonForm'
import type { Person } from '@/lib/types'

export default async function EditPersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: person }, { data: pending }] = await Promise.all([
    supabase
      .from('people')
      .select('*')
      .eq('id', id)
      .single<Person>(),
    supabase
      .from('master_transactions')
      .select('amount_account')
      .eq('person_id', id)
      .eq('type', 'OUTCOME')
      .is('settled_at', null)
  ])

  if (!person) notFound()

  const hasPendingBalance = (pending ?? []).some((t) => (t.amount_account || 0) > 0)

  return (
    <main className="max-w-md mx-auto p-4 space-y-4">
      <Link
        href={`/people/${id}`}
        className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition"
      >
        <span>←</span>
        <span>Volver a {person.name}</span>
      </Link>
      <h1 className="font-display text-xl font-bold tracking-tight">Editar persona</h1>
      <div className="bg-surface-2 border border-border rounded-card">
        <PersonForm person={person} hasPendingBalance={hasPendingBalance} />
      </div>
    </main>
  )
}
