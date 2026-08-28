import { createClient } from '@/lib/supabase/server'
import { AccountForm } from '@/components/AccountForm'
import { Modal } from '@/components/Modal'
import type { Institution } from '@/lib/types'

export default async function NewAccountModal({
  searchParams
}: {
  searchParams: Promise<{ institutionId?: string }>
}) {
  const { institutionId } = await searchParams
  const supabase = await createClient()
  const { data: institutions } = await supabase
    .from('institutions')
    .select('*')
    .eq('is_active', true)
    .returns<Institution[]>()

  return (
    <Modal title="Nueva cuenta">
      {institutions && institutions.length > 0 ? (
        <AccountForm institutions={institutions} defaultInstitutionId={institutionId} />
      ) : (
        <p className="p-4 text-sm text-text-muted">
          Primero creá una institución activa para poder agregarle una cuenta.
        </p>
      )}
    </Modal>
  )
}
