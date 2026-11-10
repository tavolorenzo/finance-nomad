'use client'

import Link from 'next/link'
import { Plus, Building2, Banknote, Landmark, PiggyBank, ArrowRight } from 'lucide-react'
import { formatMoney } from '@/lib/currency'
import type { Account } from '@/lib/types'

interface AccountsCardListProps {
  accounts: (Account & { institutions?: { name: string } | null })[]
  balanceByAccount: Map<string, number>
  displayCurrency: string
  totalLiquidityInDisplay: number
}

function getAccountTypeIcon(type: string) {
  switch (type) {
    case 'cash':
      return Banknote
    case 'savings':
      return PiggyBank
    case 'investment':
      return Landmark
    default:
      return Building2
  }
}

function getAccountTypeLabel(type: string) {
  switch (type) {
    case 'cash':
      return 'Efectivo'
    case 'savings':
      return 'Caja de Ahorro'
    case 'investment':
      return 'Inversión'
    case 'checking':
      return 'Cuenta Corriente'
    default:
      return 'Cuenta'
  }
}

export function AccountsCardList({
  accounts,
  balanceByAccount,
  displayCurrency,
  totalLiquidityInDisplay
}: AccountsCardListProps) {
  return (
    <div className="bg-surface-1 border border-border rounded-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-base font-semibold text-text-primary">
              Cuentas & Efectivo
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-surface-2 text-text-secondary font-mono font-medium">
              {accounts.length}
            </span>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Liquidez disponible total:{' '}
            <span className="font-mono tabular-nums font-semibold text-text-primary">
              {formatMoney(totalLiquidityInDisplay, displayCurrency)}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/accounts/new"
            aria-label="Crear cuenta"
            className="p-1.5 rounded-control text-text-secondary hover:text-text-primary hover:bg-surface-2 border border-border transition"
            title="Nueva cuenta"
          >
            <Plus size={15} />
          </Link>
          <Link
            href="/accounts"
            className="text-xs text-accent font-medium hover:underline inline-flex items-center gap-1"
          >
            Ver todas <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="p-6 text-center text-xs text-text-muted bg-surface-2/40 rounded-card border border-border-subtle">
          No tenés cuentas ni cajas registradas aún.{' '}
          <Link href="/accounts/new" className="text-accent font-medium hover:underline">
            Crear la primera
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {accounts.map((acc) => {
            const bal = balanceByAccount.get(acc.id) ?? 0
            const Icon = getAccountTypeIcon(acc.type)
            const typeLabel = getAccountTypeLabel(acc.type)
            const isNegative = bal < 0

            return (
              <Link
                key={acc.id}
                href={`/accounts/${acc.id}`}
                className="group p-3 rounded-control bg-surface-0/60 hover:bg-surface-2/80 border border-border hover:border-accent transition flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-text-muted truncate">
                      {acc.institutions?.name || 'Personal'}
                    </p>
                    <p className="text-xs font-semibold text-text-primary truncate group-hover:text-accent transition mt-0.5">
                      {acc.name}
                    </p>
                  </div>
                  <span className="p-1 rounded bg-surface-1 text-text-muted shrink-0" title={typeLabel}>
                    <Icon size={14} />
                  </span>
                </div>

                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-[10px] text-text-muted uppercase tracking-wider">
                    {acc.currency_native}
                  </span>
                  <p
                    className={`font-mono amount text-sm font-semibold tabular-nums ${
                      isNegative ? 'text-expense' : 'text-text-primary'
                    }`}
                  >
                    {formatMoney(bal, acc.currency_native)}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

