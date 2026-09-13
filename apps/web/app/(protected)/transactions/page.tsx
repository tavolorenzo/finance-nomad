import Link from 'next/link'
import { Plus, ArrowDownLeft, ArrowUpRight, SlidersHorizontal, ArrowRightLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatMoney } from '@/lib/currency'
import type { MasterTransaction } from '@/lib/types'

export default async function TransactionsPage() {
  const supabase = await createClient()
  const { data: transactions } = await supabase
    .from('master_transactions')
    .select('*')
    .order('date', { ascending: false })
    .limit(50)
    .returns<MasterTransaction[]>()

  const hasTransactions = transactions && transactions.length > 0

  return (
    <main className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Movimientos</h1>
          <p className="text-xs text-text-muted mt-0.5">Historial reciente de ingresos, egresos y transferencias</p>
        </div>
        <Link
          href="/transactions/new"
          className="inline-flex items-center justify-center gap-1.5 bg-accent text-surface-0 text-xs font-medium px-3.5 py-2 rounded-control hover:opacity-90 transition self-start sm:self-auto"
        >
          <Plus size={15} /> Cargar movimiento
        </Link>
      </div>

      {!hasTransactions ? (
        <div className="bg-surface-1 border border-border rounded-card p-8 text-center text-sm text-text-muted">
          Todavía no cargaste movimientos este mes.{' '}
          <Link href="/transactions/new" className="text-accent font-medium hover:underline">
            Cargá el primero.
          </Link>
        </div>
      ) : (
        <div className="bg-surface-1 border border-border rounded-card divide-y divide-border px-4 py-1">
          {transactions.map((t) => {
            const isOutcome = t.type === 'OUTCOME'
            const isIncome = t.type === 'INCOME'
            const isAdjustment = t.type === 'ADJUSTMENT'
            const isTransfer = t.type === 'TRANSFER'
            const isPositiveAdj = isAdjustment && t.amount_account >= 0
            const isTransferIn = isTransfer && t.amount_account >= 0

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
                <p
                  className={`font-mono text-sm font-semibold ${
                    isOutcome || (isAdjustment && !isPositiveAdj) || (isTransfer && !isTransferIn)
                      ? 'text-expense'
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
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
