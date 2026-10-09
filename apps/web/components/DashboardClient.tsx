'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { ArrowDownLeft, ArrowUpRight, SlidersHorizontal, ArrowRightLeft } from 'lucide-react'
import { formatMoney } from '@/lib/currency'
import { useLedger } from '@/lib/ledger/ledger-context'
import { convertToDisplayCurrency } from '@/lib/networth'
import type { Account, MasterTransaction } from '@/lib/types'
import type { AccountBalance } from '@/lib/ledger/types'

interface DashboardEstimate {
  id: string
  name: string
  category_id: string
  estimated_amount: number
  currency: string
}

interface DashboardClientProps {
  initialAccounts: (Account & { institutions: { name: string } })[]
  initialBalances: AccountBalance[]
  initialTransactions: MasterTransaction[]
  initialEstimates: DashboardEstimate[]
  displayCurrency: string
  initialNetWorth: number
  initialRealSpent: number
  monthStart: string
  monthEnd: string
}

export function DashboardClient({
  initialAccounts,
  initialBalances,
  initialTransactions,
  initialEstimates,
  displayCurrency,
  initialNetWorth,
  initialRealSpent,
  monthStart,
  monthEnd
}: DashboardClientProps) {
  const {
    balances: ledgerBalances,
    accounts: ledgerAccounts,
    recentTransactions: ledgerTransactions,
    isInitialized,
    seedInitialData
  } = useLedger()

  // Sembrar datos iniciales de servidor en LedgerContext para disponibilidad inmediata
  useEffect(() => {
    seedInitialData({
      accounts: initialAccounts,
      balances: initialBalances,
      recentTransactions: initialTransactions
    })
  }, [initialAccounts, initialBalances, initialTransactions, seedInitialData])

  // Usar estado reactivo del ledger si está poblado, o datos iniciales del SSR
  const accounts = ledgerAccounts.length > 0 ? (ledgerAccounts as typeof initialAccounts) : initialAccounts
  const balances = ledgerBalances.length > 0 ? ledgerBalances : initialBalances
  const transactions =
    ledgerTransactions.length > 0 ? ledgerTransactions.slice(0, 5) : initialTransactions

  const balanceByAccount = useMemo(() => {
    return new Map(balances.map((b) => [b.accountId, b.balance]))
  }, [balances])

  // Cálculo reactivo de Patrimonio Neto
  const [netWorth, setNetWorth] = useState(initialNetWorth)

  useEffect(() => {
    if (balances.length === 0) return
    let active = true
    const today = new Date().toISOString().slice(0, 10)

    convertToDisplayCurrency(balances, displayCurrency, today)
      .then((val) => {
        if (active) setNetWorth(val)
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [balances, displayCurrency])

  // Cálculo reactivo de Presupuesto del mes
  const estimatedTotal = useMemo(() => {
    return (initialEstimates ?? []).reduce((sum, e) => sum + e.estimated_amount, 0)
  }, [initialEstimates])

  const categoryIds = useMemo(() => {
    return new Set((initialEstimates ?? []).map((e) => e.category_id))
  }, [initialEstimates])

  // Delta de gastos en memoria no contabilizados en el snapshot de SSR
  const localSpentDelta = useMemo(() => {
    if (categoryIds.size === 0 || ledgerTransactions.length === 0) return 0
    const serverTxIds = new Set(initialTransactions.map((t) => t.id))

    // Identificar transacciones en memoria creadas en esta sesión para el mes en curso
    const newOutcomes = ledgerTransactions.filter(
      (t) =>
        !serverTxIds.has(t.id) &&
        t.type === 'OUTCOME' &&
        t.status === 'COMPLETED' &&
        t.category_id &&
        categoryIds.has(t.category_id) &&
        t.date >= monthStart &&
        t.date <= monthEnd
    )

    return newOutcomes.reduce((sum, t) => sum + Number(t.amount_account || 0), 0)
  }, [ledgerTransactions, initialTransactions, categoryIds, monthStart, monthEnd])

  const realSpent = initialRealSpent + localSpentDelta
  const budgetPct =
    estimatedTotal > 0 ? Math.min(100, Math.round((realSpent / estimatedTotal) * 100)) : 0

  return (
    <main className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Columna 1: Balance y Presupuesto */}
        <div className="space-y-4">
          <div className="bg-surface-1 border border-border rounded-card p-4">
            <p className="text-sm font-medium text-text-secondary">Patrimonio neto</p>
            <p className="font-mono amount text-3xl font-medium mt-1">
              {formatMoney(netWorth, displayCurrency)}
            </p>
          </div>

          {estimatedTotal > 0 && (
            <div className="bg-surface-1 border border-border rounded-card p-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-text-secondary">Presupuesto del mes</span>
                <span className="text-sm font-mono font-medium">{budgetPct}%</span>
              </div>
              <div className="h-1.5 bg-surface-0 rounded-full overflow-hidden">
                <div className="h-full bg-accent transition-all duration-300" style={{ width: `${budgetPct}%` }} />
              </div>
              <p className="text-xs text-text-muted mt-2">
                {formatMoney(realSpent, initialEstimates?.[0]?.currency ?? displayCurrency)} gastados de{' '}
                {formatMoney(estimatedTotal, initialEstimates?.[0]?.currency ?? displayCurrency)} proyectados
              </p>
            </div>
          )}
        </div>

        {/* Columna 2: Cuentas */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <p className="font-display text-base font-medium">Cuentas</p>
            <Link href="/accounts" className="text-xs text-text-muted hover:text-accent transition font-medium">
              Ver todas
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2">
            {(accounts ?? []).map((a) => {
              const bal = balanceByAccount.get(a.id) ?? 0
              return (
                <Link
                  key={a.id}
                  href={`/accounts/${a.id}`}
                  className="group bg-surface-1 border border-border rounded-card p-3 hover:border-accent hover:bg-surface-2/60 transition block"
                >
                  <p className="text-xs text-text-muted truncate group-hover:text-accent transition">
                    {a.institutions?.name} · {a.name}
                  </p>
                  <p className={`font-mono amount text-base mt-1 tabular-nums ${bal < 0 ? 'text-expense font-semibold' : 'text-text-primary'}`}>
                    {formatMoney(bal, a.currency_native)}
                  </p>
                </Link>
              )
            })}
            {(!accounts || accounts.length === 0) && (
              <div className="bg-surface-1 border border-border rounded-card p-4 col-span-full">
                <p className="text-sm text-text-muted">
                  No tenés cuentas activas todavía. Creá una para empezar.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Columna 3: Movimientos recientes */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <p className="font-display text-base font-medium">Movimientos</p>
            <Link href="/transactions/new" className="text-sm text-accent font-medium hover:underline">
              Cargar movimiento
            </Link>
          </div>
          <div className="bg-surface-1 border border-border rounded-card p-4 divide-y divide-border">
            {(!transactions || transactions.length === 0) && (
              <p className="text-sm text-text-muted py-2">
                Todavía no cargaste movimientos este mes.{' '}
                <Link href="/transactions/new" className="text-accent font-medium hover:underline">
                  Cargá el primero.
                </Link>
              </p>
            )}
            {(transactions ?? []).map((t) => {
              const isOutcome = t.type === 'OUTCOME'
              const isIncome = t.type === 'INCOME'
              const isAdjustment = t.type === 'ADJUSTMENT'
              const isTransfer = t.type === 'TRANSFER'
              const isPositiveAdj = isAdjustment && t.amount_account >= 0
              const isTransferIn = isTransfer && t.amount_account >= 0
              const isPending = t.status === 'PENDING'

              return (
                <div key={t.id} className="flex justify-between items-center py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-1.5 rounded-full ${
                        isOutcome
                          ? 'bg-expense/10 text-expense'
                          : isIncome
                          ? 'bg-income/10 text-income'
                          : isAdjustment
                          ? 'bg-pending/15 text-pending'
                          : 'bg-accent/15 text-accent'
                      }`}
                    >
                      {isOutcome && <ArrowUpRight size={14} />}
                      {isIncome && <ArrowDownLeft size={14} />}
                      {isAdjustment && <SlidersHorizontal size={12} />}
                      {isTransfer && <ArrowRightLeft size={12} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-text-primary">
                          {t.notes ??
                            (isAdjustment
                              ? 'Ajuste de saldo'
                              : isTransfer
                              ? 'Transferencia'
                              : 'Movimiento')}
                        </p>
                        {isAdjustment && (
                          <span className="text-[10px] px-1 py-0.1 rounded bg-surface-2 text-text-muted font-medium">
                            Ajuste
                          </span>
                        )}
                        {isTransfer && (
                          <span className="text-[10px] px-1 py-0.1 rounded bg-surface-2 text-accent font-medium">
                            Transferencia
                          </span>
                        )}
                        {isPending && (
                          <span className="text-[10px] px-1 py-0.1 rounded bg-pending/15 text-pending font-medium">
                            Pendiente
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-muted">{t.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-mono amount text-sm tabular-nums ${
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
                    {t.installment_total > 1 && (
                      <span className="text-[11px] bg-pending/15 text-pending px-2 py-0.5 rounded-full">
                        {t.installment_current} de {t.installment_total}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </main>
  )
}
