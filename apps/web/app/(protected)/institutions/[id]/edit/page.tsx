import Link from 'next/link'
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
    <main className="max-w-md mx-auto p-4 space-y-4">
      <Link
        href="/accounts"
        className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition"
      >
        <span>←</span>
        <span>Volver a Cuentas</span>
      </Link>
      <h1 className="font-display text-xl font-bold tracking-tight">Editar institución</h1>
      <div className="bg-surface-2 border border-border rounded-card">
        <InstitutionForm institution={institution} />
      </div>
    </main>
  )
}
