import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth-helper'
import { CreditCardBulkWizard } from '@/components/credit-card-bulk/CreditCardBulkWizard'
import { AccountBulkWizard } from '@/components/account-bulk/AccountBulkWizard'
import type { Account, Category, Person } from '@/lib/types'

export const metadata = {
  title: 'Carga Rápida de Movimientos — Finance Nomad',
  description: 'Cargá en bloque o pegá movimientos de home banking, extractos o resúmenes'
}

export default async function AccountBulkIngestPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)
  if (!user) redirect('/login')

  const [{ data: account }, { data: categories }, { data: people }] = await Promise.all([
    supabase
      .from('accounts')
      .select('*, institutions(name)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single<Account & { institutions: { name: string } | null }>(),
    supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('name')
      .returns<Category[]>(),
    supabase
      .from('people')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('name')
      .returns<Person[]>()
  ])

  if (!account) {
    notFound()
  }

  return (
    <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      {account.type === 'credit_card' ? (
        <>
          <div className="flex items-center justify-between">
            <Link
              href={`/accounts/${account.id}`}
              className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition"
            >
              <ArrowLeft size={14} />
              <span>Volver a {account.name}</span>
            </Link>
          </div>

          <CreditCardBulkWizard
            cardAccounts={[account]}
            initialCardId={account.id}
            categories={categories ?? []}
            people={people ?? []}
            isPostOnboarding={false}
          />
        </>
      ) : (
        <AccountBulkWizard
          account={account}
          categories={categories ?? []}
          people={people ?? []}
        />
      )}
    </main>
  )
}
