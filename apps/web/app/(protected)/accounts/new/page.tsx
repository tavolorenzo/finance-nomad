import Link from 'next/link'
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
    <main className="max-w-md mx-auto p-4 space-y-4">
      <Link
        href="/accounts"
        className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition"
      >
        <span>←</span>
        <span>Volver a Cuentas</span>
      </Link>
      <h1 className="font-display text-xl font-bold tracking-tight">Nueva cuenta</h1>
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
