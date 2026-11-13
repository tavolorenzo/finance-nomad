'use client'

import { useState, useEffect } from 'react'
import {
  X,
  TrendingUp,
  TrendingDown,
  Search,
  Wallet,
  AlertCircle,
  WifiOff,
  CheckCircle2
} from 'lucide-react'
import { createPortfolioOperationAction } from '@/app/(protected)/portfolio/actions'
import { formatMoney } from '@/lib/currency'
import { useOnlineStatus } from '@/lib/hooks/use-online-status'
import type {
  Account,
  PortfolioAssetType,
  PortfolioQuoteMode,
  PortfolioTransactionType,
  TickerQuote
} from '@/lib/types'

interface PortfolioOperationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  accounts: (Account & { institutions?: { name: string } | null })[]
  defaultCurrency: string
  prefill?: {
    ticker?: string
    assetName?: string
    assetType?: PortfolioAssetType
    type?: PortfolioTransactionType
    currency?: string
    quoteMode?: PortfolioQuoteMode
    currentPrice?: number
  } | null
}

const COMMON_CURRENCIES = ['USD', 'EUR', 'UYU', 'ARS', 'AUD', 'NZD', 'BRL', 'GBP']

export function PortfolioOperationModal({
  isOpen,
  onClose,
  onSuccess,
  accounts,
  defaultCurrency,
  prefill
}: PortfolioOperationModalProps) {
  const isOnline = useOnlineStatus()

  const [type, setType] = useState<PortfolioTransactionType>(prefill?.type ?? 'BUY')
  const [quoteMode, setQuoteMode] = useState<PortfolioQuoteMode>(prefill?.quoteMode ?? 'auto')
  const [ticker, setTicker] = useState(prefill?.ticker ?? '')
  const [assetName, setAssetName] = useState(prefill?.assetName ?? '')
  const [assetType, setAssetType] = useState<PortfolioAssetType>(prefill?.assetType ?? 'STOCK')
  const [units, setUnits] = useState('')
  const [pricePerUnit, setPricePerUnit] = useState(
    prefill?.currentPrice ? String(prefill.currentPrice) : ''
  )
  const [feeAmount, setFeeAmount] = useState('0')
  const [currency, setCurrency] = useState(prefill?.currency ?? defaultCurrency ?? 'USD')
  const [manualPrice, setManualPrice] = useState(
    prefill?.currentPrice ? String(prefill.currentPrice) : ''
  )
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [impactAccount, setImpactAccount] = useState(false)
  const [fundingAccountId, setFundingAccountId] = useState(
    accounts.find((a) => a.type !== 'credit_card')?.id ?? accounts[0]?.id ?? ''
  )
  const [notes, setNotes] = useState('')

  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupQuote, setLookupQuote] = useState<TickerQuote | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setType(prefill?.type ?? 'BUY')
      setQuoteMode(prefill?.quoteMode ?? 'auto')
      setTicker(prefill?.ticker ?? '')
      setAssetName(prefill?.assetName ?? '')
      setAssetType(prefill?.assetType ?? 'STOCK')
      setUnits('')
      setPricePerUnit(prefill?.currentPrice ? String(prefill.currentPrice) : '')
      setFeeAmount('0')
      setCurrency(prefill?.currency ?? defaultCurrency ?? 'USD')
      setManualPrice(prefill?.currentPrice ? String(prefill.currentPrice) : '')
      setDate(new Date().toISOString().slice(0, 10))
      setImpactAccount(false)
      setNotes('')
      setLookupQuote(null)
      setLookupError(null)
      setError(null)
    }
  }, [isOpen, prefill, defaultCurrency])

  if (!isOpen) return null

  const parsedUnits = parseFloat(units) || 0
  const parsedPrice = parseFloat(pricePerUnit) || 0
  const parsedFee = parseFloat(feeAmount) || 0
  const totalAmount =
    type === 'BUY'
      ? Math.max(0, parsedUnits * parsedPrice + parsedFee)
      : Math.max(0, parsedUnits * parsedPrice - parsedFee)

  const handleLookupTicker = async () => {
    const clean = ticker.trim().toUpperCase()
    if (!clean) return
    setLookupLoading(true)
    setLookupError(null)
    setLookupQuote(null)
    try {
      const res = await fetch(`/api/portfolio/quotes?tickers=${encodeURIComponent(clean)}`)
      if (!res.ok) throw new Error('Error al consultar ticker')
      const data = await res.json()
      const found: TickerQuote | undefined = data?.quotes?.[clean]
      if (found && found.price > 0) {
        setLookupQuote(found)
        if (!assetName.trim() && found.name) {
          setAssetName(found.name)
        }
        if (found.currency) {
          setCurrency(found.currency.toUpperCase())
        }
        if (!pricePerUnit) {
          setPricePerUnit(String(found.price))
        }
      } else {
        setLookupError(
          'No encontramos cotización pública para ese símbolo. Podés usar cotización manual.'
        )
      }
    } catch {
      setLookupError('No se pudo consultar la cotización en este momento.')
    } finally {
      setLookupLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isOnline) {
      setError('Necesitás conexión a internet para registrar operaciones en el portafolio.')
      return
    }
    setSaving(true)
    setError(null)

    try {
      const fd = new FormData()
      fd.set('type', type)
      fd.set('quote_mode', quoteMode)
      fd.set('ticker', ticker.trim().toUpperCase())
      fd.set('asset_name', assetName.trim() || ticker.trim().toUpperCase())
      fd.set('asset_type', quoteMode === 'manual' && assetType === 'STOCK' ? 'LOCAL' : assetType)
      fd.set('units', units)
      fd.set('price_per_unit', pricePerUnit)
      fd.set('fee_amount', feeAmount || '0')
      fd.set('currency', currency)
      if (quoteMode === 'manual') {
        fd.set('manual_price', manualPrice || pricePerUnit)
      }
      fd.set('date', date)
      fd.set('impact_account', impactAccount ? 'true' : 'false')
      if (impactAccount && fundingAccountId) {
        fd.set('funding_account_id', fundingAccountId)
      }
      fd.set('notes', notes)

      await createPortfolioOperationAction(fd)
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Error al registrar la operación.')
    } finally {
      setSaving(false)
    }
  }

  const nonCardAccounts = accounts.filter((a) => a.type !== 'credit_card')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Registrar operación de portafolio"
    >
      <div className="bg-surface-1 border border-border rounded-card w-full max-w-lg p-5 shadow-xl my-8">
        <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-text-primary">
              Registrar operación de inversión
            </h2>
            <p className="text-xs text-text-secondary">
              Agregá una compra o venta a tu historial del portafolio
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-control text-text-secondary hover:text-text-primary hover:bg-surface-2"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {!isOnline && (
          <div className="mb-4 p-3 rounded-control bg-pending/10 border border-pending/30 flex items-center gap-2 text-xs text-pending">
            <WifiOff size={16} className="shrink-0" />
            <span>
              Estás sin conexión. Conectate a internet para guardar operaciones de portafolio.
            </span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-control bg-expense/10 border border-expense/30 flex items-center gap-2 text-xs text-expense">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Toggle Compra / Venta */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-surface-2 rounded-control">
            <button
              type="button"
              onClick={() => setType('BUY')}
              className={`flex items-center justify-center gap-2 py-2 rounded-control text-xs font-medium transition ${
                type === 'BUY'
                  ? 'bg-income text-[color:var(--on-accent)] shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <TrendingUp size={15} />
              Compra (BUY)
            </button>
            <button
              type="button"
              onClick={() => setType('SELL')}
              className={`flex items-center justify-center gap-2 py-2 rounded-control text-xs font-medium transition ${
                type === 'SELL'
                  ? 'bg-accent text-[color:var(--on-accent)] shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <TrendingDown size={15} />
              Venta (SELL)
            </button>
          </div>

          {/* Modalidad de cotización: Automática vs Manual */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Origen de cotización
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setQuoteMode('auto')}
                className={`px-3 py-2 rounded-control border text-left text-xs transition ${
                  quoteMode === 'auto'
                    ? 'border-accent bg-accent/10 text-text-primary font-medium'
                    : 'border-border bg-surface-2 text-text-secondary'
                }`}
              >
                <div className="font-medium">Ticker de mercado (Auto)</div>
                <div className="text-[11px] text-text-muted">
                  Acciones, ETFs, Cripto (Yahoo/CoinGecko)
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuoteMode('manual')
                  if (assetType === 'STOCK') setAssetType('LOCAL')
                }}
                className={`px-3 py-2 rounded-control border text-left text-xs transition ${
                  quoteMode === 'manual'
                    ? 'border-accent bg-accent/10 text-text-primary font-medium'
                    : 'border-border bg-surface-2 text-text-secondary'
                }`}
              >
                <div className="font-medium">Instrumento local (Manual)</div>
                <div className="text-[11px] text-text-muted">
                  Bonos locales, plazos fijos, fondos
                </div>
              </button>
            </div>
          </div>

          {/* Ticker y Nombre */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                {quoteMode === 'auto' ? 'Ticker / Símbolo *' : 'Código / Identificador *'}
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  required
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  placeholder={quoteMode === 'auto' ? 'Ej: AAPL, SPY, BTC-USD' : 'Ej: BONO-UY, PF-ITAU'}
                  className="w-full px-3 py-2 rounded-control bg-surface-2 border border-border text-sm text-text-primary uppercase focus:border-accent focus:outline-none"
                />
                {quoteMode === 'auto' && (
                  <button
                    type="button"
                    onClick={handleLookupTicker}
                    disabled={lookupLoading || !ticker.trim()}
                    title="Verificar cotización de mercado"
                    className="px-2.5 py-2 rounded-control bg-surface-2 border border-border text-xs text-text-secondary hover:text-accent hover:border-accent disabled:opacity-50"
                  >
                    <Search size={15} />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Nombre descriptivo
              </label>
              <input
                type="text"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                placeholder="Ej: Apple Inc., S&P 500, Letra UYU"
                className="w-full px-3 py-2 rounded-control bg-surface-2 border border-border text-sm text-text-primary focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {lookupQuote && (
            <div className="p-2.5 rounded-control bg-income/10 border border-income/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-income">
                <CheckCircle2 size={14} />
                <span>
                  Cotización detectada ({lookupQuote.name || lookupQuote.ticker})
                </span>
              </div>
              <span className="font-mono tabular-nums amount font-semibold text-text-primary">
                {formatMoney(lookupQuote.price, lookupQuote.currency)}
              </span>
            </div>
          )}

          {lookupError && (
            <p className="text-[11px] text-pending">{lookupError}</p>
          )}

          {/* Categoría de activo y Moneda */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Tipo de activo
              </label>
              <select
                value={assetType}
                onChange={(e) => setAssetType(e.target.value as PortfolioAssetType)}
                className="w-full px-3 py-2 rounded-control bg-surface-2 border border-border text-sm text-text-primary focus:border-accent focus:outline-none"
              >
                <option value="STOCK">Acciones / CEDEARs</option>
                <option value="ETF">ETFs / Fondos Indexados</option>
                <option value="CRYPTO">Criptomonedas</option>
                <option value="FIXED_INCOME">Renta Fija / Bonos</option>
                <option value="LOCAL">Instrumento Local / Manual</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Moneda de cotización
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 rounded-control bg-surface-2 border border-border text-sm text-text-primary focus:border-accent focus:outline-none"
              >
                {COMMON_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Unidades, Precio Unitario y Comisión */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Unidades *
              </label>
              <input
                type="number"
                step="any"
                min="0.000001"
                required
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                placeholder="Ej: 10 o 0.25"
                className="w-full px-3 py-2 rounded-control bg-surface-2 border border-border text-sm font-mono tabular-nums text-text-primary focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Precio unitario *
              </label>
              <input
                type="number"
                step="any"
                min="0.0001"
                required
                value={pricePerUnit}
                onChange={(e) => {
                  setPricePerUnit(e.target.value)
                  if (quoteMode === 'manual' && !manualPrice) {
                    setManualPrice(e.target.value)
                  }
                }}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-control bg-surface-2 border border-border text-sm font-mono tabular-nums text-text-primary focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Comisión / Fee
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={feeAmount}
                onChange={(e) => setFeeAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-control bg-surface-2 border border-border text-sm font-mono tabular-nums text-text-primary focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {/* Precio actual manual si es instrumento manual */}
          {quoteMode === 'manual' && (
            <div className="p-3 rounded-control bg-surface-2 border border-border-subtle">
              <label className="block text-xs font-medium text-text-primary mb-1">
                Valor unitario actual de referencia ({currency})
              </label>
              <input
                type="number"
                step="any"
                min="0.0001"
                value={manualPrice || pricePerUnit}
                onChange={(e) => setManualPrice(e.target.value)}
                placeholder="Precio actual para valuar tu tenencia"
                className="w-full px-3 py-1.5 rounded-control bg-surface-1 border border-border text-sm font-mono tabular-nums text-text-primary focus:border-accent focus:outline-none"
              />
              <p className="text-[11px] text-text-muted mt-1">
                Podés actualizar este valor manual en cualquier momento desde la tabla de tenencias.
              </p>
            </div>
          )}

          {/* Fecha y Notas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Fecha de operación *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-control bg-surface-2 border border-border text-sm text-text-primary focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Nota opcional
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Broker, objetivo, etc."
                className="w-full px-3 py-2 rounded-control bg-surface-2 border border-border text-sm text-text-primary focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {/* Switch opcional para impactar en cuenta bancaria */}
          <div className="p-3 rounded-control bg-surface-2 border border-border space-y-2.5">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <Wallet size={16} className="text-accent" />
                <div>
                  <span className="text-xs font-medium text-text-primary block">
                    {type === 'BUY'
                      ? 'Descontar compra de una cuenta bancaria / broker'
                      : 'Acreditar cobro de venta en una cuenta bancaria / broker'}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    Opcional. Desactivalo si solo estás cargando tenencias históricas.
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={impactAccount}
                onChange={(e) => setImpactAccount(e.target.checked)}
                className="h-4 w-4 accent-[color:var(--accent)] rounded"
              />
            </label>

            {impactAccount && (
              <div className="pt-2 border-t border-border-subtle">
                <label className="block text-xs text-text-secondary mb-1">
                  Cuenta a {type === 'BUY' ? 'debitar' : 'acreditar'}
                </label>
                {nonCardAccounts.length > 0 ? (
                  <select
                    value={fundingAccountId}
                    onChange={(e) => setFundingAccountId(e.target.value)}
                    className="w-full px-3 py-2 rounded-control bg-surface-1 border border-border text-xs text-text-primary"
                  >
                    {nonCardAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.institutions?.name ? `${acc.institutions.name} · ` : ''}
                        {acc.name} ({acc.currency_native})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-pending">
                    No tenés cuentas activas disponibles para vincular.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Resumen del total de la operación */}
          <div className="flex items-center justify-between px-3 py-2.5 rounded-control bg-surface-0 border border-border">
            <span className="text-xs text-text-secondary">
              {type === 'BUY' ? 'Total invertido (con fee)' : 'Neto a recibir (menos fee)'}
            </span>
            <span className="font-mono tabular-nums amount text-base font-semibold text-text-primary">
              {formatMoney(totalAmount, currency)}
            </span>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-control border border-border text-xs font-medium text-text-secondary hover:text-text-primary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !isOnline}
              className="px-4 py-2 rounded-control bg-accent text-[color:var(--on-accent)] text-xs font-medium hover:opacity-95 disabled:opacity-50"
            >
              {saving
                ? 'Guardando...'
                : type === 'BUY'
                ? 'Registrar compra'
                : 'Registrar venta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

