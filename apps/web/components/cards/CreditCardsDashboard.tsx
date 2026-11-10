'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CreditCard,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Sparkles,
  Users,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  Building2,
  Layers,
  PieChart,
  ArrowUpRight,
  Plus,
  CheckCircle2
} from 'lucide-react'
import { formatMoney } from '@/lib/currency'
import { calculateAccountingPeriod, formatAccountingPeriodLabel } from '@/lib/ledger/builder'
import { useOptionalLedger } from '@/lib/ledger/ledger-context'
import { getCachedRate } from '@/lib/storage/fx-cache'
import { RegisterCardPaymentModal } from '@/components/RegisterCardPaymentModal'
import { CardBrandSeal, CardChipSvg } from './CardBrandSeal'
import {
  detectCardBrand,
  computeCardPeriodSummary,
  computeInstallmentsRunoff,
  extractActiveInstallmentPlans,
  computeCardBreakdowns,
  type CardAccountWithInstitution,
  type CardPeriodSummary
} from '@/lib/credit-cards/analytics'
import type { Account, Category, MasterTransaction, Person, UserSettings } from '@/lib/types'

interface CreditCardsDashboardProps {
  initialAccounts: CardAccountWithInstitution[]
  initialTransactions: MasterTransaction[]
  initialCategories: Category[]
  initialPeople: Person[]
  initialDisplayCurrency: string
  initialCustomRates?: Record<string, number>
  initialPeriod: string
  todayStr: string
}

export function CreditCardsDashboard({
  initialAccounts,
  initialTransactions,
  initialCategories,
  initialPeople,
  initialDisplayCurrency,
  initialCustomRates = {},
  initialPeriod,
  todayStr
}: CreditCardsDashboardProps) {
  const ledger = useOptionalLedger()

  // Hidratación reactiva con fallback offline desde LedgerContext
  const allAccounts = useMemo<CardAccountWithInstitution[]>(() => {
    if (initialAccounts.length > 0) {
      if (!ledger || ledger.accounts.length === 0) return initialAccounts
      // Combinar metadatos de instituciones con cuentas reactivas si aplica
      const instMap = new Map(initialAccounts.map((a) => [a.id, a.institutions]))
      return ledger.accounts.map((a) => ({
        ...a,
        institutions: (a as CardAccountWithInstitution).institutions ?? instMap.get(a.id) ?? null
      }))
    }
    return (ledger?.accounts as CardAccountWithInstitution[]) ?? []
  }, [initialAccounts, ledger])

  const transactions = useMemo<MasterTransaction[]>(() => {
    if (ledger && ledger.recentTransactions.length > 0) {
      if (initialTransactions.length === 0) return ledger.recentTransactions
      const seen = new Set(ledger.recentTransactions.map((t) => t.id))
      return [
        ...ledger.recentTransactions,
        ...initialTransactions.filter((t) => !seen.has(t.id))
      ]
    }
    return initialTransactions
  }, [initialTransactions, ledger])

  const categories = useMemo<Category[]>(
    () => (initialCategories.length > 0 ? initialCategories : ledger?.categories ?? []),
    [initialCategories, ledger]
  )

  const people = useMemo<Person[]>(
    () => (initialPeople.length > 0 ? initialPeople : ledger?.people ?? []),
    [initialPeople, ledger]
  )

  const displayCurrency = ledger?.settings?.display_currency || initialDisplayCurrency || 'EUR'

  const [selectedPeriod, setSelectedPeriod] = useState(initialPeriod)
  const [selectedCardFilter, setSelectedCardFilter] = useState<string>('ALL')
  const [runoffHorizon, setRunoffHorizon] = useState<6 | 12>(6)

  // Filtrar tarjetas de crédito activas e inactivas
  const creditCards = useMemo(
    () => allAccounts.filter((a) => a.type === 'credit_card'),
    [allAccounts]
  )
  const activeCards = useMemo(
    () => creditCards.filter((c) => c.is_active),
    [creditCards]
  )
  const inactiveCards = useMemo(
    () => creditCards.filter((c) => !c.is_active),
    [creditCards]
  )

  const categoriesById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  )
  const peopleById = useMemo(
    () => new Map(people.map((p) => [p.id, p])),
    [people]
  )

  // Conversor multi-moneda síncrono usando tasas manuales de settings + caché FX local
  const convertCurrency = useMemo(() => {
    const customMap: Record<string, number> = { ...initialCustomRates }
    const activeCurrs: UserSettings['active_currencies'] = ledger?.settings?.active_currencies
    if (activeCurrs && Array.isArray(activeCurrs)) {
      for (const c of activeCurrs) {
        if (
          c.rate_mode === 'manual' &&
          typeof c.custom_rate_against_global === 'number' &&
          c.custom_rate_against_global > 0
        ) {
          const g = displayCurrency.toUpperCase()
          const target = c.code.toUpperCase()
          customMap[`${g}_${target}`] = c.custom_rate_against_global
          customMap[`${target}_${g}`] = 1 / c.custom_rate_against_global
        }
      }
    }

    return (amount: number, fromCurr: string, toCurr: string): number => {
      if (!amount) return 0
      const from = (fromCurr || toCurr).toUpperCase()
      const to = toCurr.toUpperCase()
      if (from === to) return amount

      const directKey = `${from}_${to}`
      if (customMap[directKey] && customMap[directKey] > 0) {
        return amount * customMap[directKey]
      }

      const cached = getCachedRate(from, to)
      if (cached && cached.rate > 0) {
        return amount * cached.rate
      }

      const invCached = getCachedRate(to, from)
      if (invCached && invCached.rate > 0) {
        return amount / invCached.rate
      }

      return amount
    }
  }, [initialCustomRates, ledger?.settings?.active_currencies, displayCurrency])

  // Resumen individual por cada tarjeta activa
  const cardSummaries = useMemo<CardPeriodSummary[]>(() => {
    return activeCards.map((card) =>
      computeCardPeriodSummary({
        account: card,
        transactions,
        period: selectedPeriod,
        todayStr,
        displayCurrency,
        peopleById,
        convert: convertCurrency
      })
    )
  }, [activeCards, transactions, selectedPeriod, todayStr, displayCurrency, peopleById, convertCurrency])

  // KPIs Globales Consolidados (Bloque A)
  const globalKpis = useMemo(() => {
    let totalPeriodSpendDisplay = 0
    let totalPersonalDisplay = 0
    let totalThirdPartyDisplay = 0
    let totalFutureDisplay = 0
    let totalLimitDisplay = 0
    let totalCommittedDisplay = 0
    let totalPeriodItems = 0
    let totalVerifiedItems = 0
    let totalActivePlans = 0

    const spendByCurrency: Record<string, number> = {}
    const futureByCurrency: Record<string, number> = {}

    for (const s of cardSummaries) {
      totalPeriodSpendDisplay += s.periodSpendInDisplay
      totalPersonalDisplay += s.periodPersonalInDisplay
      totalThirdPartyDisplay += s.periodThirdPartyInDisplay
      totalFutureDisplay += s.futureCommittedInDisplay
      totalPeriodItems += s.totalPeriodItems
      totalVerifiedItems += s.verifiedPeriodItems
      totalActivePlans += s.activeInstallmentPlansCount

      if (s.creditLimit > 0) {
        totalLimitDisplay += convertCurrency(
          s.creditLimit,
          s.account.currency_native,
          displayCurrency
        )
        totalCommittedDisplay += convertCurrency(
          s.totalCommittedInNative,
          s.account.currency_native,
          displayCurrency
        )
      }

      for (const [curr, val] of Object.entries(s.periodSpendByCurrency)) {
        spendByCurrency[curr] = Math.round(((spendByCurrency[curr] || 0) + val) * 100) / 100
      }
      for (const [curr, val] of Object.entries(s.futureCommittedByCurrency)) {
        futureByCurrency[curr] = Math.round(((futureByCurrency[curr] || 0) + val) * 100) / 100
      }
    }

    const globalUtilizationPct =
      totalLimitDisplay > 0
        ? Math.min(100, Math.round((totalCommittedDisplay / totalLimitDisplay) * 100))
        : 0

    const globalVerificationPct =
      totalPeriodItems > 0 ? Math.round((totalVerifiedItems / totalPeriodItems) * 100) : 100

    return {
      totalPeriodSpendDisplay: Math.round(totalPeriodSpendDisplay * 100) / 100,
      totalPersonalDisplay: Math.round(totalPersonalDisplay * 100) / 100,
      totalThirdPartyDisplay: Math.round(totalThirdPartyDisplay * 100) / 100,
      totalFutureDisplay: Math.round(totalFutureDisplay * 100) / 100,
      totalLimitDisplay: Math.round(totalLimitDisplay * 100) / 100,
      totalCommittedDisplay: Math.round(totalCommittedDisplay * 100) / 100,
      globalUtilizationPct,
      totalPeriodItems,
      totalVerifiedItems,
      globalVerificationPct,
      totalActivePlans,
      spendByCurrencyEntries: Object.entries(spendByCurrency).filter(([, v]) => v > 0),
      futureByCurrencyEntries: Object.entries(futureByCurrency).filter(([, v]) => v > 0)
    }
  }, [cardSummaries, convertCurrency, displayCurrency])

  // Proyección de Liberación de Cuotas (Bloque B)
  const runoffBuckets = useMemo(() => {
    const filteredCards =
      selectedCardFilter === 'ALL'
        ? activeCards
        : activeCards.filter((c) => c.id === selectedCardFilter)

    return computeInstallmentsRunoff({
      cards: filteredCards,
      transactions,
      startPeriod: selectedPeriod,
      monthsCount: runoffHorizon,
      displayCurrency,
      peopleById,
      convert: convertCurrency
    })
  }, [
    activeCards,
    selectedCardFilter,
    transactions,
    selectedPeriod,
    runoffHorizon,
    displayCurrency,
    peopleById,
    convertCurrency
  ])

  const maxRunoffValue = useMemo(
    () => Math.max(1, ...runoffBuckets.map((b) => b.totalInDisplay)),
    [runoffBuckets]
  )

  const dropOffInsights = useMemo(
    () => runoffBuckets.filter((b) => b.endingPlansCount > 0),
    [runoffBuckets]
  )

  // Planes de cuotas activos y desglose por categoría / persona (Bloque D)
  const activePlans = useMemo(() => {
    const filteredCards =
      selectedCardFilter === 'ALL'
        ? activeCards
        : activeCards.filter((c) => c.id === selectedCardFilter)

    return extractActiveInstallmentPlans({
      cards: filteredCards,
      transactions,
      selectedPeriod,
      displayCurrency,
      categoriesById,
      peopleById,
      convert: convertCurrency
    })
  }, [
    activeCards,
    selectedCardFilter,
    transactions,
    selectedPeriod,
    displayCurrency,
    categoriesById,
    peopleById,
    convertCurrency
  ])

  const breakdowns = useMemo(() => {
    return computeCardBreakdowns({
      cards: activeCards,
      transactions,
      selectedPeriod,
      selectedCardId: selectedCardFilter,
      displayCurrency,
      categoriesById,
      peopleById,
      convert: convertCurrency
    })
  }, [
    activeCards,
    transactions,
    selectedPeriod,
    selectedCardFilter,
    displayCurrency,
    categoriesById,
    peopleById,
    convertCurrency
  ])

  const currentPeriod = todayStr.slice(0, 7)

  if (creditCards.length === 0) {
    return (
      <div className="bg-surface-1 border border-border rounded-card p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-accent/15 text-accent flex items-center justify-center mx-auto">
          <CreditCard size={24} />
        </div>
        <div className="space-y-1 max-w-md mx-auto">
          <h2 className="font-display text-lg font-semibold text-text-primary">
            Todavía no tenés tarjetas de crédito configuradas
          </h2>
          <p className="text-xs text-text-muted">
            Agregá una tarjeta de crédito en cualquiera de tus instituciones para analizar resúmenes, cuotas diferidas y gastos compartidos.
          </p>
        </div>
        <Link
          href="/accounts/new"
          className="inline-flex items-center gap-1.5 bg-accent text-[color:var(--on-accent)] text-xs font-medium px-4 py-2 rounded-control hover:opacity-90 transition"
        >
          <Plus size={15} />
          <span>Crear tarjeta de crédito</span>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Barra de Control Superior: Selector de Período Contable y Filtro de Tarjeta */}
      <div className="bg-surface-1 border border-border rounded-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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

        {/* Selector rápido de tarjeta para filtrar el análisis */}
        <div className="flex items-center gap-2">
          <label htmlFor="card-filter-select" className="text-xs text-text-muted shrink-0">
            Analizar:
          </label>
          <select
            id="card-filter-select"
            value={selectedCardFilter}
            onChange={(e) => setSelectedCardFilter(e.target.value)}
            className="text-xs py-1.5 px-2.5 rounded-control bg-surface-2 border border-border text-text-primary"
          >
            <option value="ALL">Todas las tarjetas de crédito ({activeCards.length})</option>
            {activeCards.map((c) => (
              <option key={c.id} value={c.id}>
                {c.institutions?.name ? `${c.institutions.name} · ` : ''}
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── BLOQUE A: KPIs Globales Consolidados ── */}
      <section aria-label="Resumen consolidado de tarjetas de crédito" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total del Resumen del Período */}
        <div className="bg-surface-1 border border-border rounded-card p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted font-medium">
              Consumos del resumen ({formatAccountingPeriodLabel(selectedPeriod)})
            </span>
            <CreditCard size={15} className="text-expense shrink-0" />
          </div>

          {globalKpis.spendByCurrencyEntries.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {globalKpis.spendByCurrencyEntries.map(([curr, amt]) => (
                <span
                  key={curr}
                  className="inline-flex items-baseline gap-1 px-2 py-0.5 rounded-control bg-expense/10 border border-expense/30 text-expense font-mono tabular-nums amount text-sm font-bold"
                >
                  <span className="text-[10px] uppercase opacity-80">{curr}</span>
                  {formatMoney(amt, curr)}
                </span>
              ))}
            </div>
          ) : (
            <p className="font-mono tabular-nums amount text-xl font-bold text-text-primary">
              {formatMoney(0, displayCurrency)}
            </p>
          )}

          <p className="text-[11px] text-text-muted">
            Consolidado ({displayCurrency}):{' '}
            <span className="font-mono tabular-nums amount font-semibold text-text-primary">
              {formatMoney(globalKpis.totalPeriodSpendDisplay, displayCurrency)}
            </span>
          </p>
        </div>

        {/* KPI 2: Separación Propio vs. Terceros (Split Pay / Extensiones) */}
        <div className="bg-surface-1 border border-border rounded-card p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted font-medium">Propio vs. Terceros (mes)</span>
            <Users size={15} className="text-accent shrink-0" />
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Tu consumo (Personal)</span>
              <span className="font-mono tabular-nums amount font-semibold text-text-primary">
                {formatMoney(globalKpis.totalPersonalDisplay, displayCurrency)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">De terceros (a cobrar)</span>
              <span className="font-mono tabular-nums amount font-semibold text-accent">
                {formatMoney(globalKpis.totalThirdPartyDisplay, displayCurrency)}
              </span>
            </div>
          </div>

          <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden flex">
            {globalKpis.totalPeriodSpendDisplay > 0 && (
              <>
                <div
                  className="h-full bg-expense transition-all"
                  style={{
                    width: `${Math.round(
                      (globalKpis.totalPersonalDisplay / globalKpis.totalPeriodSpendDisplay) * 100
                    )}%`
                  }}
                />
                <div
                  className="h-full bg-accent transition-all"
                  style={{
                    width: `${Math.round(
                      (globalKpis.totalThirdPartyDisplay / globalKpis.totalPeriodSpendDisplay) * 100
                    )}%`
                  }}
                />
              </>
            )}
          </div>
        </div>

        {/* KPI 3: Compromisos Diferidos (Cuotas Futuras) */}
        <div className="bg-surface-1 border border-border rounded-card p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted font-medium">Compromisos en cuotas futuras</span>
            <TrendingDown size={15} className="text-pending shrink-0" />
          </div>

          <p className="font-mono tabular-nums amount text-xl font-bold text-pending">
            {formatMoney(globalKpis.totalFutureDisplay, displayCurrency)}
          </p>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-text-muted">
            <span>{activePlans.length} planes activos</span>
            {globalKpis.futureByCurrencyEntries.length > 0 && (
              <>
                <span>·</span>
                <span className="font-mono tabular-nums amount text-text-secondary">
                  {globalKpis.futureByCurrencyEntries
                    .map(([c, a]) => formatMoney(a, c))
                    .join(' + ')}
                </span>
              </>
            )}
          </div>
        </div>

        {/* KPI 4: Salud de Límite y Estado de Conciliación */}
        <div className="bg-surface-1 border border-border rounded-card p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted font-medium">Límite global & Conciliación</span>
            {globalKpis.globalUtilizationPct > 75 ? (
              <AlertTriangle size={15} className="text-expense shrink-0" />
            ) : (
              <ShieldCheck size={15} className="text-income shrink-0" />
            )}
          </div>

          <div className="flex items-baseline justify-between">
            <span className="font-mono tabular-nums text-xl font-bold text-text-primary">
              {globalKpis.globalUtilizationPct}%{' '}
              <span className="text-xs font-normal text-text-muted">usado</span>
            </span>
            <span className="text-xs font-mono text-text-secondary">
              {globalKpis.totalVerifiedItems}/{globalKpis.totalPeriodItems} verif.
            </span>
          </div>

          <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${globalKpis.globalUtilizationPct > 75
                  ? 'bg-expense'
                  : globalKpis.globalUtilizationPct >= 30
                    ? 'bg-pending'
                    : 'bg-income'
                }`}
              style={{ width: `${globalKpis.globalUtilizationPct}%` }}
            />
          </div>
        </div>
      </section>

      {/* ── BLOQUE C: Grilla Comparativa de Plásticos (Cards Matrix) ── */}
      <section aria-label="Tus tarjetas de crédito" className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-semibold tracking-tight text-text-primary">
              Tus Tarjetas de crédito ({activeCards.length})
            </h2>
            <p className="text-xs text-text-muted">
              Estado individual en {formatAccountingPeriodLabel(selectedPeriod)}, límite disponible y acciones rápidas
            </p>
          </div>
          <Link
            href="/accounts/new"
            className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
          >
            <Plus size={14} />
            <span>Nueva tarjeta de crédito</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cardSummaries.map((summary) => {
            const { account, brand, closingInfo } = summary
            const spendEntries = Object.entries(summary.periodSpendByCurrency).filter(
              ([, v]) => v > 0
            )
            const futureEntries = Object.entries(summary.futureCommittedByCurrency).filter(
              ([, v]) => v > 0
            )
            const isSelectedFilter =
              selectedCardFilter !== 'ALL' && selectedCardFilter === account.id

            return (
              <div
                key={account.id}
                className={`bg-surface-1 border rounded-card overflow-hidden flex flex-col justify-between transition ${isSelectedFilter ? 'border-accent ring-1 ring-accent/30' : 'border-border'
                  }`}
              >
                {/* Parte superior: Simulación estética de plástico de tarjeta de crédito */}
                <div className="p-5 bg-surface-2/60 border-b border-border space-y-4 relative">
                  {/* Cabecera del plástico: Institución + Sello de Red (VISA / AMEX / MASTERCARD / MAESTRO) */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs text-text-muted font-medium">
                        <Building2 size={12} />
                        <span>{summary.institutionName}</span>
                        <span>·</span>
                        <span className="font-mono">{account.currency_native}</span>
                      </div>
                      <Link
                        href={`/accounts/${account.id}?period=${selectedPeriod}`}
                        className="font-display text-lg font-bold tracking-tight text-text-primary hover:text-accent transition block"
                      >
                        {account.name}
                      </Link>
                    </div>

                    <CardBrandSeal brand={brand} />
                  </div>

                  {/* Chip EMV + Info de Día de Cierre y Estado de Verificación */}
                  <div className="flex items-center justify-between gap-2">
                    <CardChipSvg />

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {summary.isStatementPaid ? (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium border bg-income/15 border-income/30 text-income">
                          <CheckCircle2 size={11} />
                          <span>Resumen pagado</span>
                        </span>
                      ) : summary.periodPaymentsInDisplay > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium border bg-accent/15 border-accent/30 text-accent font-mono tabular-nums amount">
                          Pago parcial: {formatMoney(summary.periodPaymentsInDisplay, displayCurrency)}
                        </span>
                      ) : null}
                      {closingInfo && (
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${closingInfo.daysUntilClosing <= 3
                              ? 'bg-pending/15 border-pending/30 text-pending'
                              : 'bg-surface-1 border-border text-text-secondary'
                            }`}
                        >
                          {closingInfo.label}
                        </span>
                      )}
                      {summary.totalPeriodItems > 0 && (
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium border ${summary.verifiedPeriodItems === summary.totalPeriodItems
                              ? 'bg-income/15 border-income/30 text-income'
                              : 'bg-surface-1 border-border text-text-secondary'
                            }`}
                        >
                          <CheckCircle2 size={11} />
                          <span>
                            {summary.verifiedPeriodItems}/{summary.totalPeriodItems} verif.
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Importes Bimonetarios del Resumen Seleccionado */}
                  <div className="pt-1 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-[11px] uppercase tracking-wider text-text-muted font-medium">
                        Consumos {formatAccountingPeriodLabel(selectedPeriod)}
                      </p>
                      {spendEntries.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {spendEntries.map(([curr, val]) => (
                            <span
                              key={curr}
                              className="inline-flex items-baseline gap-1.5 px-2.5 py-1 rounded-control bg-expense/10 border border-expense/30 text-expense font-mono tabular-nums amount text-base font-bold"
                            >
                              <span className="text-[10px] uppercase opacity-80">{curr}</span>
                              {formatMoney(val, curr)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="font-mono tabular-nums amount text-base font-semibold text-text-secondary">
                          Sin consumos en este período
                        </p>
                      )}
                    </div>

                    {futureEntries.length > 0 && (
                      <div className="sm:text-right">
                        <p className="text-[10px] uppercase tracking-wider text-text-muted">
                          Cuotas futuras
                        </p>
                        <p className="font-mono tabular-nums amount text-xs font-semibold text-pending">
                          {futureEntries.map(([c, a]) => formatMoney(a, c)).join(' + ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cuerpo inferior de la tarjeta: Barra de Límite + Propio/Terceros + Acciones */}
                <div className="p-4 space-y-3 bg-surface-1">
                  {summary.creditLimit > 0 ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-muted">
                          Disponible:{' '}
                          <span className="font-mono tabular-nums amount font-semibold text-text-primary">
                            {formatMoney(summary.availableCredit, account.currency_native)}
                          </span>
                        </span>
                        <span className="text-text-muted font-mono tabular-nums amount">
                          {summary.utilizationPct}% de{' '}
                          {formatMoney(summary.creditLimit, account.currency_native)}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${summary.utilizationLevel === 'high'
                              ? 'bg-expense'
                              : summary.utilizationLevel === 'moderate'
                                ? 'bg-pending'
                                : 'bg-accent'
                            }`}
                          style={{ width: `${summary.utilizationPct}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted">
                      Sin límite de crédito configurado ·{' '}
                      <Link
                        href={`/accounts/${account.id}/edit`}
                        className="text-accent hover:underline"
                      >
                        Configurar límite
                      </Link>
                    </p>
                  )}

                  {/* Desglose rápido Propio vs Terceros en esta tarjeta */}
                  {summary.periodSpendInDisplay > 0 && (
                    <div className="flex items-center justify-between text-[11px] text-text-muted pt-1 border-t border-border/60">
                      <span>
                        Propio:{' '}
                        <span className="font-mono tabular-nums amount text-text-secondary font-medium">
                          {formatMoney(summary.periodPersonalInDisplay, displayCurrency)}
                        </span>
                      </span>
                      {summary.periodThirdPartyInDisplay > 0 && (
                        <span>
                          Terceros:{' '}
                          <span className="font-mono tabular-nums amount text-accent font-medium">
                            {formatMoney(summary.periodThirdPartyInDisplay, displayCurrency)}
                          </span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Botonera de Acciones 1-Click */}
                  <div className="pt-2 border-t border-border flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Link
                        href={`/accounts/${account.id}/verify?period=${selectedPeriod}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-control text-xs font-medium bg-surface-2 hover:bg-surface-0 text-text-primary border border-border transition"
                      >
                        <ClipboardCheck size={13} className="text-income" />
                        <span>Verificar</span>
                      </Link>
                      <Link
                        href={`/accounts/${account.id}/bulk`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-control text-xs font-medium bg-surface-2 hover:bg-surface-0 text-text-primary border border-border transition"
                      >
                        <Sparkles size={13} className="text-accent" />
                        <span>Carga rápida</span>
                      </Link>
                      <Link
                        href={`/accounts/${account.id}?period=${selectedPeriod}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-control text-xs font-medium text-text-secondary hover:text-text-primary transition"
                      >
                        <span>Detalle</span>
                        <ArrowUpRight size={13} />
                      </Link>
                    </div>

                    <RegisterCardPaymentModal
                      cardAccount={account}
                      currentBalance={summary.currentBalance}
                      fundingAccounts={allAccounts}
                      initialPeriod={selectedPeriod}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── BLOQUE B: Proyección de Desendeudamiento (Curva de Liberación de Cuotas) ── */}
      <section
        aria-label="Proyección de liberación de cuotas"
        className="bg-surface-1 border border-border rounded-card p-5 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-semibold tracking-tight text-text-primary flex items-center gap-2">
              <TrendingDown size={17} className="text-accent" />
              <span>Curva de Compromisos y Liberación de Cuotas</span>
            </h2>
            <p className="text-xs text-text-muted">
              Evolución de cargos y cuotas ya asumidas en los próximos {runoffHorizon} meses ({displayCurrency})
            </p>
          </div>

          <div className="inline-flex items-center bg-surface-2 border border-border rounded-control p-0.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setRunoffHorizon(6)}
              className={`px-2.5 py-1 text-xs rounded-control transition ${runoffHorizon === 6
                  ? 'bg-surface-1 text-text-primary font-semibold shadow-2xs'
                  : 'text-text-muted hover:text-text-primary'
                }`}
            >
              6 meses
            </button>
            <button
              type="button"
              onClick={() => setRunoffHorizon(12)}
              className={`px-2.5 py-1 text-xs rounded-control transition ${runoffHorizon === 12
                  ? 'bg-surface-1 text-text-primary font-semibold shadow-2xs'
                  : 'text-text-muted hover:text-text-primary'
                }`}
            >
              12 meses
            </button>
          </div>
        </div>

        {/* Gráfico de barras apiladas (Propio vs Terceros) mes a mes */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-2">
          {runoffBuckets.map((bucket) => {
            const heightPct =
              bucket.totalInDisplay > 0
                ? Math.max(8, Math.round((bucket.totalInDisplay / maxRunoffValue) * 100))
                : 0
            const thirdPartyRatio =
              bucket.totalInDisplay > 0
                ? Math.round((bucket.thirdPartyInDisplay / bucket.totalInDisplay) * 100)
                : 0

            return (
              <div
                key={bucket.period}
                onClick={() => setSelectedPeriod(bucket.period)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setSelectedPeriod(bucket.period)
                }}
                className={`p-3 rounded-control border transition cursor-pointer flex flex-col justify-between ${bucket.period === selectedPeriod
                    ? 'bg-surface-2 border-accent'
                    : 'bg-surface-2/40 border-border hover:border-text-muted'
                  }`}
              >
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="text-xs font-display font-semibold text-text-primary">
                    {bucket.shortLabel}
                  </span>
                  {bucket.endingPlansCount > 0 && (
                    <span
                      title={`Terminan ${bucket.endingPlansCount} plan(es) de cuotas`}
                      className="text-[10px] px-1.5 py-0.2 rounded-full bg-income/15 text-income font-semibold"
                    >
                      -{bucket.endingPlansCount} plan{bucket.endingPlansCount > 1 ? 'es' : ''}
                    </span>
                  )}
                </div>

                {/* Contenedor vertical de barra */}
                <div className="h-20 bg-surface-1 rounded-control p-1.5 flex items-end">
                  {heightPct > 0 ? (
                    <div
                      className="w-full rounded-xs overflow-hidden flex flex-col justify-end transition-all"
                      style={{ height: `${heightPct}%` }}
                    >
                      {thirdPartyRatio > 0 && (
                        <div
                          className="w-full bg-accent"
                          style={{ height: `${thirdPartyRatio}%` }}
                          title={`Terceros: ${formatMoney(bucket.thirdPartyInDisplay, displayCurrency)}`}
                        />
                      )}
                      <div
                        className="w-full bg-pending flex-1"
                        title={`Propio: ${formatMoney(bucket.personalInDisplay, displayCurrency)}`}
                      />
                    </div>
                  ) : (
                    <div className="w-full text-center text-[10px] text-text-muted pb-1">Libre</div>
                  )}
                </div>

                <div className="mt-2 space-y-0.5">
                  <p className="font-mono tabular-nums amount text-xs font-bold text-text-primary">
                    {formatMoney(bucket.totalInDisplay, displayCurrency)}
                  </p>
                  {bucket.freedMonthlyInDisplay > 0 && (
                    <p className="text-[10px] text-income font-mono tabular-nums amount">
                      Liberás {formatMoney(bucket.freedMonthlyInDisplay, displayCurrency)}/mes
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Insights automáticos de liberación de cuotas (Drop-off Insights) */}
        {dropOffInsights.length > 0 && (
          <div className="bg-surface-2 border border-border rounded-control p-3 space-y-1.5">
            <p className="text-xs font-semibold text-text-primary">
              Hitos de alivio financiero próximos:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {dropOffInsights.slice(0, 4).map((insight) => (
                <div
                  key={insight.period}
                  className="text-xs text-text-secondary flex items-center justify-between bg-surface-1 px-3 py-2 rounded-control border border-border/60"
                >
                  <span>
                    En <strong className="text-text-primary">{insight.label}</strong> terminan{' '}
                    <strong className="text-text-primary">
                      {insight.endingPlansCount}{' '}
                      {insight.endingPlansCount === 1 ? 'compra en cuotas' : 'compras en cuotas'}
                    </strong>
                  </span>
                  <span className="font-mono tabular-nums amount font-semibold text-income ml-2 shrink-0">
                    +{formatMoney(insight.freedMonthlyInDisplay, displayCurrency)}/mes libre
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── BLOQUE D: Radiografía Analítica (Planes de Cuotas, Categorías y Personas) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Tabla Maestra de Planes de Cuotas Activos (2 columnas en desktop) */}
        <section
          aria-label="Planes de cuotas activos"
          className="lg:col-span-2 bg-surface-1 border border-border rounded-card p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-semibold tracking-tight text-text-primary flex items-center gap-2">
                <Layers size={16} className="text-pending" />
                <span>Planes de Cuotas Activos ({activePlans.length})</span>
              </h2>
              <p className="text-xs text-text-muted">
                Compras financiadas vigentes desde {formatAccountingPeriodLabel(selectedPeriod)} en adelante
              </p>
            </div>
          </div>

          {activePlans.length === 0 ? (
            <div className="p-6 text-center text-xs text-text-muted bg-surface-2/40 rounded-control border border-border">
              No tenés compras en cuotas activas para el filtro y período seleccionados.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {activePlans.map((plan) => {
                const progressPct = Math.min(
                  100,
                  Math.round((plan.currentInstallment / plan.totalInstallments) * 100)
                )
                return (
                  <div
                    key={plan.planId}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-text-primary">
                          {plan.description}
                        </span>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-pending/15 text-pending">
                          Cuota {plan.currentInstallment} de {plan.totalInstallments}
                        </span>
                        {plan.isThirdParty && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent/15 text-accent">
                            {plan.personName}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-text-muted flex-wrap">
                        <span>
                          {plan.institutionName} · {plan.cardName}
                        </span>
                        {plan.categoryName && (
                          <>
                            <span>·</span>
                            <span>{plan.categoryName}</span>
                          </>
                        )}
                        <span>·</span>
                        <span>Finaliza en {plan.endPeriodLabel}</span>
                      </div>

                      <div className="w-full sm:w-56 h-1.5 bg-surface-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-pending transition-all"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="sm:text-right shrink-0 space-y-0.5">
                      <p className="font-mono tabular-nums amount text-sm font-bold text-text-primary">
                        {formatMoney(plan.installmentAmount, plan.currency)}{' '}
                        <span className="text-[10px] font-normal text-text-muted">/mes</span>
                      </p>
                      <p className="text-xs text-text-muted">
                        Restante ({plan.remainingInstallments} c.):{' '}
                        <span className="font-mono tabular-nums amount font-medium text-pending">
                          {formatMoney(plan.remainingAmount, plan.currency)}
                        </span>
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Columna Derecha: Desglose por Categorías y Personas (Extensiones) */}
        <div className="space-y-6">
          {/* Desglose por Persona */}
          <section
            aria-label="Consumos de tarjeta por persona"
            className="bg-surface-1 border border-border rounded-card p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold text-text-primary flex items-center gap-1.5">
                <Users size={15} className="text-accent" />
                <span>Por Persona / Extensión</span>
              </h3>
              <Link href="/people" className="text-[11px] text-accent hover:underline">
                Ir a Personas
              </Link>
            </div>

            {breakdowns.people.length === 0 ? (
              <p className="text-xs text-text-muted py-2">
                Sin consumos registrados en este período.
              </p>
            ) : (
              <div className="space-y-2.5 text-xs">
                {breakdowns.people.map((p) => (
                  <div
                    key={p.personId}
                    className="p-2.5 rounded-control bg-surface-2/60 border border-border space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      {p.isPersonal ? (
                        <span className="font-medium text-text-primary">{p.personName} (Vos)</span>
                      ) : (
                        <Link
                          href={`/people/${p.personId}`}
                          className="font-semibold text-accent hover:underline"
                        >
                          {p.personName} →
                        </Link>
                      )}
                      <span className="font-mono tabular-nums amount font-bold text-text-primary">
                        {formatMoney(p.periodInDisplay, displayCurrency)}
                      </span>
                    </div>
                    {p.futureInDisplay > 0 && (
                      <div className="flex items-center justify-between text-[11px] text-text-muted">
                        <span>Cuotas futuras:</span>
                        <span className="font-mono tabular-nums amount text-pending">
                          {formatMoney(p.futureInDisplay, displayCurrency)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Top Categorías en Tarjeta */}
          <section
            aria-label="Consumos de tarjeta por categoría"
            className="bg-surface-1 border border-border rounded-card p-4 space-y-3"
          >
            <h3 className="font-display text-sm font-semibold text-text-primary flex items-center gap-1.5">
              <PieChart size={15} className="text-expense" />
              <span>Rubros en Tarjetas de crédito ({formatAccountingPeriodLabel(selectedPeriod)})</span>
            </h3>

            {breakdowns.categories.length === 0 ? (
              <p className="text-xs text-text-muted py-2">
                Sin consumos por categoría en este mes contable.
              </p>
            ) : (
              <div className="space-y-2.5 text-xs">
                {breakdowns.categories.map((cat) => (
                  <div key={cat.categoryId} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-text-secondary font-medium">
                        {cat.categoryName}{' '}
                        <span className="text-text-muted font-mono">({cat.percentage}%)</span>
                      </span>
                      <span className="font-mono tabular-nums amount font-semibold text-text-primary">
                        {formatMoney(cat.amountInDisplay, displayCurrency)}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-expense transition-all"
                        style={{ width: `${Math.max(4, cat.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Tarjetas desactivadas (si existen) */}
      {inactiveCards.length > 0 && (
        <details className="pt-2">
          <summary className="text-xs font-medium text-text-muted cursor-pointer hover:text-text-primary transition select-none">
            Tarjetas de crédito desactivadas ({inactiveCards.length})
          </summary>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 opacity-60">
            {inactiveCards.map((card) => (
              <Link
                key={card.id}
                href={`/accounts/${card.id}?period=${selectedPeriod}`}
                className="p-3 rounded-card bg-surface-1 border border-border flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-medium text-text-primary">{card.name}</span>
                  <span className="text-text-muted ml-2">({card.currency_native})</span>
                </div>
                <CardBrandSeal brand={detectCardBrand(card.name)} size="sm" />
              </Link>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
