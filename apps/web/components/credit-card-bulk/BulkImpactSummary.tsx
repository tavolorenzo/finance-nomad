'use client'

import { CreditCard, CalendarClock, ShieldAlert, Sparkles, Users } from 'lucide-react'
import { formatMoney } from '@/lib/currency'

interface BulkImpactSummaryProps {
  currentStatementTotal: number
  futureCommitmentsTotal: number
  creditLimit: number | null
  currency: string
  personalTotal?: number
  sharedTotal?: number
  sharedCount?: number
  currentByCurrency?: Record<string, number>
  futureByCurrency?: Record<string, number>
  personalByCurrency?: Record<string, number>
  sharedByCurrency?: Record<string, number>
}

function renderCurrencyBreakdown(
  byCurrency: Record<string, number> | undefined,
  fallbackAmount: number,
  defaultCurrency: string,
  colorClass: string
) {
  const entries = byCurrency
    ? Object.entries(byCurrency).filter(([, amt]) => amt > 0)
    : []

  if (entries.length === 0) {
    return (
      <p className={`font-mono tabular-nums text-base font-bold amount ${colorClass}`}>
        {formatMoney(fallbackAmount, defaultCurrency)}
      </p>
    )
  }

  if (entries.length === 1) {
    const [curr, amt] = entries[0]
    return (
      <p className={`font-mono tabular-nums text-base font-bold amount ${colorClass}`}>
        {formatMoney(amt, curr)}
      </p>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
      {entries.map(([curr, amt]) => (
        <span
          key={curr}
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono tabular-nums font-bold amount bg-surface-1 border border-border ${colorClass}`}
        >
          {formatMoney(amt, curr)}
        </span>
      ))}
    </div>
  )
}

function formatInlineCurrencyMap(
  byCurrency: Record<string, number> | undefined,
  fallbackAmount: number,
  defaultCurrency: string
): string {
  const entries = byCurrency
    ? Object.entries(byCurrency).filter(([, amt]) => amt > 0)
    : []
  if (entries.length === 0) return formatMoney(fallbackAmount, defaultCurrency)
  return entries.map(([curr, amt]) => formatMoney(amt, curr)).join(' + ')
}

export function BulkImpactSummary({
  currentStatementTotal,
  futureCommitmentsTotal,
  creditLimit,
  currency,
  personalTotal,
  sharedTotal,
  sharedCount,
  currentByCurrency,
  futureByCurrency,
  personalByCurrency,
  sharedByCurrency
}: BulkImpactSummaryProps) {
  const totalCommitted = currentStatementTotal + futureCommitmentsTotal
  const remainingLimit = creditLimit !== null ? creditLimit - totalCommitted : null
  const usagePercentage = creditLimit && creditLimit > 0
    ? Math.min(100, Math.round((totalCommitted / creditLimit) * 100))
    : null

  const hasShared =
    (sharedTotal !== undefined && sharedTotal > 0) ||
    (sharedByCurrency && Object.values(sharedByCurrency).some((v) => v > 0))

  return (
    <div className="bg-surface-1 border border-border rounded-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span>Impacto Financiero Proyectado</span>
        </p>
        <span className="text-[11px] text-text-muted">Cálculo en vivo</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Consumos del resumen actual */}
        <div className="p-3 bg-surface-0 border border-border/80 rounded-control space-y-1">
          <p className="text-[11px] text-text-secondary flex items-center gap-1">
            <CreditCard className="w-3 h-3 text-expense" />
            <span>En este resumen:</span>
          </p>
          {renderCurrencyBreakdown(
            currentByCurrency,
            currentStatementTotal,
            currency,
            'text-expense'
          )}
          <p className="text-[10px] text-text-muted">
            Vence en el próximo cierre
          </p>
        </div>

        {/* Compromisos futuros diferidos */}
        <div className="p-3 bg-surface-0 border border-border/80 rounded-control space-y-1">
          <p className="text-[11px] text-text-secondary flex items-center gap-1">
            <CalendarClock className="w-3 h-3 text-pending" />
            <span>Cuotas diferidas futuras:</span>
          </p>
          {renderCurrencyBreakdown(
            futureByCurrency,
            futureCommitmentsTotal,
            currency,
            'text-pending'
          )}
          <p className="text-[10px] text-text-muted">
            Meses subsiguientes
          </p>
        </div>

        {/* Límite disponible restante (si aplica) */}
        <div className="p-3 bg-surface-0 border border-border/80 rounded-control space-y-1">
          <p className="text-[11px] text-text-secondary flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-accent" />
            <span>Límite disponible ({currency}):</span>
          </p>
          {remainingLimit !== null ? (
            <>
              <p
                className={`font-mono tabular-nums text-base font-bold amount ${
                  remainingLimit < 0 ? 'text-expense' : 'text-text-primary'
                }`}
              >
                {formatMoney(remainingLimit, currency)}
              </p>
              <p className="text-[10px] text-text-muted">
                {usagePercentage}% consumido del límite en {currency}
              </p>
            </>
          ) : (
            <>
              <p className="font-mono tabular-nums text-base font-bold text-text-muted amount">
                Sin límite
              </p>
              <p className="text-[10px] text-text-muted">No especificaste cupo</p>
            </>
          )}
        </div>
      </div>

      {hasShared && (
        <div className="pt-2.5 border-t border-border/70 flex items-center justify-between text-xs flex-wrap gap-2">
          <span className="text-text-secondary flex items-center gap-1.5 font-medium">
            <Users className="w-3.5 h-3.5 text-accent" />
            <span>Asignación a personas:</span>
          </span>
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-text-secondary">
              Personal:{' '}
              <strong className="text-text-primary font-mono tabular-nums amount">
                {formatInlineCurrencyMap(personalByCurrency, personalTotal ?? 0, currency)}
              </strong>
            </span>
            <span className="text-accent font-medium flex items-center gap-1">
              <span>
                A cobrar ({sharedCount} {sharedCount === 1 ? 'consumo' : 'consumos'}):
              </span>
              <strong className="font-mono tabular-nums amount">
                {formatInlineCurrencyMap(sharedByCurrency, sharedTotal ?? 0, currency)}
              </strong>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
