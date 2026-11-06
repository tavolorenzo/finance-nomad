'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Pencil,
  Power,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Landmark,
  PiggyBank,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react'
import { formatMoney } from '@/lib/currency'
import { useOptionalLedger } from '@/lib/ledger/ledger-context'
import { useOnlineStatus } from '@/lib/hooks/use-online-status'
import { rethrowIfRedirect } from '@/lib/next/rethrow-redirect'
import { toggleBudgetEstimateActive } from '@/app/(protected)/budget/actions'
import {
  computeBudgetMonthSummary,
  type EnrichedBudgetEstimate
} from '@/lib/budget/calculations'
import { ExecutePaymentButton } from '@/components/ExecutePaymentButton'
import { BudgetEstimateModal } from './BudgetEstimateModal'
import type {
  Account,
  BudgetEstimate,
  BudgetEstimateType,
  Category,
  LoanWithInstallments,
  MasterTransaction,
  Person
} from '@/lib/types'

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre'
]

export function formatPeriodLabel(period: string): string {
  const [y, m] = period.split('-').map(Number)
  if (!y || !m || m < 1 || m > 12) return period
  return `${MONTH_NAMES[m - 1]} ${y}`
}

export function shiftPeriod(period: string, deltaMonths: number): string {
  const [y, m] = period.split('-').map(Number)
  const d = new Date(y, (m - 1) + deltaMonths, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

interface BudgetClientProps {
  initialPeriod: string
  initialEstimates: BudgetEstimate[]
  initialTransactions: MasterTransaction[]
  initialLoans: LoanWithInstallments[]
  categories: Category[]
  accounts: (Account & { institutions?: { name: string } | null })[]
  people: Person[]
  displayCurrency: string
  currencies: string[]
  ratesMap: Record<string, number>
}

export function BudgetClient({
  initialPeriod,
  initialEstimates,
  initialTransactions,
  initialLoans,
  categories,
  accounts,
  people,
  displayCurrency,
  currencies,
  ratesMap
}: BudgetClientProps) {
  const router = useRouter()
  const isOnline = useOnlineStatus()
  const ledger = useOptionalLedger()

  const [period, setPeriod] = useState(initialPeriod)
  const [showInactive, setShowInactive] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalDefaultType, setModalDefaultType] =
    useState<BudgetEstimateType>('EXPENSE_ESTIMATE')
  const [estimateToEdit, setEstimateToEdit] = useState<BudgetEstimate | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Combinar transacciones SSR con las transacciones reactivas del Ledger en cliente (Zero-Wait UI)
  const mergedTransactions = useMemo(() => {
    const map = new Map<string, MasterTransaction>()
    for (const tx of initialTransactions) {
      map.set(tx.id, tx)
    }
    for (const tx of ledger?.recentTransactions ?? []) {
      map.set(tx.id, tx)
    }
    return Array.from(map.values())
  }, [initialTransactions, ledger?.recentTransactions])

  const accountsById = useMemo(
    () =>
      new Map(
        accounts.map((a) => [
          a.id,
          { name: a.name, currency_native: a.currency_native }
        ])
      ),
    [accounts]
  )

  const summary = useMemo(
    () =>
      computeBudgetMonthSummary({
        period,
        estimates: initialEstimates,
        transactions: mergedTransactions,
        loans: initialLoans,
        people,
        accountsById,
        displayCurrency,
        ratesMap
      }),
    [
      period,
      initialEstimates,
      mergedTransactions,
      initialLoans,
      people,
      accountsById,
      displayCurrency,
      ratesMap
    ]
  )

  const inactiveEstimates = useMemo(
    () => initialEstimates.filter((e) => e.is_active === false),
    [initialEstimates]
  )

  function openNewEstimate(type: BudgetEstimateType = 'EXPENSE_ESTIMATE') {
    setEstimateToEdit(null)
    setModalDefaultType(type)
    setModalOpen(true)
  }

  function openEditEstimate(est: BudgetEstimate) {
    setEstimateToEdit(est)
    setModalDefaultType(est.type)
    setModalOpen(true)
  }

  async function handleToggleActive(est: BudgetEstimate) {
    if (!isOnline) return
    setTogglingId(est.id)
    try {
      await toggleBudgetEstimateActive(est.id, est.is_active === false)
      router.refresh()
    } catch (err) {
      rethrowIfRedirect(err)
    } finally {
      setTogglingId(null)
    }
  }

  function renderDueBadge(est: EnrichedBudgetEstimate) {
    const isIncome = est.type === 'INCOME_ESTIMATE'
    if (est.isCovered) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-income/15 text-income">
          <CheckCircle2 size={11} />
          <span>{isIncome ? 'Acreditado' : 'Cubierto'}</span>
        </span>
      )
    }
    if (est.dueStatus === 'due_today') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-pending/20 text-pending">
          <Clock size={11} />
          <span>{isIncome ? 'Se acredita hoy' : 'Vence hoy'}</span>
        </span>
      )
    }
    if (est.dueStatus === 'overdue') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-expense/15 text-expense">
          <AlertCircle size={11} />
          <span>
            {est.daysUntilDue && est.daysUntilDue < 0
              ? `Vencido hace ${Math.abs(est.daysUntilDue)} d`
              : 'Pendiente vencido'}
          </span>
        </span>
      )
    }
    if (est.due_day) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-surface-2 text-text-secondary">
          <Calendar size={11} />
          <span>
            {est.daysUntilDue !== null && est.daysUntilDue <= 7
              ? `En ${est.daysUntilDue} d (día ${est.due_day})`
              : `Día ${est.due_day}`}
          </span>
        </span>
      )
    }
    return null
  }

  const hasAnyEstimate =
    summary.expenseEstimates.length > 0 || summary.incomeEstimates.length > 0

  return (
    <div className="space-y-6">
      {/* Cabecera + Selector de Período + Acción Primaria */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">
            Presupuesto y Gastos Fijos
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Planificá tus compromisos fijos, ingresos proyectados y cuotas vigentes del mes
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Período Contable */}
          <div className="inline-flex items-center bg-surface-1 border border-border rounded-control p-1">
            <button
              type="button"
              onClick={() => setPeriod((p) => shiftPeriod(p, -1))}
              aria-label="Mes anterior"
              className="p-1.5 text-text-secondary hover:text-text-primary rounded-control transition"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="px-3 text-xs font-semibold text-text-primary min-w-[120px] text-center">
              {formatPeriodLabel(period)}
            </span>
            <button
              type="button"
              onClick={() => setPeriod((p) => shiftPeriod(p, 1))}
              aria-label="Próximo mes"
              className="p-1.5 text-text-secondary hover:text-text-primary rounded-control transition"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => openNewEstimate('EXPENSE_ESTIMATE')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-control text-xs font-semibold bg-accent text-[color:var(--on-accent)] hover:opacity-95 transition"
          >
            <Plus size={15} />
            <span>Nuevo estimado</span>
          </button>
        </div>
      </div>

      {/* Bloque A — KPIs Consolidados en Moneda Global */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-surface-1 border border-border rounded-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">
              Gastos fijos del mes
            </span>
            <span className="p-1.5 rounded-full bg-expense/15 text-expense">
              <ArrowUpRight size={14} />
            </span>
          </div>
          <p className="font-mono tabular-nums amount text-xl font-semibold text-text-primary">
            {formatMoney(summary.totalExpenseRealDisplay, displayCurrency)}
          </p>
          <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${summary.expenseCoveragePct}%` }}
            />
          </div>
          <p className="text-[11px] text-text-muted font-mono tabular-nums amount">
            de {formatMoney(summary.totalExpenseEstimatedDisplay, displayCurrency)} ({summary.expenseCoveragePct}%)
          </p>
        </div>

        <div className="bg-surface-1 border border-border rounded-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">
              Compromisos en cuotas
            </span>
            <span className="p-1.5 rounded-full bg-pending/15 text-pending">
              <CreditCard size={14} />
            </span>
          </div>
          <p className="font-mono tabular-nums amount text-xl font-semibold text-text-primary">
            {formatMoney(summary.totalCommitmentsDisplay, displayCurrency)}
          </p>
          <p className="text-[11px] text-text-muted">
            {summary.commitments.length}{' '}
            {summary.commitments.length === 1
              ? 'cuota activa este mes'
              : 'cuotas activas este mes'}
          </p>
        </div>

        <div className="bg-surface-1 border border-border rounded-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">
              Ingresos proyectados
            </span>
            <span className="p-1.5 rounded-full bg-income/15 text-income">
              <ArrowDownLeft size={14} />
            </span>
          </div>
          <p className="font-mono tabular-nums amount text-xl font-semibold text-income">
            {formatMoney(summary.totalIncomeEstimatedDisplay, displayCurrency)}
          </p>
          <p className="text-[11px] text-text-muted font-mono tabular-nums amount">
            Acreditado: {formatMoney(summary.totalIncomeRealDisplay, displayCurrency)} ({summary.incomeCoveragePct}%)
          </p>
        </div>

        <div className="bg-surface-1 border border-border rounded-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">
              Margen proyectado
            </span>
            <span className="p-1.5 rounded-full bg-accent/15 text-accent">
              <PiggyBank size={14} />
            </span>
          </div>
          <p
            className={`font-mono tabular-nums amount text-xl font-semibold ${
              summary.projectedSavingsDisplay >= 0 ? 'text-income' : 'text-expense'
            }`}
          >
            {formatMoney(summary.projectedSavingsDisplay, displayCurrency)}
          </p>
          <p className="text-[11px] text-text-muted">
            Ingresos menos gastos fijos y cuotas
          </p>
        </div>
      </div>

      {/* Estado vacío guiado si aún no hay estimaciones */}
      {!hasAnyEstimate && summary.commitments.length === 0 && (
        <div className="bg-surface-1 border border-border rounded-card p-8 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-accent/15 text-accent flex items-center justify-center">
            <PiggyBank size={24} />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h2 className="font-display text-base font-semibold text-text-primary">
              Todavía no configuraste tu presupuesto mensual
            </h2>
            <p className="text-xs text-text-muted">
              Cargá tus gastos fijos (alquiler, servicios, suscripciones) y tus ingresos proyectados para medir tu avance del mes y ejecutar pagos en un solo toque.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => openNewEstimate('EXPENSE_ESTIMATE')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-control text-xs font-semibold bg-accent text-[color:var(--on-accent)] hover:opacity-95 transition"
            >
              <Plus size={14} />
              <span>Agregar gasto fijo</span>
            </button>
            <button
              type="button"
              onClick={() => openNewEstimate('INCOME_ESTIMATE')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-control text-xs font-semibold bg-surface-2 text-text-primary hover:bg-surface-2/80 border border-border transition"
            >
              <Plus size={14} />
              <span>Agregar ingreso proyectado</span>
            </button>
          </div>
        </div>
      )}

      {/* Bloque B — Gastos Fijos Recurrentes */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-semibold tracking-tight text-text-primary">
              Gastos fijos recurrentes
            </h2>
            <p className="text-xs text-text-muted">
              Se cruzan automáticamente con los gastos reales de su categoría en {formatPeriodLabel(period)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => openNewEstimate('EXPENSE_ESTIMATE')}
            className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
          >
            <Plus size={14} />
            <span>Agregar gasto fijo</span>
          </button>
        </div>

        {summary.expenseEstimates.length === 0 ? (
          <div className="bg-surface-1 border border-border rounded-card p-5 text-center text-xs text-text-muted">
            No tenés gastos fijos activos. Sumá tu alquiler, gimnasio o suscripciones para seguirlos mes a mes.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {summary.expenseEstimates.map((est) => {
              const prefAcc = est.preferred_account_id
                ? accountsById.get(est.preferred_account_id)
                : null

              return (
                <div
                  key={est.id}
                  className="bg-surface-1 border border-border rounded-card p-4 space-y-3 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-text-primary">
                          {est.name}
                        </p>
                        {renderDueBadge(est)}
                      </div>
                      <p className="text-xs text-text-muted">
                        {est.categories?.name ?? 'Sin categoría'}
                        {prefAcc ? ` · Cuenta: ${prefAcc.name}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <ExecutePaymentButton
                        estimateId={est.id}
                        estimate={est}
                        disabled={est.isCovered}
                        accounts={accounts}
                        ratesMap={ratesMap}
                        displayCurrency={displayCurrency}
                      />
                      <button
                        type="button"
                        onClick={() => openEditEstimate(est)}
                        aria-label={`Editar ${est.name}`}
                        className="p-1.5 rounded-control text-text-muted hover:text-text-primary hover:bg-surface-2 transition"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={togglingId === est.id || !isOnline}
                        onClick={() => handleToggleActive(est)}
                        aria-label={`Desactivar ${est.name}`}
                        title="Desactivar estimación"
                        className="p-1.5 rounded-control text-text-muted hover:text-expense hover:bg-expense/10 transition disabled:opacity-40"
                      >
                        <Power size={14} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          est.isCovered ? 'bg-income' : 'bg-accent'
                        }`}
                        style={{ width: `${est.coveragePct}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-xs text-text-muted mt-1.5 font-mono tabular-nums amount">
                      <span>{est.coveragePct}% cubierto</span>
                      <span>
                        {formatMoney(est.realAmountInEstimateCurrency, est.currency)} /{' '}
                        {formatMoney(est.estimated_amount, est.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Bloque C — Compromisos Automáticos del Mes (Cuotas de Tarjetas y Préstamos) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-semibold tracking-tight text-text-primary">
              Compromisos y cuotas del mes
            </h2>
            <p className="text-xs text-text-muted">
              Cuotas vigentes de tarjetas de crédito y préstamos programados para {formatPeriodLabel(period)}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <Link href="/cards" className="text-accent hover:underline">
              Ver tarjetas →
            </Link>
            <Link href="/loans" className="text-accent hover:underline">
              Ver préstamos →
            </Link>
          </div>
        </div>

        {summary.commitments.length === 0 ? (
          <div className="bg-surface-1 border border-border rounded-card p-5 text-center text-xs text-text-muted">
            No tenés cuotas de tarjetas ni vencimientos de préstamos registrados para {formatPeriodLabel(period)}.
          </div>
        ) : (
          <div className="bg-surface-1 border border-border rounded-card divide-y divide-border">
            {summary.commitments.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3.5 gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`p-2 rounded-full shrink-0 ${
                      item.kind === 'CARD_INSTALLMENT'
                        ? 'bg-accent/15 text-accent'
                        : 'bg-pending/15 text-pending'
                    }`}
                  >
                    {item.kind === 'CARD_INSTALLMENT' ? (
                      <CreditCard size={15} />
                    ) : (
                      <Landmark size={15} />
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={item.targetHref}
                        className="text-sm font-medium text-text-primary hover:text-accent truncate transition"
                      >
                        {item.title}
                      </Link>
                      <span className="text-[11px] bg-pending/15 text-pending px-2 py-0.5 rounded-full font-mono shrink-0">
                        {item.installmentCurrent}/{item.installmentTotal}
                      </span>
                      {item.status === 'COMPLETED' && (
                        <span className="text-[10px] bg-income/15 text-income px-1.5 py-0.5 rounded font-medium shrink-0">
                          Imputada
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted truncate">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-mono tabular-nums amount text-sm font-semibold text-expense">
                    {formatMoney(item.amount, item.currency)}
                  </p>
                  {item.currency.toUpperCase() !== displayCurrency.toUpperCase() && (
                    <p className="font-mono tabular-nums amount text-[11px] text-text-muted">
                      ≈ {formatMoney(item.amountInDisplayCurrency, displayCurrency)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Bloque D — Ingresos Proyectados */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-semibold tracking-tight text-text-primary">
              Ingresos proyectados
            </h2>
            <p className="text-xs text-text-muted">
              Sueldos, honorarios o cobros recurrentes esperados cada mes
            </p>
          </div>
          <button
            type="button"
            onClick={() => openNewEstimate('INCOME_ESTIMATE')}
            className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
          >
            <Plus size={14} />
            <span>Agregar ingreso</span>
          </button>
        </div>

        {summary.incomeEstimates.length === 0 ? (
          <div className="bg-surface-1 border border-border rounded-card p-5 text-center text-xs text-text-muted">
            Definí tus ingresos proyectados para calcular tu capacidad de ahorro mensual.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {summary.incomeEstimates.map((est) => {
              const prefAcc = est.preferred_account_id
                ? accountsById.get(est.preferred_account_id)
                : null

              return (
                <div
                  key={est.id}
                  className="bg-surface-1 border border-border rounded-card p-4 space-y-3 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-text-primary">
                          {est.name}
                        </p>
                        {renderDueBadge(est)}
                      </div>
                      <p className="text-xs text-text-muted">
                        {est.categories?.name ?? 'Sin categoría'}
                        {prefAcc ? ` · Cuenta: ${prefAcc.name}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <ExecutePaymentButton
                        estimateId={est.id}
                        estimate={est}
                        disabled={est.isCovered}
                        accounts={accounts}
                        ratesMap={ratesMap}
                        displayCurrency={displayCurrency}
                      />
                      <button
                        type="button"
                        onClick={() => openEditEstimate(est)}
                        aria-label={`Editar ${est.name}`}
                        className="p-1.5 rounded-control text-text-muted hover:text-text-primary hover:bg-surface-2 transition"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={togglingId === est.id || !isOnline}
                        onClick={() => handleToggleActive(est)}
                        aria-label={`Desactivar ${est.name}`}
                        title="Desactivar estimación"
                        className="p-1.5 rounded-control text-text-muted hover:text-expense hover:bg-expense/10 transition disabled:opacity-40"
                      >
                        <Power size={14} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-income transition-all duration-300"
                        style={{ width: `${est.coveragePct}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-xs text-text-muted mt-1.5 font-mono tabular-nums amount">
                      <span>{est.coveragePct}% acreditado</span>
                      <span className="text-income font-semibold">
                        {formatMoney(est.realAmountInEstimateCurrency, est.currency)} /{' '}
                        {formatMoney(est.estimated_amount, est.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Sección opcional de estimaciones inactivas */}
      {inactiveEstimates.length > 0 && (
        <section className="pt-2 border-t border-border-subtle space-y-3">
          <button
            type="button"
            onClick={() => setShowInactive((v) => !v)}
            className="text-xs text-text-muted hover:text-text-primary transition"
          >
            {showInactive
              ? 'Ocultar estimaciones desactivadas'
              : `Mostrar estimaciones desactivadas (${inactiveEstimates.length})`}
          </button>

          {showInactive && (
            <div className="bg-surface-1 border border-border rounded-card divide-y divide-border">
              {inactiveEstimates.map((est) => (
                <div
                  key={est.id}
                  className="flex items-center justify-between p-3 text-xs opacity-75"
                >
                  <div>
                    <p className="font-medium text-text-primary">
                      {est.name}{' '}
                      <span className="text-text-muted">
                        ({est.type === 'INCOME_ESTIMATE' ? 'Ingreso' : 'Gasto fijo'})
                      </span>
                    </p>
                    <p className="font-mono tabular-nums amount text-text-muted">
                      {formatMoney(est.estimated_amount, est.currency)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditEstimate(est)}
                      className="px-2.5 py-1 rounded-control bg-surface-2 text-text-secondary hover:text-text-primary"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      disabled={togglingId === est.id || !isOnline}
                      onClick={() => handleToggleActive(est)}
                      className="px-2.5 py-1 rounded-control bg-accent/15 text-accent font-medium hover:opacity-90 disabled:opacity-40"
                    >
                      Reactivar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <BudgetEstimateModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        estimateToEdit={estimateToEdit}
        defaultType={modalDefaultType}
        categories={categories}
        accounts={accounts}
        currencies={currencies}
        displayCurrency={displayCurrency}
        onSuccess={() => router.refresh()}
      />
    </div>
  )
}
