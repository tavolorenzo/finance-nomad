import Link from 'next/link'
import { ArrowDownLeft, ArrowUpRight, SlidersHorizontal, ArrowRightLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatMoney } from '@/lib/currency'
import { getAccountBalances, convertToDisplayCurrency } from '@/lib/networth'
import type { Account, MasterTransaction } from '@/lib/types'

function monthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10)
  return { start, end }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const today = new Date().toISOString().slice(0, 10)

  const { data: settings } = await supabase
    .from('user_settings')
    .select('display_currency')
    .eq('user_id', user!.id)
    .maybeSingle()
  const displayCurrency = settings?.display_currency ?? 'EUR'

  const [{ data: accounts }, { data: transactions }, { data: estimates }] = await Promise.all([
    supabase
      .from('accounts')
      .select('id, name, type, currency_native, institutions!inner(name)')
      .eq('is_active', true)
      .eq('institutions.is_active', true)
      .returns<(Account & { institutions: { name: string } })[]>(),
    supabase
      .from('master_transactions')
      .select('*')
      .order('date', { ascending: false })
      .limit(5)
      .returns<MasterTransaction[]>(),
    supabase.from('budget_estimates').select('*').eq('is_active', true).eq('type', 'EXPENSE_ESTIMATE')
  ])

  const balances = await getAccountBalances(supabase, today)
  const netWorth = await convertToDisplayCurrency(balances, displayCurrency, today)
  const balanceByAccount = new Map(balances.map((b) => [b.accountId, b.balance]))

  // Presupuesto del mes: real gastado (por categoría de los estimados activos) vs. proyectado.
  const { start, end } = monthRange()
  const estimatedTotal = (estimates ?? []).reduce((sum, e) => sum + e.estimated_amount, 0)
  const categoryIds = (estimates ?? []).map((e) => e.category_id)

  let realSpent = 0
  if (categoryIds.length > 0) {
    const { data: monthTx } = await supabase
      .from('master_transactions')
      .select('amount_account, category_id, date, type')
      .in('category_id', categoryIds)
      .eq('type', 'OUTCOME')
      .gte('date', start)
      .lte('date', end)
    realSpent = (monthTx ?? []).reduce((sum, t) => sum + t.amount_account, 0)
  }
  const budgetPct = estimatedTotal > 0 ? Math.min(100, Math.round((realSpent / estimatedTotal) * 100)) : 0

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
                <div className="h-full bg-accent" style={{ width: `${budgetPct}%` }} />
              </div>
              <p className="text-xs text-text-muted mt-2">
                {formatMoney(realSpent, estimates?.[0]?.currency ?? displayCurrency)} gastados de{' '}
                {formatMoney(estimatedTotal, estimates?.[0]?.currency ?? displayCurrency)} proyectados
              </p>
            </div>
          )}
        </div>

        {/* Columna 2: Cuentas */}
        <div>
          <p className="font-display text-base font-medium mb-3">Cuentas</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2">
            {(accounts ?? []).map((a) => (
              <div key={a.id} className="bg-surface-1 border border-border rounded-card p-3">
                <p className="text-xs text-text-muted truncate">{a.institutions?.name} · {a.name}</p>
                <p className="font-mono amount text-base mt-1">
                  {formatMoney(balanceByAccount.get(a.id) ?? 0, a.currency_native)}
                </p>
              </div>
            ))}
            {(!accounts || accounts.length === 0) && (
              <div className="bg-surface-1 border border-border rounded-card p-4 col-span-full">
                <p className="text-sm text-text-muted">
                  No tenés cuentas activas todavía. Creá una para empezar.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Columna 3: Movimientos */}
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
                        <p className="text-sm">
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
                      </div>
                      <p className="text-xs text-text-muted">{t.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-mono amount text-sm ${
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
