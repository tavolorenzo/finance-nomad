import { createClient } from '@/lib/supabase/server'
import { AccountForm } from '@/components/AccountForm'
import type { Institution } from '@/lib/types'

export default async function NewAccountPage({
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
    <main className="max-w-md mx-auto py-4">
      <h1 className="font-display text-xl font-medium px-4 mb-3">Nueva cuenta</h1>
      <div className="bg-surface-2 border border-border rounded-card">
        {institutions && institutions.length > 0 ? (
          <AccountForm institutions={institutions} defaultInstitutionId={institutionId} />
        ) : (
          <p className="p-4 text-sm text-text-muted">
            Primero creá una institución activa para poder agregarle una cuenta.
          </p>
        )}
      </div>
    </main>
  )
}
