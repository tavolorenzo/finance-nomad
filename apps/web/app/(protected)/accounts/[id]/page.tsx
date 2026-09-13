import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Edit2,
  SlidersHorizontal,
  CreditCard,
  Building2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatMoney } from '@/lib/currency'
import { getSingleAccountBalance } from '@/lib/networth'
import { ExpressAdjustModal } from '@/components/ExpressAdjustModal'
import { RegisterCardPaymentModal } from '@/components/RegisterCardPaymentModal'
import { DeleteTransactionButton } from '@/components/DeleteTransactionButton'
import type { Account, Institution, MasterTransaction } from '@/lib/types'

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: 'Cuenta corriente',
  savings: 'Caja de ahorro',
  credit_card: 'Tarjeta de crédito',
  cash: 'Efectivo',
  investing: 'Inversión'
}

function monthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10)
  return { start, end }
}

export default async function AccountDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Consulta de la cuenta actual
  const { data: account } = await supabase
    .from('accounts')
    .select('*, institutions(*)')
    .eq('id', id)
    .single<Account & { institutions: Institution }>()

  if (!account) notFound()

  const today = new Date().toISOString().slice(0, 10)
  const currentBalance = await getSingleAccountBalance(supabase, account.id, today)

  // Consulta de todas las cuentas activas para el modal de pago de tarjeta
  const { data: allAccounts } = await supabase
    .from('accounts')
    .select('*, institutions(name)')
    .eq('is_active', true)
    .returns<(Account & { institutions: { name: string } })[]>()

  // Transacciones de esta cuenta
  const { data: transactions } = await supabase
    .from('master_transactions')
    .select('*, categories(name), people(name)')
    .eq('account_id', account.id)
    .order('date', { ascending: false })
    .returns<(MasterTransaction & { categories?: { name: string } | null; people?: { name: string } | null })[]>()

  // Estadísticas del mes en curso
  const { start, end } = monthRange()
  const thisMonthTx = (transactions ?? []).filter((t) => t.date >= start && t.date <= end)

  let monthlyIncome = 0
  let monthlyExpense = 0
  for (const t of thisMonthTx) {
    if (t.type === 'INCOME') {
      monthlyIncome += t.amount_account
    } else if (t.type === 'OUTCOME') {
      monthlyExpense += t.amount_account
    } else if (t.type === 'ADJUSTMENT' || t.type === 'TRANSFER') {
      if (t.amount_account > 0) monthlyIncome += t.amount_account
      else monthlyExpense += Math.abs(t.amount_account)
    }
  }

  // Si es tarjeta de crédito: límites y disponible
  const isCreditCard = account.type === 'credit_card'
  const creditLimit = account.credit_limit ?? 0
  const usedCredit = currentBalance < 0 ? Math.abs(currentBalance) : 0
  const availableCredit = isCreditCard ? Math.max(0, creditLimit - usedCredit) : 0
  const creditPct = isCreditCard && creditLimit > 0 ? Math.min(100, Math.round((usedCredit / creditLimit) * 100)) : 0

  return (
    <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      {/* Navegación superior */}
      <div className="flex items-center justify-between">
        <Link
          href="/accounts"
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition"
        >
          <span>←</span>
          <span>Volver a Cuentas</span>
        </Link>
        <Link
          href={`/accounts/${account.id}/edit`}
          className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-accent transition"
        >
          <Edit2 size={13} />
          <span>Editar cuenta</span>
        </Link>
      </div>

      {/* Header Principal de la Cuenta */}
      <div className="bg-surface-1 border border-border rounded-card p-5 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-text-muted font-medium flex items-center gap-1">
                <Building2 size={13} />
                {account.institutions?.name}
              </span>
              <span className="text-border">·</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-2 text-text-secondary font-medium">
                {ACCOUNT_TYPE_LABELS[account.type] ?? account.type}
              </span>
              {!account.is_active && (
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-surface-2 text-text-muted">
                  Desactivada
                </span>
              )}
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-text-primary mt-1">
              {account.name}
            </h1>
          </div>

          {/* Botón de acción: Registrar pago para Tarjetas de Crédito, Ajuste express para el resto */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {isCreditCard ? (
              <RegisterCardPaymentModal
                cardAccount={account}
                currentBalance={currentBalance}
                fundingAccounts={allAccounts ?? []}
              />
            ) : (
              <ExpressAdjustModal account={account} currentBalance={currentBalance} />
            )}
          </div>
        </div>

        {/* Saldo Nominal */}
        <div className="pt-2 border-t border-border flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider font-medium">Saldo actual</p>
            <p
              className={`font-mono text-3xl md:text-4xl font-semibold mt-0.5 ${
                currentBalance < 0 ? 'text-expense' : 'text-text-primary'
              }`}
            >
              {formatMoney(currentBalance, account.currency_native)}
            </p>
          </div>

          {/* Tarjeta de Crédito: métricas de límite */}
          {isCreditCard && creditLimit > 0 && (
            <div className="sm:text-right space-y-1">
              <p className="text-xs text-text-muted">
                Disponible:{' '}
                <span className="font-mono font-medium text-text-primary">
                  {formatMoney(availableCredit, account.currency_native)}
                </span>{' '}
                / Límite: <span className="font-mono">{formatMoney(creditLimit, account.currency_native)}</span>
              </p>
              <div className="w-full sm:w-48 h-1.5 bg-surface-2 rounded-full overflow-hidden ml-auto">
                <div
                  className={`h-full transition-all duration-300 ${creditPct > 80 ? 'bg-expense' : 'bg-accent'}`}
                  style={{ width: `${creditPct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grilla: Feed de movimientos + Panel Lateral de Resumen */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Columna Izquierda: Feed de Movimientos (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold tracking-tight text-text-primary">
              Historial de movimientos
            </h2>
            <span className="text-xs text-text-muted font-mono">
              {(transactions ?? []).length} {transactions?.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>

          {!transactions || transactions.length === 0 ? (
            <div className="bg-surface-1 border border-border rounded-card p-8 text-center text-sm text-text-muted space-y-2">
              <p>Esta cuenta no tiene movimientos registrados todavía.</p>
              <p className="text-xs text-text-muted">
                {isCreditCard
                  ? 'Podés cargar un consumo con tarjeta o registrar un pago de deuda.'
                  : 'Podés cargar un movimiento o realizar un ajuste express de saldo.'}
              </p>
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

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-medium text-text-primary">
                            {t.notes ||
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

                        <div className="flex items-center gap-2 text-xs text-text-muted">
                          <span>{t.date}</span>
                          {t.categories?.name && (
                            <>
                              <span>·</span>
                              <span>{t.categories.name}</span>
                            </>
                          )}
                          {t.people?.name && (
                            <>
                              <span>·</span>
                              <span className="text-accent font-medium">{t.people.name}</span>
                            </>
                          )}
                          {t.installment_total > 1 && (
                            <span className="text-[10px] bg-pending/15 text-pending px-2 py-0.2 rounded-full">
                              Cuota {t.installment_current} de {t.installment_total}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right font-mono text-sm font-semibold">
                        {isOutcome && (
                          <span className="text-expense">
                            -{formatMoney(t.amount_account, t.currency_account)}
                          </span>
                        )}
                        {isIncome && (
                          <span className="text-income">
                            +{formatMoney(t.amount_account, t.currency_account)}
                          </span>
                        )}
                        {isAdjustment && (
                          <span className={isPositiveAdj ? 'text-income' : 'text-expense'}>
                            {isPositiveAdj ? '+' : '-'}
                            {formatMoney(Math.abs(t.amount_account), t.currency_account)}
                          </span>
                        )}
                        {isTransfer && (
                          <span className={isTransferIn ? 'text-income' : 'text-expense'}>
                            {isTransferIn ? '+' : '-'}
                            {formatMoney(Math.abs(t.amount_account), t.currency_account)}
                          </span>
                        )}
                      </div>
                      <DeleteTransactionButton transactionId={t.id} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Columna Derecha: Panel de Estadísticas y Resumen (1 col) */}
        <div className="space-y-4">
          <div className="bg-surface-1 border border-border rounded-card p-4 space-y-3">
            <h3 className="font-display text-sm font-semibold text-text-primary">Resumen del mes</h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-border/60">
                <span className="text-text-muted">Ingresos / Créditos</span>
                <span className="font-mono font-medium text-income">
                  +{formatMoney(monthlyIncome, account.currency_native)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/60">
                <span className="text-text-muted">Gastos / Débitos</span>
                <span className="font-mono font-medium text-expense">
                  -{formatMoney(monthlyExpense, account.currency_native)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-text-muted">Balance neto del mes</span>
                <span
                  className={`font-mono font-semibold ${
                    monthlyIncome - monthlyExpense >= 0 ? 'text-income' : 'text-expense'
                  }`}
                >
                  {formatMoney(monthlyIncome - monthlyExpense, account.currency_native)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-surface-1 border border-border rounded-card p-4 space-y-2 text-xs text-text-secondary">
            <h3 className="font-display text-sm font-semibold text-text-primary">Detalles técnicos</h3>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-text-muted">Moneda nativa</span>
                <span className="font-mono font-medium">{account.currency_native}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Institución</span>
                <span>{account.institutions?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Tipo</span>
                <span>{ACCOUNT_TYPE_LABELS[account.type] ?? account.type}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
