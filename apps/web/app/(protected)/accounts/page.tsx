import { createClient } from '@/lib/supabase/server'
import { getAccountBalances } from '@/lib/networth'
import { AccountsClient } from '@/components/AccountsClient'
import type { Account, Institution } from '@/lib/types'
import type { AccountBalance } from '@/lib/ledger/types'

type InstitutionWithAccounts = Institution & { accounts: Account[] }

export default async function AccountsPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)

  let institutions: InstitutionWithAccounts[] = []
  let balances: AccountBalance[] = []

  try {
    const [{ data }, balResult] = await Promise.all([
      supabase
        .from('institutions')
        .select('*, accounts(*)')
        .returns<InstitutionWithAccounts[]>(),
      getAccountBalances(supabase, today)
    ])
    institutions = data ?? []
    balances = balResult
  } catch {
    // Si la conexión a Supabase falla (offline), AccountsClient
    // resuelve las cuentas e instituciones desde el LedgerContext (IndexedDB).
  }

  return (
    <AccountsClient
      institutions={institutions}
      initialBalances={balances}
    />
  )
}
