import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatMoney } from '@/lib/currency'
import { getAccountBalances } from '@/lib/networth'
import type { Account, Institution } from '@/lib/types'

type InstitutionWithAccounts = Institution & { accounts: Account[] }

export default async function AccountsPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)

  const [{ data: institutions }, balances] = await Promise.all([
    supabase
      .from('institutions')
      .select('*, accounts(*)')
      .returns<InstitutionWithAccounts[]>(),
    getAccountBalances(supabase, today)
  ])

  const balanceByAccount = new Map(balances.map((b) => [b.accountId, b.balance]))
  const activeInstitutions = (institutions ?? []).filter((i) => i.is_active)
  const inactiveInstitutions = (institutions ?? []).filter((i) => !i.is_active)

  return (
    <main className="max-w-md mx-auto p-4 space-y-3">
      <div className="flex justify-between items-center">
        <h1 className="font-display text-xl font-medium">Cuentas</h1>
        <Link href="/institutions/new"
          className="flex items-center gap-1 text-sm text-accent font-medium">
          <Plus size={16} /> Institución
        </Link>
      </div>

      {activeInstitutions.map((inst) => (
        <InstitutionCard key={inst.id} inst={inst} balanceByAccount={balanceByAccount} />
      ))}

      {activeInstitutions.length === 0 && (
        <p className="text-sm text-text-muted">
          No tenés instituciones activas. Creá una para empezar a cargar cuentas.
        </p>
      )}

      {inactiveInstitutions.length > 0 && (
        <details className="pt-2">
          <summary className="text-sm text-text-muted cursor-pointer">
            Instituciones desactivadas ({inactiveInstitutions.length})
          </summary>
          <div className="mt-2 space-y-2 opacity-60">
            {inactiveInstitutions.map((inst) => (
              <InstitutionCard key={inst.id} inst={inst} balanceByAccount={balanceByAccount} />
            ))}
          </div>
        </details>
      )}
    </main>
  )
}

function InstitutionCard({
  inst,
  balanceByAccount
}: {
  inst: InstitutionWithAccounts
  balanceByAccount: Map<string, number>
}) {
  const activeAccounts = inst.accounts.filter((a) => a.is_active)
  const inactiveAccounts = inst.accounts.filter((a) => !a.is_active)

  return (
    <details className="bg-surface-1 border border-border rounded-card p-3" open={inst.is_active}>
      <summary className="flex justify-between items-center cursor-pointer">
        <Link href={`/institutions/${inst.id}/edit`} className="font-medium">
          {inst.name}{!inst.is_active && ' · desactivada'}
        </Link>
        {inst.is_active && (
          <Link href={`/accounts/new?institutionId=${inst.id}`}
            className="flex items-center gap-1 text-xs text-accent">
            <Plus size={14} /> Cuenta
          </Link>
        )}
      </summary>
      <div className="mt-2 space-y-2">
        {[...activeAccounts, ...inactiveAccounts].map((acc) => {
          const bal = balanceByAccount.get(acc.id) ?? 0
          return (
            <Link key={acc.id} href={`/accounts/${acc.id}/edit`}
              className={`flex justify-between text-sm py-1 ${!acc.is_active ? 'opacity-50' : ''}`}>
              <span className="text-text-secondary">
                {acc.name}{!acc.is_active && ' · desactivada'}
              </span>
              <span className={`font-mono amount ${bal < 0 ? 'text-expense' : ''}`}>
                {formatMoney(bal, acc.currency_native)}
              </span>
            </Link>
          )
        })}
        {inst.accounts.length === 0 && (
          <p className="text-xs text-text-muted">Sin cuentas todavía.</p>
        )}
      </div>
    </details>
  )
}
