'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircle2,
  Clock,
  Edit3,
  CalendarArrowUp,
  Plus,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Building2,
  Users,
  Layers,
  CheckCheck,
  X,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { formatMoney } from '@/lib/currency'
import { convertToDisplayCurrency } from '@/lib/networth'
import { CategoryModal } from '@/components/CategoryModal'
import {
  calculateAccountingPeriod,
  formatAccountingPeriodLabel
} from '@/lib/ledger/builder'
import {
  verifyCardStatementItemAction,
  verifyAllStatementItemsAction,
  shiftTransactionToNextMonthAction,
  amendCardTransactionAction,
  addMissingStatementTransactionAction
} from '@/app/(protected)/accounts/verify-card-actions'
import type { Account, Category, Institution, MasterTransaction, Person } from '@/lib/types'

export type StatementTransactionRow = MasterTransaction & {
  categories?: { name: string } | null
  people?: { name: string } | null
}

interface CreditCardStatementVerifierProps {
  account: Account & { institutions?: Institution | { name: string } | null }
  transactions: StatementTransactionRow[]
  categories: Category[]
  people: Person[]
  initialPeriod: string
  displayCurrency?: string
}

const INSTALLMENT_OPTIONS = [1, 2, 3, 4, 6, 10, 12, 18, 24]

export function CreditCardStatementVerifier({
  account,
  transactions,
  categories,
  people,
  initialPeriod,
  displayCurrency
}: CreditCardStatementVerifierProps) {
  const router = useRouter()
  const userDefaultCurrency = displayCurrency || account.currency_native
  const [localCategories, setLocalCategories] = useState<Category[]>(categories)
  useEffect(() => {
    setLocalCategories(categories)
  }, [categories])
  const [creatingCategoryTarget, setCreatingCategoryTarget] = useState<'edit' | 'add' | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState(initialPeriod)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'VERIFIED'>('ALL')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Estado para modal "Corregir gasto"
  const [editingTx, setEditingTx] = useState<StatementTransactionRow | null>(null)
  const [editNotes, setEditNotes] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editAmountOriginal, setEditAmountOriginal] = useState('')
  const [editCurrencyOriginal, setEditCurrencyOriginal] = useState('')
  const [editAmountAccount, setEditAmountAccount] = useState('')
  const [editCategoryId, setEditCategoryId] = useState<string>('')
  const [editPersonId, setEditPersonId] = useState<string>('')
  const [savingEdit, setSavingEdit] = useState(false)

  // Estado para modal "Agregar gasto faltante"
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [addDescription, setAddDescription] = useState('')
  const [addDate, setAddDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [addAmountOriginal, setAddAmountOriginal] = useState('')
  const [addCurrencyOriginal, setAddCurrencyOriginal] = useState(account.currency_native)
  const [addAmountAccount, setAddAmountAccount] = useState('')
  const [addInstallmentCurrent, setAddInstallmentCurrent] = useState(1)
  const [addInstallmentTotal, setAddInstallmentTotal] = useState(1)
  const [addCategoryId, setAddCategoryId] = useState<string>(categories[0]?.id ?? '')
  const [addPersonId, setAddPersonId] = useState<string>(
    people.find((p) => p.name.trim().toLowerCase() === 'personal')?.id ?? ''
  )
  const [savingAdd, setSavingAdd] = useState(false)

  const personalPersonId = useMemo(
    () => people.find((p) => p.name.trim().toLowerCase() === 'personal')?.id ?? null,
    [people]
  )

  const availableCurrencies = useMemo(
    () => Array.from(new Set([account.currency_native, 'USD', 'EUR', 'UYU', 'ARS'])),
    [account.currency_native]
  )

  // Filtrar los consumos que imputan al mes contable seleccionado
  const periodExpenses = useMemo(() => {
    return transactions.filter((t) => {
      if (t.type !== 'OUTCOME') return false
      const effectivePeriod = t.accounting_period || t.date.slice(0, 7)
      return effectivePeriod === selectedPeriod
    })
  }, [transactions, selectedPeriod])

  const filteredExpenses = useMemo(() => {
    if (statusFilter === 'PENDING') {
      return periodExpenses.filter((t) => !t.is_verified)
    }
    if (statusFilter === 'VERIFIED') {
      return periodExpenses.filter((t) => Boolean(t.is_verified))
    }
    return periodExpenses
  }, [periodExpenses, statusFilter])

  // Cálculos de resumen (Pills) incluyendo desglose multi-moneda
  const summary = useMemo(() => {
    let totalNative = 0
    let verifiedCount = 0
    let pendingCount = 0
    let verifiedAmountNative = 0
    let pendingAmountNative = 0
    let installmentsCount = 0
    let sharedTotalNative = 0
    const byOriginalCurrency: Record<string, number> = {
      [account.currency_native]: 0,
      ...(account.currency_native !== 'USD' ? { USD: 0 } : {})
    }

    for (const t of periodExpenses) {
      const amtNative = Math.abs(Number(t.amount_account) || 0)
      const amtOrig = Math.abs(Number(t.amount_original) || 0)
      const currOrig = t.currency_original || account.currency_native

      totalNative += amtNative
      byOriginalCurrency[currOrig] = Math.round(((byOriginalCurrency[currOrig] || 0) + amtOrig) * 100) / 100

      if (t.is_verified) {
        verifiedCount++
        verifiedAmountNative += amtNative
      } else {
        pendingCount++
        pendingAmountNative += amtNative
      }

      if (t.installment_total > 1) {
        installmentsCount++
      }

      if (t.person_id && t.person_id !== personalPersonId) {
        sharedTotalNative += amtNative
      }
    }

    return {
      totalNative: Math.round(totalNative * 100) / 100,
      verifiedCount,
      pendingCount,
      totalCount: periodExpenses.length,
      verifiedAmountNative: Math.round(verifiedAmountNative * 100) / 100,
      pendingAmountNative: Math.round(pendingAmountNative * 100) / 100,
      installmentsCount,
      sharedTotalNative: Math.round(sharedTotalNative * 100) / 100,
      byOriginalCurrency
    }
  }, [periodExpenses, account.currency_native, personalPersonId])

  const currencyEntries = Object.entries(summary.byOriginalCurrency)
  const [consolidatedUserTotal, setConsolidatedUserTotal] = useState<number>(summary.totalNative)

  useEffect(() => {
    let active = true
    const today = new Date().toISOString().slice(0, 10)
    if (userDefaultCurrency === account.currency_native) {
      setConsolidatedUserTotal(summary.totalNative)
      return
    }
    convertToDisplayCurrency(
      currencyEntries.map(([curr, amt]) => ({
        accountId: `${account.id}-${curr}`,
        currency: curr,
        balance: amt
      })),
      userDefaultCurrency,
      today
    )
      .then((val) => {
        if (active) setConsolidatedUserTotal(val)
      })
      .catch(() => {
        if (active) setConsolidatedUserTotal(summary.totalNative)
      })
    return () => {
      active = false
    }
  }, [currencyEntries, userDefaultCurrency, account.currency_native, account.id, summary.totalNative])

  const nextPeriod = calculateAccountingPeriod(selectedPeriod, 1)
  const prevPeriod = calculateAccountingPeriod(selectedPeriod, -1)

  async function handleToggleVerify(tx: StatementTransactionRow) {
    setBusyId(tx.id)
    setFeedback(null)
    try {
      const nextVerified = !tx.is_verified
      await verifyCardStatementItemAction({
        transactionId: tx.id,
        verified: nextVerified
      })
      router.refresh()
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'No se pudo actualizar el gasto.'
      })
    } finally {
      setBusyId(null)
    }
  }

  async function handleVerifyAllPending() {
    const pendingIds = periodExpenses.filter((t) => !t.is_verified).map((t) => t.id)
    if (pendingIds.length === 0) return

    setBulkBusy(true)
    setFeedback(null)
    try {
      await verifyAllStatementItemsAction({
        accountId: account.id,
        accountingPeriod: selectedPeriod,
        transactionIds: pendingIds
      })
      setFeedback({
        type: 'success',
        message: `Se confirmaron ${pendingIds.length} gastos del resumen.`
      })
      router.refresh()
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'No se pudieron confirmar los gastos.'
      })
    } finally {
      setBulkBusy(false)
    }
  }

  async function handleShiftToNextMonth(tx: StatementTransactionRow) {
    setBusyId(tx.id)
    setFeedback(null)
    try {
      const res = await shiftTransactionToNextMonthAction({ transactionId: tx.id })
      const labelNext = formatAccountingPeriodLabel(res.newPeriod)
      setFeedback({
        type: 'success',
        message:
          res.shiftedCount > 1
            ? `Se desplazaron ${res.shiftedCount} cuotas en cascada a partir de ${labelNext}.`
            : `Gasto asignado al resumen de ${labelNext}.`
      })
      router.refresh()
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'No se pudo mover el gasto al próximo mes.'
      })
    } finally {
      setBusyId(null)
    }
  }

  function openEditModal(tx: StatementTransactionRow) {
    setEditingTx(tx)
    setEditNotes(tx.notes ?? '')
    setEditDate(tx.date)
    setEditAmountOriginal(String(tx.amount_original))
    setEditCurrencyOriginal(tx.currency_original)
    setEditAmountAccount(String(tx.amount_account))
    setEditCategoryId(tx.category_id ?? '')
    setEditPersonId(tx.person_id ?? '')
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingTx) return

    const origNum = parseFloat(editAmountOriginal)
    const accNum =
      editCurrencyOriginal === account.currency_native
        ? origNum
        : parseFloat(editAmountAccount) || origNum

    if (isNaN(origNum) || origNum <= 0) return

    setSavingEdit(true)
    setFeedback(null)
    try {
      await amendCardTransactionAction({
        transactionId: editingTx.id,
        notes: editNotes,
        date: editDate,
        amountOriginal: origNum,
        currencyOriginal: editCurrencyOriginal,
        amountAccount: accNum,
        categoryId: editCategoryId || null,
        personId: editPersonId || null
      })
      setEditingTx(null)
      setFeedback({
        type: 'success',
        message: 'Gasto corregido y marcado como verificado.'
      })
      router.refresh()
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'No se pudo guardar la corrección.'
      })
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleSaveAddMissing(e: React.FormEvent) {
    e.preventDefault()
    const origNum = parseFloat(addAmountOriginal)
    if (isNaN(origNum) || origNum <= 0 || !addDescription.trim()) return

    const accNum =
      addCurrencyOriginal === account.currency_native
        ? origNum
        : parseFloat(addAmountAccount) || undefined

    setSavingAdd(true)
    setFeedback(null)
    try {
      await addMissingStatementTransactionAction({
        accountId: account.id,
        accountingPeriod: selectedPeriod,
        date: addDate,
        description: addDescription,
        amountOriginal: origNum,
        currencyOriginal: addCurrencyOriginal,
        amountAccount: accNum,
        installmentCurrent: addInstallmentCurrent,
        installmentTotal: addInstallmentTotal,
        categoryId: addCategoryId || null,
        personId: addPersonId || null
      })
      setIsAddOpen(false)
      setAddDescription('')
      setAddAmountOriginal('')
      setAddAmountAccount('')
      setAddInstallmentCurrent(1)
      setAddInstallmentTotal(1)
      setFeedback({
        type: 'success',
        message: 'Gasto agregado al estado de cuenta y verificado.'
      })
      router.refresh()
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'No se pudo agregar el gasto.'
      })
    } finally {
      setSavingAdd(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Navegación superior */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Link
          href={`/accounts/${account.id}`}
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition"
        >
          <span>←</span>
          <span>Volver a {account.name}</span>
        </Link>

        {account.closing_day && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-surface-2 text-text-secondary font-mono">
            Día de cierre configurado: {account.closing_day} de cada mes
          </span>
        )}
      </div>

      {/* Cabecera y Selector de Mes Contable */}
      <div className="bg-surface-1 border border-border rounded-card p-5 md:p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-text-muted font-medium">
              <Building2 size={13} />
              <span>{account.institutions?.name}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1 text-accent">
                <CreditCard size={13} />
                Conciliación de estado de cuenta
              </span>
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-text-primary mt-1">
              {account.name}
            </h1>
          </div>

          {/* Selector de Período Contable */}
          <div className="flex items-center gap-2 self-start md:self-auto bg-surface-0 border border-border rounded-control p-1.5">
            <button
              type="button"
              onClick={() => setSelectedPeriod(prevPeriod)}
              aria-label="Mes anterior"
              className="p-1.5 rounded hover:bg-surface-2 text-text-secondary hover:text-text-primary transition"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="px-3 text-center min-w-[140px]">
              <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium">
                Mes contable
              </p>
              <p className="text-sm font-semibold text-text-primary">
                {formatAccountingPeriodLabel(selectedPeriod)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedPeriod(nextPeriod)}
              aria-label="Mes siguiente"
              className="p-1.5 rounded hover:bg-surface-2 text-text-secondary hover:text-text-primary transition"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Summary con Pills */}
        <div className="pt-4 border-t border-border space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Resumen del período ({formatAccountingPeriodLabel(selectedPeriod)})
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {summary.pendingCount > 0 && (
                <button
                  type="button"
                  onClick={handleVerifyAllPending}
                  disabled={bulkBusy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-semibold bg-income/15 text-income hover:bg-income/25 transition disabled:opacity-50"
                >
                  {bulkBusy ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={14} />}
                  <span>Confirmar todos ({summary.pendingCount})</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsAddOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-semibold bg-accent text-[color:var(--on-accent)] hover:opacity-90 transition"
              >
                <Plus size={14} />
                <span>Agregar gasto al resumen</span>
              </button>
            </div>
          </div>

          {/* Grilla de Pills de Resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Pill 1: Total adeudado en las monedas de la tarjeta (moneda local y USD) + consolidado discreto */}
            <div className="bg-surface-0 border border-border rounded-control p-3.5 space-y-2">
              <span className="text-[11px] text-text-muted font-medium block">
                Total adeudado por moneda (Desglose por moneda de origen)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {currencyEntries.map(([curr, amt]) => (
                  <span
                    key={curr}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono tabular-nums font-bold amount bg-expense/10 text-expense border border-expense/30"
                  >
                    {formatMoney(amt, curr)}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-text-muted font-mono tabular-nums amount">
                Consolidado ({userDefaultCurrency}):{' '}
                <span className="text-text-secondary font-medium">
                  {formatMoney(consolidatedUserTotal, userDefaultCurrency)}
                </span>
              </p>
            </div>

            {/* Pill 2: Compras en cuotas */}
            <div className="bg-surface-0 border border-border rounded-control p-3.5 space-y-1">
              <span className="text-[11px] text-text-muted font-medium flex items-center gap-1">
                <Layers size={12} />
                Compras en cuotas
              </span>
              <p className="font-mono tabular-nums text-xl font-bold text-text-primary">
                {summary.installmentsCount}
              </p>
              <p className="text-[11px] text-text-muted">
                {summary.installmentsCount === 1 ? 'cuota activa este mes' : 'cuotas activas este mes'}
              </p>
            </div>

            {/* Pill 3: Estado de Verificación */}
            <div className="bg-surface-0 border border-border rounded-control p-3.5 space-y-1">
              <span className="text-[11px] text-text-muted font-medium">
                Estado de verificación
              </span>
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-mono tabular-nums text-lg font-bold text-income">
                  {summary.verifiedCount} / {summary.totalCount}
                </p>
                {summary.pendingCount > 0 ? (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-pending/15 text-pending font-medium">
                    {summary.pendingCount} {summary.pendingCount === 1 ? 'pendiente' : 'pendientes'}
                  </span>
                ) : summary.totalCount > 0 ? (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-income/15 text-income font-medium">
                    Conciliado
                  </span>
                ) : null}
              </div>
              <p className="text-[11px] text-text-muted font-mono tabular-nums amount">
                Confirmado: {formatMoney(summary.verifiedAmountNative, account.currency_native)}
              </p>
            </div>

            {/* Pill 4: Gastos compartidos / terceros */}
            <div className="bg-surface-0 border border-border rounded-control p-3.5 space-y-1">
              <span className="text-[11px] text-text-muted font-medium flex items-center gap-1">
                <Users size={12} />
                Gastos de terceros en resumen
              </span>
              <p className="font-mono tabular-nums amount text-xl font-bold text-accent">
                {formatMoney(summary.sharedTotalNative, account.currency_native)}
              </p>
              <p className="text-[11px] text-text-muted">
                Asignados a otras personas
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback de acción */}
      {feedback && (
        <div
          className={`p-3.5 rounded-control border text-xs flex items-center justify-between gap-2 ${
            feedback.type === 'success'
              ? 'bg-income/10 border-income/30 text-income'
              : 'bg-expense/10 border-expense/30 text-expense'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-text-muted hover:text-text-primary"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filtros de estado y lista de gastos */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                statusFilter === 'ALL'
                  ? 'bg-accent text-[color:var(--on-accent)]'
                  : 'bg-surface-1 border border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              Todos ({summary.totalCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                statusFilter === 'PENDING'
                  ? 'bg-pending text-surface-0'
                  : 'bg-surface-1 border border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              Pendientes ({summary.pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('VERIFIED')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                statusFilter === 'VERIFIED'
                  ? 'bg-income text-surface-0'
                  : 'bg-surface-1 border border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              Confirmados ({summary.verifiedCount})
            </button>
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="bg-surface-1 border border-border rounded-card p-8 text-center space-y-2">
            <p className="text-sm text-text-secondary font-medium">
              No hay consumos en {formatAccountingPeriodLabel(selectedPeriod)} para este filtro.
            </p>
            <p className="text-xs text-text-muted">
              Si tenés un gasto en tu resumen bancario que no anotaste, agregalo con el botón superior.
            </p>
          </div>
        ) : (
          <div className="bg-surface-1 border border-border rounded-card divide-y divide-border">
            {filteredExpenses.map((tx) => {
              const isVerified = Boolean(tx.is_verified)
              const isBusy = busyId === tx.id
              const isForeign = tx.currency_original !== account.currency_native

              return (
                <div
                  key={tx.id}
                  className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 transition ${
                    isVerified ? 'bg-income/[0.03]' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleVerify(tx)}
                      disabled={isBusy}
                      title={isVerified ? 'Confirmado en resumen' : 'Marcar como confirmado'}
                      className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 border transition ${
                        isVerified
                          ? 'bg-income/15 border-income text-income'
                          : 'bg-surface-0 border-border text-text-muted hover:border-income hover:text-income'
                      }`}
                    >
                      {isBusy ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : isVerified ? (
                        <CheckCircle2 size={15} />
                      ) : (
                        <Clock size={14} />
                      )}
                    </button>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-text-primary">
                          {tx.notes || 'Consumo con tarjeta'}
                        </span>
                        {tx.installment_total > 1 && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-pending/15 text-pending">
                            Cuota {tx.installment_current} de {tx.installment_total}
                          </span>
                        )}
                        {isVerified ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-income/15 text-income">
                            Confirmado
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-2 text-text-muted">
                            Sin verificar
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-text-muted flex-wrap">
                        <span className="font-mono">{tx.date}</span>
                        {tx.categories?.name && (
                          <>
                            <span>·</span>
                            <span>{tx.categories.name}</span>
                          </>
                        )}
                        {tx.people?.name && (
                          <>
                            <span>·</span>
                            <span className="text-accent font-medium">{tx.people.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Montos y Acciones */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between md:justify-end gap-3 pl-10 md:pl-0">
                    <div className=" sm:text-right">
                      <p className="font-mono tabular-nums amount text-sm font-bold text-expense">
                        {formatMoney(Math.abs(tx.amount_account), account.currency_native)}
                      </p>
                      {isForeign && (
                        <p className="font-mono tabular-nums amount text-[11px] text-text-muted">
                          Orig: {formatMoney(Math.abs(tx.amount_original), tx.currency_original)}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Acción 1: Confirmar / Desmarcar */}
                      <button
                        type="button"
                        onClick={() => handleToggleVerify(tx)}
                        disabled={isBusy}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-control text-xs font-medium border transition ${
                          isVerified
                            ? 'border-border bg-surface-0 text-text-secondary hover:text-text-primary'
                            : 'border-income/40 bg-income/10 text-income hover:bg-income/20'
                        }`}
                      >
                        <CheckCircle2 size={13} />
                        <span>{isVerified ? 'Confirmado' : 'Confirmar'}</span>
                      </button>

                      {/* Acción 2: Corregir */}
                      <button
                        type="button"
                        onClick={() => openEditModal(tx)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-control text-xs font-medium border border-border bg-surface-0 text-text-secondary hover:text-text-primary transition"
                      >
                        <Edit3 size={13} />
                        <span>Corregir</span>
                      </button>

                      {/* Acción 3: Asignar al próximo mes */}
                      <button
                        type="button"
                        onClick={() => handleShiftToNextMonth(tx)}
                        disabled={isBusy}
                        title={
                          tx.installment_total > 1
                            ? `Desplazar esta cuota y las siguientes a partir de ${formatAccountingPeriodLabel(nextPeriod)}`
                            : `Mover al resumen de ${formatAccountingPeriodLabel(nextPeriod)}`
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-control text-xs font-medium border border-border bg-surface-0 text-text-secondary hover:text-accent hover:border-accent/50 transition"
                      >
                        <CalendarArrowUp size={13} />
                        <span>Asignar al próximo mes</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal: Corregir Gasto */}
      {editingTx && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-surface-1 border border-border rounded-card max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-text-primary">
                Corregir gasto del resumen
              </h3>
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className="text-text-muted hover:text-text-primary"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Descripción / Comercio
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Monto original
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editAmountOriginal}
                    onChange={(e) => setEditAmountOriginal(e.target.value)}
                    className="w-full font-mono text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Moneda
                  </label>
                  <select
                    value={editCurrencyOriginal}
                    onChange={(e) => setEditCurrencyOriginal(e.target.value)}
                    className="w-full font-mono text-sm"
                  >
                    {availableCurrencies.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {editCurrencyOriginal !== account.currency_native && (
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Monto en cuenta ({account.currency_native})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editAmountAccount}
                    onChange={(e) => setEditAmountAccount(e.target.value)}
                    className="w-full font-mono text-sm"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Fecha de compra
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Categoría
                  </label>
                  <select
                    value={editCategoryId}
                    onChange={(e) => {
                      if (e.target.value === '__CREATE_CATEGORY__') {
                        setCreatingCategoryTarget('edit')
                        return
                      }
                      setEditCategoryId(e.target.value)
                    }}
                    className="w-full text-xs"
                  >
                    <option value="">Sin categoría</option>
                    {localCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                    <option value="__CREATE_CATEGORY__">+ Crear categoría...</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Persona asignada
                </label>
                <select
                  value={editPersonId}
                  onChange={(e) => setEditPersonId(e.target.value)}
                  className="w-full text-xs"
                >
                  <option value="">Personal</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="px-3 py-2 rounded-control text-xs font-medium border border-border text-text-secondary hover:text-text-primary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 rounded-control text-xs font-semibold bg-accent text-[color:var(--on-accent)] hover:opacity-90 disabled:opacity-50"
                >
                  {savingEdit ? 'Guardando...' : 'Guardar y confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Agregar gasto faltante al resumen */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-surface-1 border border-border rounded-card max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-text-primary">
                  Agregar gasto al resumen
                </h3>
                <p className="text-xs text-text-muted">
                  Se imputará a {formatAccountingPeriodLabel(selectedPeriod)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="text-text-muted hover:text-text-primary"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAddMissing} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Descripción / Comercio
                </label>
                <input
                  type="text"
                  placeholder="Ej. Spotify, Seguro, Supermercado..."
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value)}
                  className="w-full text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Monto
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={addAmountOriginal}
                    onChange={(e) => setAddAmountOriginal(e.target.value)}
                    className="w-full font-mono text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Moneda
                  </label>
                  <select
                    value={addCurrencyOriginal}
                    onChange={(e) => setAddCurrencyOriginal(e.target.value)}
                    className="w-full font-mono text-sm"
                  >
                    {availableCurrencies.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {addCurrencyOriginal !== account.currency_native && (
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Monto convertido en cuenta ({account.currency_native}, opcional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Automático si lo dejás vacío"
                    value={addAmountAccount}
                    onChange={(e) => setAddAmountAccount(e.target.value)}
                    className="w-full font-mono text-sm"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Fecha de compra
                  </label>
                  <input
                    type="date"
                    value={addDate}
                    onChange={(e) => setAddDate(e.target.value)}
                    className="w-full text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Categoría
                  </label>
                  <select
                    value={addCategoryId}
                    onChange={(e) => {
                      if (e.target.value === '__CREATE_CATEGORY__') {
                        setCreatingCategoryTarget('add')
                        return
                      }
                      setAddCategoryId(e.target.value)
                    }}
                    className="w-full text-xs"
                  >
                    <option value="">Sin categoría</option>
                    {localCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                    <option value="__CREATE_CATEGORY__">+ Crear categoría...</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Cuota actual
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={addInstallmentTotal}
                    value={addInstallmentCurrent}
                    onChange={(e) =>
                      setAddInstallmentCurrent(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    className="w-full font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Total de cuotas
                  </label>
                  <select
                    value={addInstallmentTotal}
                    onChange={(e) => {
                      const tot = parseInt(e.target.value) || 1
                      setAddInstallmentTotal(tot)
                      if (addInstallmentCurrent > tot) setAddInstallmentCurrent(tot)
                    }}
                    className="w-full font-mono text-xs"
                  >
                    {INSTALLMENT_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n === 1 ? '1 pago (Contado)' : `${n} cuotas`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Persona asignada
                </label>
                <select
                  value={addPersonId}
                  onChange={(e) => setAddPersonId(e.target.value)}
                  className="w-full text-xs"
                >
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3 py-2 rounded-control text-xs font-medium border border-border text-text-secondary hover:text-text-primary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingAdd}
                  className="px-4 py-2 rounded-control text-xs font-semibold bg-accent text-[color:var(--on-accent)] hover:opacity-90 disabled:opacity-50"
                >
                  {savingAdd ? 'Agregando...' : 'Agregar y confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Creación Rápida de Categoría */}
      <CategoryModal
        isOpen={creatingCategoryTarget !== null}
        onClose={() => setCreatingCategoryTarget(null)}
        onSuccess={(newCat) => {
          setLocalCategories((prev) =>
            [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name))
          )
          if (creatingCategoryTarget === 'edit') {
            setEditCategoryId(newCat.id)
          } else if (creatingCategoryTarget === 'add') {
            setAddCategoryId(newCat.id)
          }
        }}
      />
    </div>
  )
}

