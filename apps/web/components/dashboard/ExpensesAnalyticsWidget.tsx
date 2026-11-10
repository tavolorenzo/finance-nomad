'use client'

import Link from 'next/link'
import {
  Tag,
  ShoppingCart,
  Home,
  Plane,
  Utensils,
  Ticket,
  HeartPulse,
  Laptop,
  Receipt,
  Car,
  Coffee,
  Dumbbell,
  Book,
  Users,
  User,
  ArrowRight
} from 'lucide-react'
import { formatMoney } from '@/lib/currency'
import type { CategorySpendingItem, CashFlowMetrics } from '@/lib/dashboard/metrics'

const ICON_MAP: Record<string, any> = {
  tag: Tag,
  'shopping-cart': ShoppingCart,
  home: Home,
  plane: Plane,
  utensils: Utensils,
  coffee: Coffee,
  ticket: Ticket,
  'heart-pulse': HeartPulse,
  laptop: Laptop,
  receipt: Receipt,
  car: Car,
  dumbbell: Dumbbell,
  book: Book
}

function getCategoryColor(colorName?: string): { bg: string; text: string } {
  switch (colorName) {
    case 'emerald':
      return { bg: 'bg-emerald-500', text: 'text-emerald-500' }
    case 'blue':
      return { bg: 'bg-blue-500', text: 'text-blue-500' }
    case 'purple':
      return { bg: 'bg-purple-500', text: 'text-purple-500' }
    case 'amber':
      return { bg: 'bg-amber-500', text: 'text-amber-500' }
    case 'rose':
      return { bg: 'bg-rose-500', text: 'text-rose-500' }
    case 'indigo':
      return { bg: 'bg-indigo-500', text: 'text-indigo-500' }
    case 'cyan':
      return { bg: 'bg-cyan-500', text: 'text-cyan-500' }
    case 'orange':
      return { bg: 'bg-orange-500', text: 'text-orange-500' }
    default:
      return { bg: 'bg-accent', text: 'text-accent' }
  }
}

interface ExpensesAnalyticsWidgetProps {
  categoryItems: CategorySpendingItem[]
  cashFlow: CashFlowMetrics
  displayCurrency: string
  periodLabel: string
}

export function ExpensesAnalyticsWidget({
  categoryItems,
  cashFlow,
  displayCurrency,
  periodLabel
}: ExpensesAnalyticsWidgetProps) {
  const totalOutlay = cashFlow.totalPersonalExpenses + cashFlow.totalThirdPartyExpenses
  const personalPct =
    totalOutlay > 0 ? Math.round((cashFlow.totalPersonalExpenses / totalOutlay) * 100) : 100
  const thirdPartyPct = totalOutlay > 0 ? 100 - personalPct : 0

  return (
    <div className="bg-surface-1 border border-border rounded-card p-5 space-y-5">
      {/* Encabezado con link al análisis completo */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-base font-semibold text-text-primary">
            Radiografía de Gastos ({periodLabel})
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Gastos propios por categoría y división con terceros
          </p>
        </div>
        <Link
          href="/analytics"
          className="text-xs text-accent font-medium hover:underline inline-flex items-center gap-1"
        >
          Ver analíticas <ArrowRight size={12} />
        </Link>
      </div>

      {/* 1. Propios vs. Terceros (Gasto Compartido) */}
      <div className="p-3.5 rounded-control bg-surface-0/60 border border-border space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-text-primary font-medium">
            <User size={14} className="text-accent" />
            <span>Consumo Propio ({personalPct}%)</span>
          </div>
          <div className="flex items-center gap-1.5 text-text-secondary font-medium">
            <Users size={14} className="text-pending" />
            <span>Por cuenta de Terceros ({thirdPartyPct}%)</span>
          </div>
        </div>

        {/* Barra dividida proporcional */}
        <div className="h-2 w-full bg-surface-2 rounded-full overflow-hidden flex">
          <div
            style={{ width: `${personalPct}%` }}
            className="h-full bg-accent transition-all duration-300"
            title={`Gastos propios: ${formatMoney(cashFlow.totalPersonalExpenses, displayCurrency)}`}
          />
          <div
            style={{ width: `${thirdPartyPct}%` }}
            className="h-full bg-pending transition-all duration-300"
            title={`Gastos de terceros: ${formatMoney(cashFlow.totalThirdPartyExpenses, displayCurrency)}`}
          />
        </div>

        <div className="flex items-center justify-between text-xs font-mono tabular-nums">
          <span className="text-text-primary font-semibold">
            {formatMoney(cashFlow.totalPersonalExpenses, displayCurrency)}
          </span>
          <span className="text-text-muted">
            {formatMoney(cashFlow.totalThirdPartyExpenses, displayCurrency)}
          </span>
        </div>
      </div>

      {/* 2. Gráfico y Desglose de Gastos Personales por Categoría */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">
            Gastos Personales por Categoría
          </p>
          <span className="text-xs text-text-muted">
            Top {Math.min(5, categoryItems.length)}
          </span>
        </div>

        {categoryItems.length === 0 ? (
          <div className="p-5 text-center text-xs text-text-muted bg-surface-2/40 rounded-control border border-border-subtle">
            No registraste gastos personales en este período.
          </div>
        ) : (
          <>
            {/* Barra apilada multicolor */}
            <div className="h-2 w-full bg-surface-2 rounded-full overflow-hidden flex">
              {categoryItems.slice(0, 5).map((cat) => {
                const color = getCategoryColor(cat.color)
                return (
                  <div
                    key={cat.categoryId}
                    style={{ width: `${Math.max(2, cat.percentage)}%` }}
                    className={`h-full ${color.bg} transition-all duration-300 border-r border-surface-1 last:border-r-0`}
                    title={`${cat.name}: ${cat.percentage}%`}
                  />
                )
              })}
            </div>

            {/* Lista detallada con barritas de porcentaje */}
            <div className="divide-y divide-border pt-1">
              {categoryItems.slice(0, 5).map((cat) => {
                const Icon = ICON_MAP[cat.icon] || Tag
                const color = getCategoryColor(cat.color)

                return (
                  <div
                    key={cat.categoryId}
                    className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className={`p-1.5 rounded-control ${color.bg}/15 ${color.text} shrink-0`}>
                        <Icon size={14} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-text-primary truncate">
                            {cat.name}
                          </span>
                          <span className="font-mono text-text-muted text-[11px] ml-2">
                            {cat.percentage}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-surface-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${color.bg} transition-all duration-300`}
                            style={{ width: `${cat.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <span className="font-mono tabular-nums text-text-primary font-semibold shrink-0 ml-2">
                      {formatMoney(cat.amount, displayCurrency)}
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

