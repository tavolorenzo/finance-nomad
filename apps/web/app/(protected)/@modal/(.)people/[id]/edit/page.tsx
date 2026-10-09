import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PersonForm } from '@/components/PersonForm'
import { Modal } from '@/components/Modal'
import type { Person } from '@/lib/types'

export default async function EditPersonModal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: person } = await supabase
    .from('people')
    .select('*')
    .eq('id', id)
    .single<Person>()

  if (!person) notFound()

  const { data: pending } = await supabase
    .from('master_transactions')
    .select('amount_account')
    .eq('person_id', id)
    .eq('type', 'OUTCOME')
    .is('settled_at', null)

  const hasPendingBalance = (pending ?? []).some((t) => (t.amount_account || 0) > 0)

  return (
    <Modal title="Editar persona">
      <PersonForm person={person} hasPendingBalance={hasPendingBalance} />
    </Modal>
  )
}
