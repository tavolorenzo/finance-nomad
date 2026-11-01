import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LoanDetailClient } from '@/components/LoanDetailClient'
import type { Account, LoanWithInstallments } from '@/lib/types'

interface LoanDetailPageProps {
  params: {
    id: string
  }
}

export default async function LoanDetailPage({ params }: LoanDetailPageProps) {
  const supabase = await createClient()

  let loan: LoanWithInstallments | null = null
  let accounts: (Account & { institutions?: { name: string } | null })[] = []

  try {
    const [loanRes, accRes] = await Promise.all([
      supabase
        .from('loans')
        .select(`
          *,
          institution:counterparty_institution_id (id, name),
          person:beneficiary_person_id (id, name),
          installments:loan_installments (*)
        `)
        .eq('id', params.id)
        .eq('is_active', true)
        .single(),
      supabase
        .from('accounts')
        .select('*, institutions(name)')
        .eq('is_active', true)
        .order('name')
    ])

    loan = loanRes.data as unknown as LoanWithInstallments
    accounts = (accRes.data as unknown as (Account & { institutions?: { name: string } | null })[]) ?? []
  } catch {
    // Error al cargar
  }

  if (!loan) {
    notFound()
  }

  return (
    <main className="max-w-5xl mx-auto p-4 md:p-6">
      <LoanDetailClient loan={loan} accounts={accounts} />
    </main>
  )
}
