'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { formatMoney } from '@/lib/currency'
import { useLedger } from '@/lib/ledger/ledger-context'
import type { Account, Institution } from '@/lib/types'
import type { AccountBalance } from '@/lib/ledger/types'

type InstitutionWithAccounts = Institution & { accounts: Account[] }

export function AccountsClient({
  institutions,
  initialBalances
}: {
  institutions: InstitutionWithAccounts[]
  initialBalances: AccountBalance[]
}) {
  const { balances: ledgerBalances, accounts: ledgerAccounts } = useLedger()
  const balances = ledgerBalances.length > 0 ? ledgerBalances : initialBalances

  const effectiveInstitutions = useMemo(() => {
    if (institutions && institutions.length > 0) return institutions
    if (!ledgerAccounts || ledgerAccounts.length === 0) return []
    const instMap = new Map<string, InstitutionWithAccounts>()
    for (const acc of ledgerAccounts) {
      const instData = (acc as unknown as { institutions?: { id?: string; name?: string; is_active?: boolean } }).institutions
      const instId = acc.institution_id || instData?.id || 'default'
      const instName = instData?.name || 'Cuentas'
      const isActive = instData?.is_active ?? true
      if (!instMap.has(instId)) {
        instMap.set(instId, {
          id: instId,
          name: instName,
          is_active: isActive,
          accounts: []
        })
      }
      instMap.get(instId)!.accounts.push(acc)
    }
    return Array.from(instMap.values())
  }, [institutions, ledgerAccounts])

  const balanceByAccount = useMemo(() => {
    return new Map(balances.map((b) => [b.accountId, b.balance]))
  }, [balances])

  const activeInstitutions = effectiveInstitutions.filter((i) => i.is_active)
  const inactiveInstitutions = effectiveInstitutions.filter((i) => !i.is_active)

  return (
    <main className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Cuentas e Instituciones</h1>
          <p className="text-xs text-text-muted mt-0.5">Administrá tus bancos, billeteras y cuentas asociadas</p>
        </div>
        <Link
          href="/institutions/new"
          className="inline-flex items-center justify-center gap-1.5 bg-accent text-[color:var(--on-accent)] text-xs font-medium px-3.5 py-2 rounded-control hover:opacity-90 transition self-start sm:self-auto"
        >
          <Plus size={15} /> Nueva institución
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeInstitutions.map((inst) => (
          <InstitutionCard key={inst.id} inst={inst} balanceByAccount={balanceByAccount} />
        ))}
      </div>

      {activeInstitutions.length === 0 && (
        <div className="bg-surface-1 border border-border rounded-card p-8 text-center text-sm text-text-muted">
          No tenés instituciones activas. Creá una para empezar a cargar tus cuentas.
        </div>
      )}

      {inactiveInstitutions.length > 0 && (
        <details className="pt-2">
          <summary className="text-xs font-medium text-text-muted cursor-pointer hover:text-text-primary transition select-none">
            Instituciones desactivadas ({inactiveInstitutions.length})
          </summary>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 opacity-60">
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
    <div className="bg-surface-1 border border-border rounded-card overflow-hidden flex flex-col justify-between">
      <div>
        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-surface-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/institutions/${inst.id}/edit`}
              className="font-display font-medium text-sm text-text-primary hover:text-accent transition"
            >
              {inst.name}
            </Link>
            {!inst.is_active && (
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-surface-2 text-text-muted">
                Desactivada
              </span>
            )}
          </div>
          {inst.is_active && (
            <Link
              href={`/accounts/new?institutionId=${inst.id}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              <Plus size={13} /> Cuenta
            </Link>
          )}
        </div>

        <div className="p-3 space-y-1">
          {[...activeAccounts, ...inactiveAccounts].map((acc) => {
            const bal = balanceByAccount.get(acc.id) ?? 0
            return (
              <Link
                key={acc.id}
                href={`/accounts/${acc.id}`}
                className={`flex justify-between items-center text-xs p-2 rounded-control hover:bg-surface-2 transition ${
                  !acc.is_active ? 'opacity-50' : ''
                }`}
              >
                <span className="text-text-secondary font-medium">
                  {acc.name}
                  {!acc.is_active && ' (desactivada)'}
                </span>
                <span className={`font-mono text-xs tabular-nums amount ${bal < 0 ? 'text-expense font-semibold' : 'text-text-primary'}`}>
                  {formatMoney(bal, acc.currency_native)}
                </span>
              </Link>
            )
          })}
          {inst.accounts.length === 0 && (
            <p className="text-xs text-text-muted p-2">Sin cuentas todavía.</p>
          )}
        </div>
      </div>
    </div>
  )
}
