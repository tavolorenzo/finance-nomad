'use client'

import Link from 'next/link'
import { CreditCard, Calendar, ArrowRight, ClipboardCheck, AlertCircle } from 'lucide-react'
import { formatMoney } from '@/lib/currency'
import { CardBrandSeal } from '@/components/cards/CardBrandSeal'
import { detectCardBrand, computeClosingInfo } from '@/lib/credit-cards/analytics'
import type { Account } from '@/lib/types'

interface CreditCardsSummaryListProps {
  cards: (Account & { institutions?: { name: string } | null })[]
  balanceByAccount: Map<string, number>
  todayStr: string
}

export function CreditCardsSummaryList({
  cards,
  balanceByAccount,
  todayStr
}: CreditCardsSummaryListProps) {
  return (
    <div className="bg-surface-1 border border-border rounded-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-base font-semibold text-text-primary">
              Tarjetas de Crédito
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-surface-2 text-text-secondary font-mono font-medium">
              {cards.length}
            </span>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Consumos corrientes y seguimiento de resúmenes
          </p>
        </div>

        <Link
          href="/cards"
          className="text-xs text-accent font-medium hover:underline inline-flex items-center gap-1"
        >
          Centro de tarjetas <ArrowRight size={12} />
        </Link>
      </div>

      {cards.length === 0 ? (
        <div className="p-6 text-center text-xs text-text-muted bg-surface-2/40 rounded-card border border-border-subtle">
          No tenés tarjetas de crédito configuradas.{' '}
          <Link href="/accounts/new" className="text-accent font-medium hover:underline">
            Agregar una tarjeta
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map((card) => {
            const rawBalance = balanceByAccount.get(card.id) ?? 0
            const currentDebt = Math.abs(rawBalance)
            const brand = detectCardBrand(card.name)
            const closing = computeClosingInfo(card.closing_day, todayStr)

            return (
              <div
                key={card.id}
                className="p-3.5 rounded-control bg-surface-0/60 border border-border hover:border-accent transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0">
                    <CardBrandSeal brand={brand} size="sm" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-text-primary truncate">
                        {card.name}
                      </p>
                      {card.institutions?.name && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-2 text-text-muted truncate">
                          {card.institutions.name}
                        </span>
                      )}
                    </div>
                    {closing ? (
                      <p className="text-[11px] text-text-muted flex items-center gap-1 mt-0.5">
                        <Calendar size={12} className="shrink-0" />
                        <span>{closing.label}</span>
                      </p>
                    ) : (
                      <p className="text-[11px] text-text-muted mt-0.5">
                        Cierre no configurado
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 self-stretch sm:self-center">
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider">
                      Saldo Corriente
                    </p>
                    <p className="font-mono amount text-sm font-semibold text-expense tabular-nums">
                      {formatMoney(currentDebt, card.currency_native)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Link
                      href={`/accounts/${card.id}/verify`}
                      title="Verificar resumen mensual"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-control text-xs font-medium bg-income/10 text-income hover:bg-income/20 transition"
                    >
                      <ClipboardCheck size={13} />
                      <span className="hidden sm:inline">Verificar</span>
                    </Link>
                    <Link
                      href={`/cards?cardId=${card.id}`}
                      title="Detalle de consumos y cuotas"
                      className="p-1.5 rounded-control text-text-muted hover:text-text-primary hover:bg-surface-2 border border-border transition"
                    >
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

