import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InstitutionForm } from '@/components/InstitutionForm'
import type { Institution } from '@/lib/types'

export default async function EditInstitutionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: institution } = await supabase.from('institutions').select('*').eq('id', id).single<Institution>()
  if (!institution) notFound()

  return (
    <main className="max-w-md mx-auto py-4">
      <h1 className="font-display text-xl font-medium px-4 mb-3">Editar institución</h1>
      <div className="bg-surface-2 border border-border rounded-card">
        <InstitutionForm institution={institution} />
      </div>
    </main>
  )
}
