'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  TrendingUp,
  TrendingDown,
  Plus,
  RefreshCw,
  Info,
  Edit2,
  Trash2,
  Check,
  X,
  PieChart,
  Briefcase,
  History,
  DollarSign
} from 'lucide-react'
import { useOptionalLedger } from '@/lib/ledger/ledger-context'
import { getCachedRate } from '@/lib/storage/fx-cache'
import { formatMoney } from '@/lib/currency'
import { useOnlineStatus } from '@/lib/hooks/use-online-status'
import {
  computePortfolioSummary,
  ASSET_TYPE_LABELS,
  normalizeTicker
} from '@/lib/portfolio/calculations'
import {
  updateTickerManualPriceAction,
  deletePortfolioOperationAction
} from '@/app/(protected)/portfolio/actions'
import { PaginationControl } from '@/components/PaginationControl'
import { PortfolioOperationModal } from './PortfolioOperationModal'
import type {
  Account,
  PortfolioAssetType,
  PortfolioPosition,
  PortfolioQuoteMode,
  PortfolioTransaction,
  PortfolioTransactionType,
  TickerQuote
} from '@/lib/types'

interface PortfolioDashboardProps {
  initialTransactions: PortfolioTransaction[]
  initialQuotes: Record<string, TickerQuote>
  initialAccounts: (Account & { institutions?: { name: string } | null })[]
  initialCustomRates: Record<string, number>
  displayCurrency: string
}

const QUOTES_STORAGE_KEY = 'finance_nomad_portfolio_quotes_v1'
const HISTORY_PAGE_SIZE = 15

export function PortfolioDashboard({
  initialTransactions = [],
  initialQuotes = {},
  initialAccounts = [],
  initialCustomRates = {},
  displayCurrency = 'EUR'
}: PortfolioDashboardProps) {
  const router = useRouter()
  const isOnline = useOnlineStatus()
  const ledger = useOptionalLedger()

  const [quotes, setQuotes] = useState<Record<string, TickerQuote>>(initialQuotes)
  const [refreshingQuotes, setRefreshingQuotes] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalPrefill, setModalPrefill] = useState<{
    ticker?: string
    assetName?: string
    assetType?: PortfolioAssetType
    type?: PortfolioTransactionType
    currency?: string
    quoteMode?: PortfolioQuoteMode
    currentPrice?: number
  } | null>(null)

  // Estado para edición rápida de precio manual en la tabla
  const [editingTicker, setEditingTicker] = useState<string | null>(null)
  const [editingPriceValue, setEditingPriceValue] = useState('')
  const [savingManualPrice, setSavingManualPrice] = useState(false)

  // Estado de paginación del historial
  const [historyPage, setHistoryPage] = useState(1)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Sembrar en LedgerContext para disponibilidad offline (IndexedDB)
  useEffect(() => {
    if (ledger?.seedInitialData && initialTransactions.length > 0) {
      ledger.seedInitialData({
        portfolioTransactions: initialTransactions
      })
    }
  }, [initialTransactions, ledger])

  // Hidratación offline desde LedgerContext si el servidor vino vacío por corte de red
  const transactions = useMemo(() => {
    if (initialTransactions.length > 0) return initialTransactions
    return ledger?.portfolioTransactions ?? []
  }, [initialTransactions, ledger?.portfolioTransactions])

  const accounts = useMemo(() => {
    if (initialAccounts.length > 0) return initialAccounts
    return (ledger?.accounts as typeof initialAccounts) ?? []
  }, [initialAccounts, ledger?.accounts])

  // Cargar y persistir cotizaciones en localStorage para resiliencia offline
  useEffect(() => {
    try {
      const raw = localStorage.getItem(QUOTES_STORAGE_KEY)
      const cached: Record<string, TickerQuote> = raw ? JSON.parse(raw) : {}
      const merged = { ...cached, ...initialQuotes }
      setQuotes(merged)
      if (Object.keys(initialQuotes).length > 0) {
        localStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(merged))
      }
    } catch {
      // Ignore storage errors
    }
  }, [initialQuotes])

  // Conversor síncrono en memoria apoyado en tasas manuales y fx-cache
  const convertSync = useCallback(
    (amount: number, fromCurr: string, toCurr: string): number => {
      if (!amount) return 0
      const f = (fromCurr || toCurr).toUpperCase()
      const t = (toCurr || f).toUpperCase()
      if (f === t) return amount

      const pairKey = `${f}_${t}`
      if (typeof initialCustomRates[pairKey] === 'number' && initialCustomRates[pairKey] > 0) {
        return amount * initialCustomRates[pairKey]
      }

      const cached = getCachedRate(f, t)
      if (cached && cached.rate > 0) {
        return amount * cached.rate
      }

      const reverseCached = getCachedRate(t, f)
      if (reverseCached && reverseCached.rate > 0) {
        return amount / reverseCached.rate
      }

      return amount
    },
    [initialCustomRates]
  )

  const summary = useMemo(() => {
    return computePortfolioSummary({
      transactions,
      quotes,
      displayCurrency,
      convert: convertSync
    })
  }, [transactions, quotes, displayCurrency, convertSync])

  // Refrescar cotizaciones de tickers automáticos bajo demanda
  const handleRefreshQuotes = useCallback(async () => {
    if (!isOnline) return
    const autoTickers = Array.from(
      new Set(
        summary.positions
          .filter((p) => p.quoteMode === 'auto')
          .map((p) => normalizeTicker(p.ticker))
      )
    )
    if (autoTickers.length === 0) return

    setRefreshingQuotes(true)
    try {
      const res = await fetch(
        `/api/portfolio/quotes?tickers=${encodeURIComponent(autoTickers.join(','))}`
      )
      if (res.ok) {
        const data = await res.json()
        if (data?.quotes) {
          setQuotes((prev) => {
            const next = { ...prev, ...data.quotes }
            try {
              localStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(next))
            } catch {}
            return next
          })
        }
      }
    } catch {
      // Ignore network error
    } finally {
      setRefreshingQuotes(false)
    }
  }, [isOnline, summary.positions])

  // Si hay posiciones 'auto' sin cotización en el primer render y estamos online, consultar
  useEffect(() => {
    const missingTickers = summary.positions
      .filter((p) => p.quoteMode === 'auto' && !quotes[p.ticker])
      .map((p) => p.ticker)
    if (isOnline && missingTickers.length > 0) {
      handleRefreshQuotes()
    }
  }, [isOnline, summary.positions, quotes, handleRefreshQuotes])

  const handleSaveManualPrice = async (ticker: string) => {
    const val = parseFloat(editingPriceValue)
    if (isNaN(val) || val <= 0) return
    setSavingManualPrice(true)
    try {
      await updateTickerManualPriceAction(ticker, val, 'manual')
      setEditingTicker(null)
      router.refresh()
      ledger?.refresh?.()
    } catch {
      // Ignore
    } finally {
      setSavingManualPrice(false)
    }
  }

  const handleDeleteOperation = async (id: string) => {
    if (!isOnline) return
    setDeletingId(id)
    try {
      await deletePortfolioOperationAction(id)
      router.refresh()
      ledger?.refresh?.()
    } catch {
      // Ignore
    } finally {
      setDeletingId(null)
    }
  }

  const openNewModal = (prefill?: typeof modalPrefill) => {
    setModalPrefill(prefill ?? null)
    setModalOpen(true)
  }

  // Paginación del historial
  const totalHistoryItems = transactions.length
  const totalHistoryPages = Math.max(1, Math.ceil(totalHistoryItems / HISTORY_PAGE_SIZE))
  const safePage = Math.min(historyPage, totalHistoryPages)
  const paginatedHistory = useMemo(() => {
    const start = (safePage - 1) * HISTORY_PAGE_SIZE
    return transactions.slice(start, start + HISTORY_PAGE_SIZE)
  }, [transactions, safePage])

  const isUnrealizedPositive = summary.totalUnrealizedPnLInDisplay >= 0
  const isRealizedPositive = summary.totalRealizedPnLInDisplay >= 0

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text-primary">
            Portafolio de Inversiones
          </h1>
          <p className="text-sm text-text-secondary">
            Seguimiento de capital invertido, rendimiento y consolidación estimada en{' '}
            <span className="font-mono font-medium text-text-primary">{displayCurrency}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefreshQuotes}
            disabled={!isOnline || refreshingQuotes || summary.positions.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-control border border-border bg-surface-1 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-2 transition disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshingQuotes ? 'animate-spin text-accent' : ''} />
            <span>Actualizar precios</span>
          </button>

          <button
            type="button"
            onClick={() => openNewModal(null)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-control bg-accent text-[color:var(--on-accent)] text-xs font-medium hover:opacity-95 transition"
          >
            <Plus size={15} />
            <span>Registrar operación</span>
          </button>
        </div>
      </div>

      {/* Disclaimer Informativo Obligatorio */}
      <div
        className="bg-surface-1 border border-border-subtle rounded-card p-3.5 flex items-start gap-3"
        role="note"
        aria-label="Aviso informativo del portafolio"
      >
        <span className="p-1.5 rounded-full bg-accent/10 text-accent shrink-0 mt-0.5">
          <Info size={16} />
        </span>
        <div className="text-xs text-text-secondary leading-relaxed">
          <span className="font-semibold text-text-primary">
            Herramienta de carácter informativo y seguimiento personal:
          </span>{' '}
          Las cotizaciones automáticas provienen de fuentes públicas gratuitas (Yahoo / Google
          Finance y CoinGecko) y pueden presentar demoras o diferencias respecto a tu broker. Los
          importes aquí expuestos tienen como único fin el{' '}
          <span className="text-text-primary font-medium">
            trackeo de tu capital invertido y la consolidación estimada con tus finanzas personales
          </span>
          , y no constituyen asesoramiento financiero, impositivo ni recomendación de inversión.
        </div>
      </div>

      {/* Franja de 4 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Valor de Mercado Estimado */}
        <div className="bg-surface-1 border border-border rounded-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-secondary mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">
              Valor Estimado Actual
            </span>
            <span className="p-1.5 rounded-full bg-accent/10 text-accent">
              <Briefcase size={16} />
            </span>
          </div>
          <div>
            <p className="font-mono tabular-nums amount text-2xl lg:text-3xl font-semibold text-text-primary mt-1">
              {formatMoney(summary.totalMarketValueInDisplay, displayCurrency)}
            </p>
            <p className="text-xs text-text-muted mt-1">
              {summary.positions.length}{' '}
              {summary.positions.length === 1 ? 'posición activa' : 'posiciones activas'}
            </p>
          </div>
        </div>

        {/* KPI 2: Capital Invertido */}
        <div className="bg-surface-1 border border-border rounded-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-secondary mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">
              Capital Invertido
            </span>
            <span className="p-1.5 rounded-full bg-surface-2 text-text-secondary">
              <DollarSign size={16} />
            </span>
          </div>
          <div>
            <p className="font-mono tabular-nums amount text-2xl lg:text-3xl font-semibold text-text-primary mt-1">
              {formatMoney(summary.totalInvestedInDisplay, displayCurrency)}
            </p>
            <p className="text-xs text-text-muted mt-1">
              Costo base promedio ponderado (PPC)
            </p>
          </div>
        </div>

        {/* KPI 3: Rendimiento Abierto (No Realizado) */}
        <div className="bg-surface-1 border border-border rounded-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-secondary mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">
              Rendimiento Abierto
            </span>
            <span
              className={`p-1.5 rounded-full ${
                isUnrealizedPositive ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense'
              }`}
            >
              {isUnrealizedPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <p
                className={`font-mono tabular-nums amount text-2xl lg:text-3xl font-semibold mt-1 ${
                  isUnrealizedPositive ? 'text-income' : 'text-expense'
                }`}
              >
                {isUnrealizedPositive ? '+' : ''}
                {formatMoney(summary.totalUnrealizedPnLInDisplay, displayCurrency)}
              </p>
              <span
                className={`font-mono tabular-nums text-[11px] font-medium px-1.5 py-0.5 rounded ${
                  isUnrealizedPositive
                    ? 'bg-income/15 text-income'
                    : 'bg-expense/15 text-expense'
                }`}
              >
                {isUnrealizedPositive ? '+' : ''}
                {summary.totalUnrealizedPnLPct.toFixed(2)}%
              </span>
            </div>
            <p className="text-xs text-text-muted mt-1">
              Ganancia / pérdida latente estimada
            </p>
          </div>
        </div>

        {/* KPI 4: Ganancia/Pérdida Realizada */}
        <div className="bg-surface-1 border border-border rounded-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-secondary mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">
              Resultado Realizado
            </span>
            <span className="p-1.5 rounded-full bg-accent/10 text-accent">
              <PieChart size={16} />
            </span>
          </div>
          <div>
            <p
              className={`font-mono tabular-nums amount text-2xl lg:text-3xl font-semibold mt-1 ${
                summary.totalRealizedPnLInDisplay === 0
                  ? 'text-text-primary'
                  : isRealizedPositive
                  ? 'text-income'
                  : 'text-expense'
              }`}
            >
              {summary.totalRealizedPnLInDisplay > 0 ? '+' : ''}
              {formatMoney(summary.totalRealizedPnLInDisplay, displayCurrency)}
            </p>
            <p className="text-xs text-text-muted mt-1">
              Consolidado de ventas cerradas
            </p>
          </div>
        </div>
      </div>

      {/* Distribución por Tipo de Activo */}
      {summary.allocationByType.length > 0 && (
        <section className="bg-surface-1 border border-border rounded-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wider text-text-secondary">
              Composición del portafolio
            </h2>
            <span className="text-xs text-text-muted">En {displayCurrency}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {summary.allocationByType.map((item) => (
              <div
                key={item.assetType}
                className="p-3 rounded-control bg-surface-2 border border-border-subtle space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-text-primary">{item.label}</span>
                  <span className="font-mono tabular-nums text-text-secondary">
                    {item.percentage}%
                  </span>
                </div>
                <p className="font-mono tabular-nums amount text-sm font-semibold text-text-primary">
                  {formatMoney(item.marketValueInDisplay, displayCurrency)}
                </p>
                <div className="w-full h-1.5 rounded-full bg-surface-0 overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full"
                    style={{ width: `${Math.min(100, Math.max(4, item.percentage))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tabla de Posiciones Activas */}
      <section className="bg-surface-1 border border-border rounded-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-text-primary">
              Tenencias activas
            </h2>
            <p className="text-xs text-text-secondary">
              Tus posiciones abiertas calculadas por Costo Promedio Ponderado (PPC)
            </p>
          </div>
        </div>

        {summary.positions.length === 0 ? (
          <div className="text-center py-10 px-4 border border-dashed border-border rounded-control space-y-3">
            <div className="mx-auto w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-text-primary">
                Todavía no tenés activos registrados en tu portafolio
              </p>
              <p className="text-xs text-text-secondary max-w-md mx-auto">
                Cargá tus acciones, ETFs, criptomonedas o instrumentos locales con valor manual para
                seguir tu capital invertido y consolidarlo en tu Patrimonio Neto.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openNewModal(null)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-control bg-accent text-[color:var(--on-accent)] text-xs font-medium"
            >
              <Plus size={15} />
              <span>Cargar primera inversión</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wider text-text-muted">
                  <th className="py-2.5 pr-3">Activo</th>
                  <th className="py-2.5 px-3 text-right">Unidades</th>
                  <th className="py-2.5 px-3 text-right">PPC (Costo)</th>
                  <th className="py-2.5 px-3 text-right">Precio Actual</th>
                  <th className="py-2.5 px-3 text-right">Invertido</th>
                  <th className="py-2.5 px-3 text-right">Valor Actual</th>
                  <th className="py-2.5 px-3 text-right">Rendimiento</th>
                  <th className="py-2.5 pl-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-sm">
                {summary.positions.map((pos: PortfolioPosition) => {
                  const isPos = pos.unrealizedPnL >= 0
                  const isEditingThis = editingTicker === pos.ticker

                  return (
                    <tr key={pos.ticker} className="hover:bg-surface-2/40 transition">
                      {/* Activo */}
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-text-primary">
                            {pos.ticker}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-2 text-text-secondary">
                            {ASSET_TYPE_LABELS[pos.assetType] || pos.assetType}
                          </span>
                        </div>
                        <p className="text-xs text-text-muted truncate max-w-[180px]">
                          {pos.assetName}
                        </p>
                      </td>

                      {/* Unidades */}
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-xs text-text-primary">
                        {pos.units}
                      </td>

                      {/* Costo Promedio (PPC) */}
                      <td className="py-3 px-3 text-right font-mono tabular-nums amount text-xs text-text-secondary">
                        {formatMoney(pos.averageCost, pos.currency)}
                      </td>

                      {/* Precio Actual + Edición Manual */}
                      <td className="py-3 px-3 text-right">
                        {isEditingThis ? (
                          <div className="inline-flex items-center gap-1 justify-end">
                            <input
                              type="number"
                              step="any"
                              min="0.0001"
                              value={editingPriceValue}
                              onChange={(e) => setEditingPriceValue(e.target.value)}
                              className="w-24 px-2 py-1 rounded bg-surface-2 border border-accent text-right font-mono tabular-nums text-xs text-text-primary focus:outline-none"
                              aria-label={`Nuevo precio manual para ${pos.ticker}`}
                            />
                            <button
                              type="button"
                              disabled={savingManualPrice}
                              onClick={() => handleSaveManualPrice(pos.ticker)}
                              className="p-1 rounded bg-income/15 text-income hover:bg-income/25"
                              title="Guardar precio manual"
                            >
                              <Check size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingTicker(null)}
                              className="p-1 rounded bg-surface-2 text-text-secondary hover:text-text-primary"
                              title="Cancelar"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end">
                            <div className="inline-flex items-center gap-1.5">
                              <span className="font-mono tabular-nums amount text-xs font-medium text-text-primary">
                                {formatMoney(pos.currentPrice, pos.currency)}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTicker(pos.ticker)
                                  setEditingPriceValue(String(pos.currentPrice))
                                }}
                                className="text-text-muted hover:text-accent transition"
                                title="Definir o ajustar valor manual"
                                aria-label={`Editar precio de ${pos.ticker}`}
                              >
                                <Edit2 size={12} />
                              </button>
                            </div>
                            <span className="text-[10px] text-text-muted">
                              {pos.quoteSource === 'manual'
                                ? 'Valor manual'
                                : pos.quoteSource === 'fallback'
                                ? 'Últ. compra'
                                : `Mercado (${pos.quoteSource})`}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Capital Invertido */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-mono tabular-nums amount text-xs text-text-secondary">
                          {formatMoney(pos.investedCapital, pos.currency)}
                        </div>
                        {pos.currency !== displayCurrency && (
                          <div className="font-mono tabular-nums amount text-[10px] text-text-muted">
                            ≈ {formatMoney(pos.investedInDisplay, displayCurrency)}
                          </div>
                        )}
                      </td>

                      {/* Valor de Mercado */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-mono tabular-nums amount text-xs font-semibold text-text-primary">
                          {formatMoney(pos.marketValue, pos.currency)}
                        </div>
                        {pos.currency !== displayCurrency && (
                          <div className="font-mono tabular-nums amount text-[10px] text-text-muted">
                            ≈ {formatMoney(pos.marketValueInDisplay, displayCurrency)}
                          </div>
                        )}
                      </td>

                      {/* Rendimiento */}
                      <td className="py-3 px-3 text-right">
                        <div
                          className={`font-mono tabular-nums amount text-xs font-semibold ${
                            isPos ? 'text-income' : 'text-expense'
                          }`}
                        >
                          {isPos ? '+' : ''}
                          {formatMoney(pos.unrealizedPnL, pos.currency)}
                        </div>
                        <div
                          className={`font-mono tabular-nums text-[10px] ${
                            isPos ? 'text-income' : 'text-expense'
                          }`}
                        >
                          {isPos ? '+' : ''}
                          {pos.unrealizedPnLPct.toFixed(2)}%
                        </div>
                      </td>

                      {/* Acciones rápidas: Comprar / Vender */}
                      <td className="py-3 pl-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              openNewModal({
                                ticker: pos.ticker,
                                assetName: pos.assetName,
                                assetType: pos.assetType,
                                type: 'BUY',
                                currency: pos.currency,
                                quoteMode: pos.quoteMode,
                                currentPrice: pos.currentPrice
                              })
                            }
                            className="px-2 py-1 rounded bg-income/10 text-income hover:bg-income/20 text-[11px] font-medium transition"
                            title="Registrar nueva compra de este activo"
                          >
                            + Comprar
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              openNewModal({
                                ticker: pos.ticker,
                                assetName: pos.assetName,
                                assetType: pos.assetType,
                                type: 'SELL',
                                currency: pos.currency,
                                quoteMode: pos.quoteMode,
                                currentPrice: pos.currentPrice
                              })
                            }
                            className="px-2 py-1 rounded bg-surface-2 text-text-secondary hover:text-text-primary text-[11px] font-medium transition"
                            title="Registrar venta total o parcial"
                          >
                            Vender
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Historial de Operaciones (BUY / SELL) */}
      <section className="bg-surface-1 border border-border rounded-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={18} className="text-accent" />
            <div>
              <h2 className="font-display text-base font-semibold text-text-primary">
                Historial de operaciones
              </h2>
              <p className="text-xs text-text-secondary">
                Registro cronológico de compras y ventas de activos
              </p>
            </div>
          </div>
        </div>

        {transactions.length === 0 ? (
          <p className="text-xs text-text-muted py-4 text-center">
            Sin operaciones registradas todavía.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border text-[11px] uppercase tracking-wider text-text-muted">
                    <th className="py-2 pr-3">Fecha</th>
                    <th className="py-2 px-3">Operación</th>
                    <th className="py-2 px-3">Activo</th>
                    <th className="py-2 px-3 text-right">Unidades</th>
                    <th className="py-2 px-3 text-right">Precio Unit.</th>
                    <th className="py-2 px-3 text-right">Total</th>
                    <th className="py-2 px-3">Cuenta vinculada</th>
                    <th className="py-2 pl-3 text-right">Eliminar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle text-xs">
                  {paginatedHistory.map((tx) => {
                    const isBuy = tx.type === 'BUY'
                    const total =
                      isBuy
                        ? Number(tx.units) * Number(tx.price_per_unit) + Number(tx.fee_amount || 0)
                        : Math.max(
                            0,
                            Number(tx.units) * Number(tx.price_per_unit) -
                              Number(tx.fee_amount || 0)
                          )

                    return (
                      <tr key={tx.id} className="hover:bg-surface-2/40 transition">
                        <td className="py-2.5 pr-3 font-mono tabular-nums text-text-secondary">
                          {tx.date}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                              isBuy
                                ? 'bg-income/15 text-income'
                                : 'bg-accent/15 text-accent'
                            }`}
                          >
                            {isBuy ? 'Compra (BUY)' : 'Venta (SELL)'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono font-semibold text-text-primary">
                            {tx.ticker}
                          </span>
                          {tx.asset_name && tx.asset_name !== tx.ticker && (
                            <span className="text-text-muted ml-1.5">· {tx.asset_name}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-text-primary">
                          {tx.units}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums amount text-text-secondary">
                          {formatMoney(Number(tx.price_per_unit), tx.currency)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums amount font-medium text-text-primary">
                          {formatMoney(total, tx.currency)}
                        </td>
                        <td className="py-2.5 px-3 text-text-secondary">
                          {tx.account?.name ? (
                            <span className="text-text-primary">
                              {tx.account.name} ({tx.account.currency_native})
                            </span>
                          ) : (
                            <span className="text-text-muted">Solo trackeo</span>
                          )}
                        </td>
                        <td className="py-2.5 pl-3 text-right">
                          <button
                            type="button"
                            disabled={!isOnline || deletingId === tx.id}
                            onClick={() => handleDeleteOperation(tx.id)}
                            className="p-1.5 rounded text-text-muted hover:text-expense hover:bg-expense/10 transition disabled:opacity-40"
                            title="Eliminar operación"
                            aria-label={`Eliminar operación de ${tx.ticker}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <PaginationControl
              currentPage={safePage}
              totalItems={totalHistoryItems}
              pageSize={HISTORY_PAGE_SIZE}
              onPageChange={setHistoryPage}
              itemLabel="operaciones"
            />
          </>
        )}
      </section>

      <PortfolioOperationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          router.refresh()
          ledger?.refresh?.()
        }}
        accounts={accounts}
        defaultCurrency={displayCurrency}
        prefill={modalPrefill}
      />
    </main>
  )
}

