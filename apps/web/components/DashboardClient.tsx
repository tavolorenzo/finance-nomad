'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  X,
  ClipboardCheck,
  Plus,
  Calendar,
  BarChart3
} from 'lucide-react'
import { useLedger } from '@/lib/ledger/ledger-context'
import { convertToDisplayCurrency } from '@/lib/networth'
import { getCachedRate } from '@/lib/storage/fx-cache'
import {
  type DashboardPeriod,
  type CurrencyConverterSync,
  getDashboardPeriodRange,
  computeDashboardCashFlow,
  computeDashboardCategorySpending,
  computeDashboardLiabilities,
  computeDashboardReceivables,
  computeQuickLoansSummary,
  formatDateStr
} from '@/lib/dashboard/metrics'
import { DashboardKpiGrid } from './dashboard/DashboardKpiGrid'
import { AccountsCardList } from './dashboard/AccountsCardList'
import { CreditCardsSummaryList } from './dashboard/CreditCardsSummaryList'
import { ExpensesAnalyticsWidget } from './dashboard/ExpensesAnalyticsWidget'
import { QuickLoansWidget } from './dashboard/QuickLoansWidget'
import { RecentTransactionsWidget } from './dashboard/RecentTransactionsWidget'
import { OnboardingTour } from './OnboardingTour'
import { computePortfolioSummary } from '@/lib/portfolio/calculations'
import type { Account, MasterTransaction, LoanWithInstallments, Person, Category, PortfolioTransaction, TickerQuote } from '@/lib/types'
import type { AccountBalance } from '@/lib/ledger/types'

// Determina si la fecha cae en la ventana de verificación de resumen de tarjeta (primeros 5 o últimos 5 días)
export function isStatementVerificationWindow(date = new Date()): boolean {
  const day = date.getDate()
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  return day <= 5 || day >= daysInMonth - 4
}

interface DashboardEstimate {
  id: string
  name: string
  category_id: string
  estimated_amount: number
  currency: string
}

interface DashboardClientProps {
  initialAccounts: (Account & { institutions?: { name: string } | null })[]
  initialBalances: AccountBalance[]
  initialTransactions: MasterTransaction[]
  initialEstimates: DashboardEstimate[]
  initialLoans: LoanWithInstallments[]
  initialPeople: Person[]
  initialCategories: Category[]
  initialPortfolioTransactions?: PortfolioTransaction[]
  initialCustomRates: Record<string, number>
  displayCurrency: string
  initialNetWorth: number
  initialRealSpent: number
  monthStart: string
  monthEnd: string
}

export function DashboardClient({
  initialAccounts = [],
  initialBalances = [],
  initialTransactions = [],
  initialEstimates = [],
  initialLoans = [],
  initialPeople = [],
  initialCategories = [],
  initialPortfolioTransactions = [],
  initialCustomRates = {},
  displayCurrency = 'EUR',
  initialNetWorth = 0,
  initialRealSpent = 0,
  monthStart = '',
  monthEnd = ''
}: DashboardClientProps) {
  const {
    balances: ledgerBalances,
    accounts: ledgerAccounts,
    recentTransactions: ledgerTransactions,
    portfolioTransactions: ledgerPortfolioTransactions,
    isInitialized,
    seedInitialData
  } = useLedger()

  const [period, setPeriod] = useState<DashboardPeriod>('this_month')
  const [tourOpen, setTourOpen] = useState(false)
  const [showTourBanner, setShowTourBanner] = useState(false)
  const [dismissedCardBanner, setDismissedCardBanner] = useState(false)
  const [includePortfolio, setIncludePortfolio] = useState(true)
  const [cachedQuotes, setCachedQuotes] = useState<Record<string, TickerQuote>>({})

  const todayStr = useMemo(() => formatDateStr(new Date()), [])

  useEffect(() => {
    try {
      const completed = localStorage.getItem('finance_nomad_tour_completed') === 'true'
      if (!completed) {
        setShowTourBanner(true)
      }
      const savedInclude = localStorage.getItem('finance_nomad_include_portfolio_nw')
      if (savedInclude !== null) {
        setIncludePortfolio(savedInclude !== 'false')
      }
      const rawQuotes = localStorage.getItem('finance_nomad_portfolio_quotes_v1')
      if (rawQuotes) {
        setCachedQuotes(JSON.parse(rawQuotes))
      }
    } catch {
      // Ignore
    }
  }, [])

  const handleTogglePortfolio = (next: boolean) => {
    setIncludePortfolio(next)
    try {
      localStorage.setItem('finance_nomad_include_portfolio_nw', String(next))
    } catch {
      // Ignore
    }
  }

  // Sembrar datos iniciales de servidor en LedgerContext para disponibilidad inmediata
  useEffect(() => {
    seedInitialData({
      accounts: initialAccounts,
      balances: initialBalances,
      recentTransactions: initialTransactions,
      portfolioTransactions: initialPortfolioTransactions
    })
  }, [initialAccounts, initialBalances, initialTransactions, initialPortfolioTransactions, seedInitialData])

  // Cuentas reactivas combinando SSR con mutaciones en IndexedDB
  const accounts = useMemo(() => {
    if (ledgerAccounts.length === 0) return initialAccounts
    const instMap = new Map(initialAccounts.map((a) => [a.id, a.institutions]))
    return (ledgerAccounts as typeof initialAccounts).map((a) => ({
      ...a,
      institutions: a.institutions ?? instMap.get(a.id)
    }))
  }, [ledgerAccounts, initialAccounts])

  const balances = ledgerBalances.length > 0 ? ledgerBalances : initialBalances

  // Transacciones combinadas (SSR + creadas localmente en IndexedDB)
  const allTransactions = useMemo(() => {
    const map = new Map<string, MasterTransaction>()
    for (const t of initialTransactions) map.set(t.id, t)
    for (const t of ledgerTransactions) map.set(t.id, t)
    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date))
  }, [initialTransactions, ledgerTransactions])

  const balanceByAccount = useMemo(() => {
    return new Map(balances.map((b) => [b.accountId, b.balance]))
  }, [balances])

  const peopleById = useMemo(() => {
    return new Map(initialPeople.map((p) => [p.id, p]))
  }, [initialPeople])

  const categoriesById = useMemo(() => {
    return new Map(initialCategories.map((c) => [c.id, c]))
  }, [initialCategories])

  // Conversor síncrono ultra-rápido en memoria apoyado en tasas manuales y fx-cache local
  const convert = useMemo<CurrencyConverterSync>(() => {
    return (amount: number, fromCurr: string, toCurr: string) => {
      if (!amount) return 0
      const from = fromCurr.toUpperCase()
      const to = toCurr.toUpperCase()
      if (from === to) return amount

      const pairKey = `${from}_${to}`
      if (initialCustomRates[pairKey] && initialCustomRates[pairKey] > 0) {
        return amount * initialCustomRates[pairKey]
      }

      const invKey = `${to}_${from}`
      if (initialCustomRates[invKey] && initialCustomRates[invKey] > 0) {
        return amount / initialCustomRates[invKey]
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
  }, [initialCustomRates])

  // Separación nítida de Cuentas / Liquidez y Tarjetas de Crédito
  const liquidityAccounts = useMemo(
    () => accounts.filter((a) => a.type !== 'credit_card' && a.is_active !== false),
    [accounts]
  )

  const creditCardAccounts = useMemo(
    () => accounts.filter((a) => a.type === 'credit_card' && a.is_active !== false),
    [accounts]
  )

  // Total de liquidez disponible (solo cuentas no-tarjeta)
  const totalLiquidityInDisplay = useMemo(() => {
    let sum = 0
    for (const acc of liquidityAccounts) {
      const bal = balanceByAccount.get(acc.id) ?? 0
      if (bal > 0) {
        sum += convert(bal, acc.currency_native, displayCurrency)
      }
    }
    return Math.round(sum * 100) / 100
  }, [liquidityAccounts, balanceByAccount, convert, displayCurrency])

  // Rango del período seleccionado (Mes actual vs Últimos 30 días)
  const periodRange = useMemo(
    () => getDashboardPeriodRange(period),
    [period]
  )

  // Cálculo reactivo de Patrimonio Neto
  const [netWorth, setNetWorth] = useState(initialNetWorth)

  useEffect(() => {
    if (balances.length === 0) return
    let active = true

    convertToDisplayCurrency(balances, displayCurrency, todayStr, initialCustomRates)
      .then((val) => {
        if (active) setNetWorth(val)
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [balances, displayCurrency, todayStr, initialCustomRates])

  // Métricas de Cash Flow del período
  const cashFlow = useMemo(() => {
    return computeDashboardCashFlow({
      transactions: allTransactions,
      startDate: periodRange.start,
      endDate: periodRange.end,
      displayCurrency,
      peopleById,
      convert
    })
  }, [allTransactions, periodRange, displayCurrency, peopleById, convert])

  // Gastos Personales por Categoría (excluyendo consumos de terceros)
  const categoryItems = useMemo(() => {
    return computeDashboardCategorySpending({
      transactions: allTransactions,
      categoriesById,
      peopleById,
      startDate: periodRange.start,
      endDate: periodRange.end,
      displayCurrency,
      convert
    })
  }, [allTransactions, categoriesById, peopleById, periodRange, displayCurrency, convert])

  // Pasivos y Deuda Híbrida (Tarjetas + Préstamos)
  const liabilities = useMemo(() => {
    return computeDashboardLiabilities({
      creditCardAccounts,
      balanceByAccount,
      transactions: allTransactions,
      loans: initialLoans,
      todayStr,
      displayCurrency,
      convert
    })
  }, [creditCardAccounts, balanceByAccount, allTransactions, initialLoans, todayStr, displayCurrency, convert])

  // Cuentas por Cobrar (Terceros + Préstamos Otorgados)
  const receivables = useMemo(() => {
    return computeDashboardReceivables({
      transactions: allTransactions,
      loans: initialLoans,
      peopleById,
      displayCurrency,
      convert
    })
  }, [allTransactions, initialLoans, peopleById, displayCurrency, convert])

  // Resumen compacto de Préstamos
  const quickLoans = useMemo(() => {
    return computeQuickLoansSummary(initialLoans, todayStr)
  }, [initialLoans, todayStr])

  // Valor estimado del Portafolio para consolidar en Patrimonio Neto
  const effectivePortfolioTxs = useMemo(() => {
    if (initialPortfolioTransactions.length > 0) return initialPortfolioTransactions
    return ledgerPortfolioTransactions ?? []
  }, [initialPortfolioTransactions, ledgerPortfolioTransactions])

  const portfolioSummary = useMemo(() => {
    return computePortfolioSummary({
      transactions: effectivePortfolioTxs,
      quotes: cachedQuotes,
      displayCurrency,
      convert
    })
  }, [effectivePortfolioTxs, cachedQuotes, displayCurrency, convert])

  // Alerta de ventana de resumen de tarjeta
  const showCardVerifyBanner =
    creditCardAccounts.length > 0 && isStatementVerificationWindow() && !dismissedCardBanner

  return (
    <main className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      {/* Banner de Tour de Bienvenida */}
      {showTourBanner && (
        <div className="p-4 rounded-card bg-surface-1 border border-accent/40 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="p-2 rounded-full bg-accent/15 text-accent mt-0.5">
              <Sparkles size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold text-text-primary">
                ¿Es tu primera vez en Finance Nomad?
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                Hacé el tour guiado de 1 minuto para dominar el manejo multi-moneda, compras en cuotas y gastos compartidos.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowTourBanner(false)
                try {
                  localStorage.setItem('finance_nomad_tour_completed', 'true')
                } catch {
                  // Ignore
                }
              }}
              className="px-2.5 py-1.5 text-xs text-text-muted hover:text-text-primary transition"
            >
              Ocultar
            </button>
            <button
              type="button"
              onClick={() => setTourOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-semibold bg-accent text-[color:var(--on-accent)] hover:opacity-95 transition"
            >
              Iniciar tour
            </button>
          </div>
        </div>
      )}

      {/* Banner de Verificación de Resumen de Tarjetas */}
      {showCardVerifyBanner && (
        <div className="relative p-4 rounded-card bg-surface-1 border border-income/40 shadow-sm flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setDismissedCardBanner(true)}
            aria-label="Cerrar aviso de verificación"
            className="absolute top-3 right-3 p-1.5 rounded-full bg-surface-2/80 text-text-muted hover:text-text-primary hover:bg-surface-2 border border-border-subtle transition"
          >
            <X size={14} />
          </button>
          <div className="flex items-start gap-3 pr-8">
            <span className="p-2 rounded-full bg-income/15 text-income mt-0.5 shrink-0">
              <ClipboardCheck size={18} />
            </span>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold text-text-primary">
                ¿Te llegó el resumen de la tarjeta de crédito?
              </p>
              <p className="text-xs text-text-muted">
                Revisá tu estado de cuenta mensual en un toque: confirmá los consumos registrados, corregí diferencias o asigná gastos al próximo mes.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:pl-11">
            {creditCardAccounts.map((card) => {
              const institutionName = card.institutions?.name?.trim()
              const label = institutionName
                ? `Verificar ${card.name} - ${institutionName}`
                : `Verificar ${card.name}`
              return (
                <Link
                  key={card.id}
                  href={`/accounts/${card.id}/verify`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-semibold bg-income text-surface-0 hover:opacity-95 transition"
                >
                  <ClipboardCheck size={13} />
                  <span>{label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Cabecera Principal del Dashboard con Selector de Período */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="font-display text-2xl font-bold text-text-primary">
            Dashboard
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Control de liquidez, consumos del período y balances consolidados
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-center">
          {/* Switch Alternador de Período: Mes actual vs Últimos 30 días */}
          <div className="inline-flex p-1 rounded-control bg-surface-1 border border-border text-xs">
            <button
              type="button"
              onClick={() => setPeriod('this_month')}
              className={`px-3 py-1 rounded-[8px] font-medium transition ${
                period === 'this_month'
                  ? 'bg-accent text-[color:var(--on-accent)] shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Mes actual
            </button>
            <button
              type="button"
              onClick={() => setPeriod('last_30_days')}
              className={`px-3 py-1 rounded-[8px] font-medium transition ${
                period === 'last_30_days'
                  ? 'bg-accent text-[color:var(--on-accent)] shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Últimos 30 días
            </button>
          </div>

          <Link
            href="/transactions/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-semibold bg-accent text-[color:var(--on-accent)] hover:opacity-95 transition shadow-sm"
          >
            <Plus size={14} />
            <span>Nuevo movimiento</span>
          </Link>
        </div>
      </div>

      {/* Franja Superior: Grid de 4 KPIs Clave */}
      <DashboardKpiGrid
        netWorth={netWorth}
        displayCurrency={displayCurrency}
        cashFlow={cashFlow}
        liabilities={liabilities}
        receivables={receivables}
        periodLabel={periodRange.label}
        portfolioValue={portfolioSummary.totalMarketValueInDisplay}
        includePortfolio={includePortfolio}
        onTogglePortfolio={handleTogglePortfolio}
      />

      {/* Grilla Principal en 2 Columnas Responsivas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Columna 1: Cuentas, Tarjetas de Crédito y Préstamos */}
        <div className="space-y-6">
          <AccountsCardList
            accounts={liquidityAccounts}
            balanceByAccount={balanceByAccount}
            displayCurrency={displayCurrency}
            totalLiquidityInDisplay={totalLiquidityInDisplay}
          />

          <CreditCardsSummaryList
            cards={creditCardAccounts}
            balanceByAccount={balanceByAccount}
            todayStr={todayStr}
          />

          <QuickLoansWidget
            summary={quickLoans}
            displayCurrency={displayCurrency}
          />
        </div>

        {/* Columna 2: Radiografía de Gastos (Propios vs Terceros, Categorías) y Movimientos */}
        <div className="space-y-6">
          <ExpensesAnalyticsWidget
            categoryItems={categoryItems}
            cashFlow={cashFlow}
            displayCurrency={displayCurrency}
            periodLabel={periodRange.label}
          />

          <RecentTransactionsWidget
            transactions={allTransactions}
            peopleById={peopleById}
            categoriesById={categoriesById}
          />
        </div>
      </div>

      <OnboardingTour
        isOpen={tourOpen}
        onClose={() => {
          setTourOpen(false)
          setShowTourBanner(false)
        }}
        currentCurrency={displayCurrency}
      />
    </main>
  )
}
