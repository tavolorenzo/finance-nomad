'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Edit2,
  SlidersHorizontal,
  CreditCard,
  Building2,
  Sparkles,
  ClipboardCheck,
  CheckCircle2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Tag
} from 'lucide-react'
import { formatMoney } from '@/lib/currency'
import { calculateAccountingPeriod, formatAccountingPeriodLabel } from '@/lib/ledger/builder'
import { useOptionalLedger } from '@/lib/ledger/ledger-context'
import { getCachedRate } from '@/lib/storage/fx-cache'
import { ExpressAdjustModal } from '@/components/ExpressAdjustModal'
import { RegisterCardPaymentModal } from '@/components/RegisterCardPaymentModal'
import { DeleteTransactionButton } from '@/components/DeleteTransactionButton'
import { ConfirmTransactionButton } from '@/components/ConfirmTransactionButton'
import { EditTransactionModal } from '@/components/EditTransactionModal'
import { PaginationControl } from '@/components/PaginationControl'
import type { Account, Category, Institution, MasterTransaction, Person, UserSettings } from '@/lib/types'

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: 'Cuenta corriente',
  savings: 'Caja de ahorro',
  credit_card: 'Tarjeta de crédito',
  cash: 'Efectivo',
  investing: 'Inversión'
}

export type TransactionWithRelations = MasterTransaction & {
  categories?: { name: string } | null
  people?: { name: string } | null
}

export interface AccountDetailClientProps {
  account: Account & { institutions: Institution | { name: string; is_active?: boolean } }
  allAccounts: (Account & { institutions?: { name: string } | null })[]
  initialTransactions: TransactionWithRelations[]
  initialUserSettings?: UserSettings | null
  initialCustomRates?: Record<string, number>
  initialPeriod: string
  todayStr: string
}

export function AccountDetailClient({
  account,
  allAccounts,
  initialTransactions,
  initialUserSettings,
  initialCustomRates = {},
  initialPeriod,
  todayStr
}: AccountDetailClientProps) {
  const ledger = useOptionalLedger()
  const currentPeriod = todayStr.slice(0, 7)
  const isCreditCard = account.type === 'credit_card'

  const [selectedPeriod, setSelectedPeriod] = useState<string>(initialPeriod)
  const [filterMode, setFilterMode] = useState<'period' | 'all'>('period')
  const [editingTx, setEditingTx] = useState<TransactionWithRelations | null>(null)
  const [localEdits, setLocalEdits] = useState<Record<string, Partial<TransactionWithRelations>>>({})

  const categoriesById = useMemo(() => {
    const map = new Map<string, Category>()
    for (const c of ledger?.categories ?? []) map.set(c.id, c)
    return map
  }, [ledger?.categories])

  const peopleById = useMemo(() => {
    const map = new Map<string, Person>()
    for (const p of ledger?.people ?? []) map.set(p.id, p)
    return map
  }, [ledger?.people])

  // Hidratación reactiva con transacciones locales de LedgerContext
  const transactions = useMemo<TransactionWithRelations[]>(() => {
    let merged: TransactionWithRelations[] = initialTransactions
    if (ledger && ledger.recentTransactions.length > 0) {
      const localForAccount = ledger.recentTransactions.filter(
        (t) => t.account_id === account.id
      ) as TransactionWithRelations[]
      if (initialTransactions.length === 0) {
        merged = localForAccount
      } else {
        const byId = new Map<string, TransactionWithRelations>()
        for (const tx of initialTransactions) {
          byId.set(tx.id, tx)
        }
        for (const local of localForAccount) {
          byId.set(local.id, {
            ...byId.get(local.id),
            ...local
          })
        }
        merged = Array.from(byId.values()).sort((a, b) => b.date.localeCompare(a.date))
      }
    }
    return merged.map((tx) => (localEdits[tx.id] ? { ...tx, ...localEdits[tx.id] } : tx))
  }, [account.id, initialTransactions, ledger, localEdits])

  const userSettings = ledger?.settings || initialUserSettings
  const userDisplayCurrency = userSettings?.display_currency || account.currency_native

  // Conversión monetaria síncrona cliente
  const convertCurrency = useCallback(
    (amount: number, from: string, to: string): number => {
      if (!amount || from.toUpperCase() === to.toUpperCase()) return amount
      const fromUpper = from.toUpperCase()
      const toUpper = to.toUpperCase()
      const pairKey = `${fromUpper}_${toUpper}`

      const customPair = initialCustomRates[pairKey]
      if (customPair && customPair > 0) {
        return Math.round(amount * customPair * 100) / 100
      }

      const cached = getCachedRate(fromUpper, toUpper)
      if (cached && cached.rate > 0) {
        return Math.round(amount * cached.rate * 100) / 100
      }

      return amount
    },
    [initialCustomRates]
  )

  // 1. Saldo actual nominal acumulado de la cuenta (para tarjeta: saldo hasta la fecha actual)
  const { currentBalance, allTimePendingAmount } = useMemo(() => {
    let bal = 0
    let pending = 0
    for (const t of transactions) {
      const effectivePeriod = (t.accounting_period || t.date.slice(0, 7)).slice(0, 7)
      const isFutureStatement = isCreditCard && effectivePeriod > currentPeriod

      if (!isFutureStatement && t.status === 'COMPLETED' && t.date <= todayStr) {
        let delta = Number(t.amount_account)
        if (t.type === 'OUTCOME') delta = -Math.abs(delta)
        else if (t.type === 'INCOME') delta = Math.abs(delta)
        bal += delta
      } else if (t.status === 'PENDING' || isFutureStatement) {
        let delta = Number(t.amount_account)
        if (t.type === 'OUTCOME') delta = Math.abs(delta)
        else if (t.type === 'INCOME') delta = -Math.abs(delta)
        else delta = delta < 0 ? Math.abs(delta) : 0
        pending += delta
      }
    }
    return {
      currentBalance: Math.round(bal * 100) / 100,
      allTimePendingAmount: Math.round(pending * 100) / 100
    }
  }, [currentPeriod, isCreditCard, todayStr, transactions])

  // 2. Cálculos específicos del período contable seleccionado (`selectedPeriod`)
  const periodData = useMemo(() => {
    const cardSpendByCurrency: Record<string, number> = {
      [account.currency_native]: 0,
      ...(account.currency_native !== 'USD' ? { USD: 0 } : {})
    }
    const cardFutureByCurrency: Record<string, number> = {}

    let periodIncome = 0
    let periodExpense = 0
    let periodPending = 0
    let verifiedCount = 0
    let totalPeriodItems = 0

    const periodTxList: TransactionWithRelations[] = []

    for (const t of transactions) {
      const effectivePeriod = (t.accounting_period || t.date.slice(0, 7)).slice(0, 7)
      const origCurr = t.currency_original || account.currency_native
      const origAbs = Math.abs(Number(t.amount_original ?? t.amount_account) || 0)

      // Movimientos correspondientes a este período contable
      if (effectivePeriod === selectedPeriod) {
        periodTxList.push(t)
        totalPeriodItems += 1
        if (t.is_verified) verifiedCount += 1

        if (t.type === 'OUTCOME') {
          periodExpense += Math.abs(Number(t.amount_account) || 0)
          if (isCreditCard) {
            cardSpendByCurrency[origCurr] =
              (cardSpendByCurrency[origCurr] || 0) + origAbs
          }
        } else if (t.type === 'INCOME') {
          periodIncome += Math.abs(Number(t.amount_account) || 0)
        } else if (t.type === 'ADJUSTMENT' || t.type === 'TRANSFER') {
          const delta = Number(t.amount_account)
          if (delta >= 0) periodIncome += delta
          else periodExpense += Math.abs(delta)
        }

        if (t.status === 'PENDING') {
          periodPending += Math.abs(Number(t.amount_account) || 0)
        }
      }

      // Cuotas futuras posteriores al período seleccionado
      if (isCreditCard && effectivePeriod > selectedPeriod) {
        if (t.type === 'OUTCOME') {
          cardFutureByCurrency[origCurr] =
            (cardFutureByCurrency[origCurr] || 0) + origAbs
        }
      }
    }

    const cardCurrencyEntries = Object.entries(cardSpendByCurrency).map(
      ([curr, bal]) => [curr, Math.round(bal * 100) / 100] as const
    )

    const cardFutureEntries = Object.entries(cardFutureByCurrency)
      .map(([curr, amt]) => [curr, Math.round(amt * 100) / 100] as const)
      .filter(([, amt]) => amt > 0)

    // Consolidación en la moneda global de la cuenta / usuario
    let consolidatedDisplay = 0
    if (isCreditCard) {
      for (const [curr, amt] of cardCurrencyEntries) {
        consolidatedDisplay += convertCurrency(amt, curr, userDisplayCurrency)
      }
    } else {
      consolidatedDisplay = convertCurrency(currentBalance, account.currency_native, userDisplayCurrency)
    }

    return {
      periodIncome: Math.round(periodIncome * 100) / 100,
      periodExpense: Math.round(periodExpense * 100) / 100,
      periodNet: Math.round((periodIncome - periodExpense) * 100) / 100,
      periodPending: Math.round(periodPending * 100) / 100,
      verifiedCount,
      totalPeriodItems,
      cardCurrencyEntries,
      cardFutureEntries,
      consolidatedDisplay: Math.round(consolidatedDisplay * 100) / 100,
      periodTxList
    }
  }, [account.currency_native, convertCurrency, currentBalance, isCreditCard, selectedPeriod, transactions, userDisplayCurrency])

  // Lista de movimientos visible según el modo de filtro
  const visibleTransactions = useMemo(() => {
    if (filterMode === 'period') {
      return periodData.periodTxList
    }
    return transactions
  }, [filterMode, periodData.periodTxList, transactions])

  const PAGE_SIZE = 20
  const [currentPage, setCurrentPage] = useState<number>(1)

  // Resetear página al cambiar filtro o período
  useEffect(() => {
    setCurrentPage(1)
  }, [filterMode, selectedPeriod])

  const totalVisible = visibleTransactions.length
  const totalPages = Math.max(1, Math.ceil(totalVisible / PAGE_SIZE))

  // Ajuste defensivo si se redujo el tamaño de la lista
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return visibleTransactions.slice(start, start + PAGE_SIZE)
  }, [currentPage, visibleTransactions])

  // Límite y disponible en tarjetas de crédito
  const creditLimit = account.credit_limit ?? 0
  const usedCredit = currentBalance < 0 ? Math.abs(currentBalance) : 0
  const totalCommitted = usedCredit + allTimePendingAmount
  const availableCredit = isCreditCard ? Math.max(0, creditLimit - totalCommitted) : 0
  const creditPct =
    isCreditCard && creditLimit > 0
      ? Math.min(100, Math.round((totalCommitted / creditLimit) * 100))
      : 0

  return (
    <div className="space-y-6">
      {/* Navegación superior */}
      <div className="flex items-center justify-between">
        <Link
          href={`/accounts`}
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

      {/* ── BARRA DE CONTROL: Período Contable ── */}
      <div className="bg-surface-1 border border-border rounded-card p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-text-muted flex items-center gap-1.5">
            <Calendar size={14} className="text-accent" />
            <span>Período contable:</span>
          </span>
          <div className="inline-flex items-center bg-surface-2 border border-border rounded-control p-0.5">
            <button
              type="button"
              onClick={() => setSelectedPeriod((p) => calculateAccountingPeriod(p, -1))}
              aria-label="Período anterior"
              className="p-1.5 text-text-secondary hover:text-text-primary rounded-control hover:bg-surface-1 transition"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-3 text-xs font-display font-semibold text-text-primary min-w-[125px] text-center">
              {formatAccountingPeriodLabel(selectedPeriod)}
            </span>
            <button
              type="button"
              onClick={() => setSelectedPeriod((p) => calculateAccountingPeriod(p, 1))}
              aria-label="Período siguiente"
              className="p-1.5 text-text-secondary hover:text-text-primary rounded-control hover:bg-surface-1 transition"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {selectedPeriod !== currentPeriod && (
            <button
              type="button"
              onClick={() => setSelectedPeriod(currentPeriod)}
              className="text-[11px] font-medium text-accent hover:underline px-2 py-1"
            >
              Volver a {formatAccountingPeriodLabel(currentPeriod)}
            </button>
          )}
        </div>

        {/* Estado contextual del período en tarjetas */}
        {isCreditCard && (
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="font-mono text-text-secondary">
              {periodData.verifiedCount}/{periodData.totalPeriodItems} verificados
            </span>
            {periodData.totalPeriodItems > 0 && periodData.verifiedCount === periodData.totalPeriodItems && (
              <span className="inline-flex items-center gap-1 text-[11px] text-income font-medium bg-income/10 px-2 py-0.5 rounded-full border border-income/20">
                <CheckCircle2 size={11} />
                <span>Conciliado</span>
              </span>
            )}
          </div>
        )}
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
              {'is_active' in account && !account.is_active && (
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-surface-2 text-text-muted">
                  Desactivada
                </span>
              )}
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-text-primary mt-1">
              {account.name}
            </h1>
          </div>

          {/* Botonera de acciones rápida según el tipo de producto */}
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {isCreditCard ? (
              <>
                <Link
                  href={`/accounts/${account.id}/verify?period=${selectedPeriod}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-semibold bg-surface-2 hover:bg-surface-0 text-text-primary border border-border transition shadow-xs"
                >
                  <ClipboardCheck size={13} className="text-income" />
                  <span>Verificar resumen</span>
                </Link>
                <Link
                  href={`/accounts/${account.id}/bulk`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-semibold bg-surface-2 hover:bg-surface-0 text-text-primary border border-border transition shadow-xs"
                >
                  <Sparkles size={13} className="text-accent" />
                  <span>Carga rápida</span>
                </Link>
                <RegisterCardPaymentModal
                  cardAccount={account}
                  currentBalance={currentBalance}
                  fundingAccounts={allAccounts}
                  initialPeriod={selectedPeriod}
                />
              </>
            ) : (
              <>
                <Link
                  href={`/accounts/${account.id}/bulk`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-semibold bg-surface-2 hover:bg-surface-0 text-text-primary border border-border transition shadow-xs"
                >
                  <Sparkles size={13} className="text-accent" />
                  <span>Carga rápida</span>
                </Link>
                <ExpressAdjustModal account={account} currentBalance={currentBalance} />
              </>
            )}
          </div>
        </div>

        {/* Saldo Nominal / Consumos del Período en Pills Multi-moneda */}
        <div className="pt-3 border-t border-border flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs text-text-muted uppercase tracking-wider font-medium">
              {isCreditCard
                ? `Consumos del resumen (${formatAccountingPeriodLabel(selectedPeriod)})`
                : selectedPeriod === currentPeriod
                ? 'Saldo actual'
                : `Saldo actual (Período: ${formatAccountingPeriodLabel(selectedPeriod)})`}
            </p>

            {isCreditCard ? (
              <div className="space-y-2">
                {/* Pills bimonetarias con los consumos del período seleccionado */}
                <div className="flex flex-wrap items-center gap-2">
                  {periodData.cardCurrencyEntries.map(([curr, amt]) => {
                    const hasSpend = amt > 0
                    return (
                      <div
                        key={curr}
                        className={`inline-flex items-baseline gap-2 px-3.5 py-2 rounded-control border ${
                          hasSpend
                            ? 'bg-expense/10 border-expense/30 text-expense'
                            : 'bg-surface-2 border-border text-text-primary'
                        }`}
                      >
                        <span className="text-[11px] uppercase font-semibold tracking-wider opacity-80">
                          {curr}
                        </span>
                        <span className="font-mono tabular-nums amount text-xl md:text-2xl font-bold">
                          {formatMoney(amt, curr)}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Consolidado en moneda de preferencia + compromisos futuros */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                  <span>
                    Consolidado ({userDisplayCurrency}):{' '}
                    <span className="font-mono tabular-nums amount font-medium text-text-secondary">
                      {formatMoney(periodData.consolidatedDisplay, userDisplayCurrency)}
                    </span>
                  </span>
                  {periodData.cardFutureEntries.length > 0 && (
                    <>
                      <span>·</span>
                      <span>
                        Cuotas posteriores:{' '}
                        <span className="font-mono tabular-nums amount text-pending font-medium">
                          {periodData.cardFutureEntries
                            .map(([curr, amt]) => formatMoney(amt, curr))
                            .join(' + ')}
                        </span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-baseline gap-2 flex-wrap">
                <p
                  className={`font-mono tabular-nums amount text-3xl md:text-4xl font-semibold mt-0.5 ${
                    currentBalance < 0 ? 'text-expense' : 'text-text-primary'
                  }`}
                >
                  {formatMoney(currentBalance, account.currency_native)}
                </p>
              </div>
            )}
          </div>

          {/* Tarjeta de Crédito: métricas de límite */}
          {isCreditCard && creditLimit > 0 && (
            <div className="sm:text-right space-y-1">
              <p className="text-xs text-text-muted">
                Disponible:{' '}
                <span className="font-mono font-medium text-text-primary">
                  {formatMoney(availableCredit, account.currency_native)}
                </span>{' '}
                / Límite:{' '}
                <span className="font-mono">
                  {formatMoney(creditLimit, account.currency_native)}
                </span>
              </p>
              <div className="w-full sm:w-48 h-1.5 bg-surface-2 rounded-full overflow-hidden ml-auto">
                <div
                  className={`h-full transition-all duration-300 ${
                    creditPct > 80 ? 'bg-expense' : 'bg-accent'
                  }`}
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
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-display text-base font-semibold tracking-tight text-text-primary">
                Movimientos
              </h2>
              <p className="text-xs text-text-muted">
                {filterMode === 'period'
                  ? `Registros del período ${formatAccountingPeriodLabel(selectedPeriod)}`
                  : 'Historial completo de la cuenta'}
              </p>
            </div>

            {/* Selector de alcance: Período vs Todos */}
            <div className="inline-flex items-center bg-surface-1 border border-border rounded-control p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setFilterMode('period')}
                className={`px-2.5 py-1 rounded-control font-medium transition ${
                  filterMode === 'period'
                    ? 'bg-surface-2 text-text-primary font-semibold shadow-xs'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <span>Este período ({periodData.periodTxList.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 rounded-control font-medium transition ${
                  filterMode === 'all'
                    ? 'bg-surface-2 text-text-primary font-semibold shadow-xs'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <span>Todos ({transactions.length})</span>
              </button>
            </div>
          </div>

          {visibleTransactions.length === 0 ? (
            <div className="bg-surface-1 border border-border rounded-card p-8 text-center text-sm text-text-muted space-y-2">
              <p>
                {filterMode === 'period'
                  ? `No hay movimientos registrados en ${formatAccountingPeriodLabel(selectedPeriod)}.`
                  : 'Esta cuenta no tiene movimientos registrados todavía.'}
              </p>
              <p className="text-xs text-text-muted">
                {isCreditCard
                  ? 'Podés cargar un consumo de este período o verificar el estado de cuenta.'
                  : 'Podés registrar un movimiento o realizar un ajuste express de saldo.'}
              </p>
              {filterMode === 'period' && transactions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className="inline-flex items-center gap-1 text-xs text-accent hover:underline pt-2"
                >
                  <Filter size={12} />
                  <span>Ver todos los movimientos ({transactions.length})</span>
                </button>
              )}
            </div>
          ) : (
            <div className="bg-surface-1 border border-border rounded-card divide-y divide-border px-4 py-1">
              {paginatedTransactions.map((t) => {
                const isOutcome = t.type === 'OUTCOME'
                const isIncome = t.type === 'INCOME'
                const isAdjustment = t.type === 'ADJUSTMENT'
                const isTransfer = t.type === 'TRANSFER'
                const isPositiveAdj = isAdjustment && t.amount_account >= 0
                const isTransferIn = isTransfer && t.amount_account >= 0
                const isPending = t.status === 'PENDING'
                const resolvedCategoryName = t.category_id
                  ? categoriesById.get(t.category_id)?.name ?? t.categories?.name ?? null
                  : null
                const resolvedPersonName = t.person_id
                  ? peopleById.get(t.person_id)?.name ?? t.people?.name ?? null
                  : null
                const isThirdParty = Boolean(
                  resolvedPersonName && resolvedPersonName.trim().toLowerCase() !== 'personal'
                )
                const needsCategory = (isOutcome || isIncome) && !t.category_id

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
                          {isPending && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-pending/15 text-pending font-medium">
                              Pendiente
                            </span>
                          )}
                          {isCreditCard && t.is_verified && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 rounded bg-income/15 text-income font-medium">
                              <CheckCircle2 size={10} />
                              Confirmado
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-text-muted flex-wrap">
                          <span>{t.date}</span>
                          {t.accounting_period && (
                            <>
                              <span>·</span>
                              <span className="font-mono text-[11px] text-text-secondary">
                                Resumen {formatAccountingPeriodLabel(t.accounting_period)}
                              </span>
                            </>
                          )}
                          {resolvedCategoryName && (
                            <>
                              <span>·</span>
                              <span>{resolvedCategoryName}</span>
                            </>
                          )}
                          {needsCategory && (
                            <button
                              type="button"
                              onClick={() => setEditingTx(t)}
                              className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-pending/15 text-pending border border-pending/30 hover:bg-pending/25 transition"
                              title="Asignar categoría a este movimiento"
                            >
                              <Tag size={10} />
                              <span>+ Sin categoría</span>
                            </button>
                          )}
                          {isThirdParty && resolvedPersonName && (
                            <>
                              <span>·</span>
                              <span className="text-accent font-medium">{resolvedPersonName}</span>
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
                      {isPending && t.date <= todayStr && (
                        <ConfirmTransactionButton transactionId={t.id} />
                      )}
                      <div className="text-right font-mono tabular-nums amount text-sm font-semibold">
                        {isOutcome && (
                          <div>
                            <span className={isPending ? 'text-expense/75' : 'text-expense'}>
                              -{formatMoney(
                                isCreditCard ? t.amount_original : t.amount_account,
                                isCreditCard ? t.currency_original : t.currency_account
                              )}
                            </span>
                            {isCreditCard && t.currency_original !== t.currency_account && (
                              <p className="text-[10px] font-normal text-text-muted">
                                ≈ {formatMoney(t.amount_account, t.currency_account)}
                              </p>
                            )}
                          </div>
                        )}
                        {isIncome && (
                          <span className={isPending ? 'text-income/75' : 'text-income'}>
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
                      <button
                        type="button"
                        onClick={() => setEditingTx(t)}
                        aria-label="Editar movimiento"
                        title="Editar movimiento"
                        className="p-1.5 rounded-control text-text-muted hover:text-accent hover:bg-surface-2 transition"
                      >
                        <Edit2 size={14} />
                      </button>
                      <DeleteTransactionButton transactionId={t.id} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <PaginationControl
            currentPage={currentPage}
            totalItems={totalVisible}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
            itemLabel="movimientos"
          />
        </div>

        {/* Columna Derecha: Panel de Estadísticas y Resumen (1 col) */}
        <div className="space-y-4">
          <div className="bg-surface-1 border border-border rounded-card p-4 space-y-3">
            <h3 className="font-display text-sm font-semibold text-text-primary">
              Resumen de {formatAccountingPeriodLabel(selectedPeriod)}
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-border/60">
                <span className="text-text-muted">Ingresos / Créditos</span>
                <span className="font-mono font-medium text-income">
                  +{formatMoney(periodData.periodIncome, account.currency_native)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/60">
                <span className="text-text-muted">Gastos / Débitos</span>
                <span className="font-mono font-medium text-expense">
                  -{formatMoney(periodData.periodExpense, account.currency_native)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-text-muted">Balance neto del período</span>
                <span
                  className={`font-mono font-semibold ${
                    periodData.periodNet >= 0 ? 'text-income' : 'text-expense'
                  }`}
                >
                  {formatMoney(periodData.periodNet, account.currency_native)}
                </span>
              </div>
              {periodData.periodPending > 0 && (
                <div className="flex justify-between items-center py-1 border-t border-border/60">
                  <span className="text-text-muted">Pendientes del período</span>
                  <span className="font-mono font-medium text-pending">
                    {formatMoney(periodData.periodPending, account.currency_native)}
                  </span>
                </div>
              )}
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
              {isCreditCard && account.closing_day && (
                <div className="flex justify-between">
                  <span className="text-text-muted">Día de cierre</span>
                  <span className="font-mono font-medium">Día {account.closing_day}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {editingTx && (
        <EditTransactionModal
          transaction={editingTx}
          onClose={() => setEditingTx(null)}
          onSaved={(updated) => {
            setLocalEdits((prev) => ({
              ...prev,
              [updated.transactionId]: {
                ...(updated.categoryId !== undefined ? { category_id: updated.categoryId } : {}),
                ...(updated.personId !== undefined ? { person_id: updated.personId } : {}),
                ...(updated.notes !== undefined ? { notes: updated.notes } : {}),
                ...(updated.date !== undefined ? { date: updated.date } : {}),
                ...(updated.amountOriginal !== undefined ? { amount_original: updated.amountOriginal } : {}),
                ...(updated.amountAccount !== undefined ? { amount_account: updated.amountAccount } : {})
              }
            }))
          }}
        />
      )}
    </div>
  )
}

