import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InstitutionForm } from '@/components/InstitutionForm'
import { Modal } from '@/components/Modal'
import type { Institution } from '@/lib/types'

export default async function EditInstitutionModal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: institution } = await supabase.from('institutions').select('*').eq('id', id).single<Institution>()
  if (!institution) notFound()

  return (
    <Modal title="Editar institución">
      <InstitutionForm institution={institution} />
    </Modal>
  )
}
