import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AccountForm } from '@/components/AccountForm'
import type { Account, Institution } from '@/lib/types'

export default async function EditAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: account } = await supabase.from('accounts').select('*').eq('id', id).single<Account>()
  if (!account) notFound()
  const { data: institutions } = await supabase.from('institutions').select('*').returns<Institution[]>()

  return (
    <main className="max-w-md mx-auto p-4 space-y-4">
      <Link
        href="/accounts"
        className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition"
      >
        <span>←</span>
        <span>Volver a Cuentas</span>
      </Link>
      <h1 className="font-display text-xl font-bold tracking-tight">Editar cuenta</h1>
      <div className="bg-surface-2 border border-border rounded-card">
        <AccountForm institutions={institutions ?? []} account={account} />
      </div>
    </main>
  )
}
