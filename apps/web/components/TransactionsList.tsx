'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowDownLeft,
  ArrowUpRight,
  SlidersHorizontal,
  ArrowRightLeft,
  Loader2,
  ChevronDown
} from 'lucide-react'
import { formatMoney } from '@/lib/currency'
import { ConfirmTransactionButton } from '@/components/ConfirmTransactionButton'
import { DeleteTransactionButton } from '@/components/DeleteTransactionButton'
import { useLedger } from '@/lib/ledger/ledger-context'
import type { MasterTransaction } from '@/lib/types'

export function TransactionsList({
  initialTransactions
}: {
  initialTransactions?: MasterTransaction[]
}) {
  const { recentTransactions, hasMoreTransactions, loadMoreTransactions, isInitialized } =
    useLedger()
  const [loadingMore, setLoadingMore] = useState(false)

  const transactions = isInitialized
    ? recentTransactions
    : initialTransactions || recentTransactions

  const today = new Date().toISOString().slice(0, 10)
  const hasTransactions = transactions && transactions.length > 0

  async function handleLoadMore() {
    setLoadingMore(true)
    try {
      await loadMoreTransactions()
    } finally {
      setLoadingMore(false)
    }
  }

  if (!hasTransactions) {
    return (
      <div className="bg-surface-1 border border-border rounded-card p-8 text-center text-sm text-text-muted">
        Todavía no cargaste movimientos este mes.{' '}
        <Link href="/transactions/new" className="text-accent font-medium hover:underline">
          Cargá el primero.
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-surface-1 border border-border rounded-card divide-y divide-border px-4 py-1">
        {transactions.map((t) => {
          const isOutcome = t.type === 'OUTCOME'
          const isIncome = t.type === 'INCOME'
          const isAdjustment = t.type === 'ADJUSTMENT'
          const isTransfer = t.type === 'TRANSFER'
          const isPositiveAdj = isAdjustment && t.amount_account >= 0
          const isTransferIn = isTransfer && t.amount_account >= 0
          const isPending = t.status === 'PENDING'

          return (
            <div key={t.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    isOutcome
                      ? 'bg-expense/10 text-expense'
                      : isIncome
                      ? 'bg-income/10 text-income'
                      : isAdjustment
                      ? 'bg-pending/15 text-pending'
                      : 'bg-accent/15 text-accent'
                  }`}
                >
                  {isOutcome && <ArrowUpRight size={16} />}
                  {isIncome && <ArrowDownLeft size={16} />}
                  {isAdjustment && <SlidersHorizontal size={14} />}
                  {isTransfer && <ArrowRightLeft size={14} />}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-medium text-text-primary">
                      {t.notes ??
                        (isAdjustment
                          ? 'Ajuste de saldo'
                          : isTransfer
                          ? 'Transferencia'
                          : 'Movimiento')}
                    </p>
                    {isAdjustment && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-2 text-text-muted font-medium">
                        Ajuste
                      </span>
                    )}
                    {isTransfer && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-2 text-accent font-medium">
                        Transferencia
                      </span>
                    )}
                    {isPending && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-pending/15 text-pending font-medium">
                        Pendiente
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-text-muted">{t.date}</p>
                    {t.installment_total > 1 && (
                      <span className="text-[10px] font-medium bg-pending/15 text-pending px-2 py-0.5 rounded-full">
                        Cuota {t.installment_current} de {t.installment_total}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isPending && t.date <= today && (
                  <ConfirmTransactionButton transactionId={t.id} />
                )}
                <p
                  className={`font-mono text-sm font-semibold tabular-nums amount ${
                    isOutcome || (isAdjustment && !isPositiveAdj) || (isTransfer && !isTransferIn)
                      ? isPending
                        ? 'text-expense/75'
                        : 'text-expense'
                      : isPending
                      ? 'text-income/75'
                      : 'text-income'
                  }`}
                >
                  {isOutcome
                    ? '-'
                    : isAdjustment
                    ? isPositiveAdj
                      ? '+'
                      : '-'
                    : isTransfer
                    ? isTransferIn
                      ? '+'
                      : '-'
                    : '+'}
                  {formatMoney(Math.abs(t.amount_account), t.currency_account)}
                </p>
                <DeleteTransactionButton transactionId={t.id} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Botón de Cargar más movimientos */}
      {hasMoreTransactions ? (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium bg-surface-1 border border-border rounded-control text-text-secondary hover:text-text-primary hover:bg-surface-2 transition disabled:opacity-50"
          >
            {loadingMore ? (
              <>
                <Loader2 size={14} className="animate-spin text-accent" />
                Cargando movimientos anteriores...
              </>
            ) : (
              <>
                <ChevronDown size={14} />
                Cargar movimientos anteriores
              </>
            )}
          </button>
        </div>
      ) : (
        <p className="text-center text-xs text-text-muted pt-2">
          No hay más movimientos anteriores para mostrar.
        </p>
      )}
    </div>
  )
}
