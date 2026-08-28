import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AccountForm } from '@/components/AccountForm'
import { Modal } from '@/components/Modal'
import type { Account, Institution } from '@/lib/types'

export default async function EditAccountModal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: account } = await supabase.from('accounts').select('*').eq('id', id).single<Account>()
  if (!account) notFound()
  const { data: institutions } = await supabase.from('institutions').select('*').returns<Institution[]>()

  return (
    <Modal title="Editar cuenta">
      <AccountForm institutions={institutions ?? []} account={account} />
    </Modal>
  )
}
