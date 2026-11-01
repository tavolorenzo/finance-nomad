import { createClient } from '@/lib/supabase/server'
import { LoansClient } from '@/components/LoansClient'
import type { Account, LoanWithInstallments } from '@/lib/types'

export default async function LoansPage() {
  const supabase = await createClient()

  let loans: LoanWithInstallments[] = []
  let accounts: (Account & { institutions?: { name: string } | null })[] = []
  let displayCurrency = 'USD'

  try {
    const [loansRes, accountsRes, settingsRes] = await Promise.all([
      supabase
        .from('loans')
        .select(`
          *,
          institution:counterparty_institution_id (id, name),
          person:beneficiary_person_id (id, name),
          installments:loan_installments (*)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('accounts')
        .select('id, name, currency_native, institution_id, is_active, institutions(name)')
        .eq('is_active', true),
      supabase
        .from('user_settings')
        .select('display_currency')
        .maybeSingle()
    ])

    loans = (loansRes.data as unknown as LoanWithInstallments[]) ?? []
    accounts = (accountsRes.data as unknown as (Account & { institutions?: { name: string } | null })[]) ?? []
    if (settingsRes.data?.display_currency) {
      displayCurrency = settingsRes.data.display_currency
    }
  } catch {
    // Si falla la red, la lista se renderiza vacía
  }

  return (
    <main className="max-w-5xl mx-auto p-4 md:p-6">
      <LoansClient
        loans={loans}
        accounts={accounts}
        displayCurrency={displayCurrency}
      />
    </main>
  )
}
