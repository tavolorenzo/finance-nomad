import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth-helper'
import { CreditCardBulkWizard } from '@/components/credit-card-bulk/CreditCardBulkWizard'
import type { Account, Category, Person } from '@/lib/types'

export const metadata = {
  title: 'Carga Rápida de Tarjetas — Finance Nomad',
  description: 'Cargá en bloque los consumos del resumen actual y compras en cuotas de tus tarjetas'
}

export default async function WelcomeCreditCardPage() {
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)
  if (!user) redirect('/login')

  const [{ data: cardAccounts }, { data: categories }, { data: people }] = await Promise.all([
    supabase
      .from('accounts')
      .select('*, institutions(name)')
      .eq('user_id', user.id)
      .eq('type', 'credit_card')
      .eq('is_active', true)
      .returns<(Account & { institutions: { name: string } | null })[]>(),
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

  // Si no tiene tarjetas de crédito, va directo al Dashboard
  if (!cardAccounts || cardAccounts.length === 0) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-surface-0 text-text-primary px-4 py-8 sm:py-12">
      <CreditCardBulkWizard
        cardAccounts={cardAccounts}
        categories={categories ?? []}
        people={people ?? []}
        isPostOnboarding={true}
      />
    </div>
  )
}
