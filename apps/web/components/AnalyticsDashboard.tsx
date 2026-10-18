'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  TrendingDown,
  TrendingUp,
  Scale,
  Percent,
  Calendar,
  Layers,
  Globe2,
  Wallet,
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
  Plus
} from 'lucide-react'
import { formatMoney } from '@/lib/currency'
import { useLedger } from '@/lib/ledger/ledger-context'
import {
  type AnalyticsPeriod,
  filterTransactionsByPeriod,
  getPeriodRange,
  computeAnalyticsKPIs,
  computeCategoryBreakdown,
  computeMonthlyCashflow,
  computeCurrencyBreakdown
} from '@/lib/analytics'
import type { MasterTransaction, Category, Account } from '@/lib/types'

interface AnalyticsDashboardProps {
  initialTransactions: MasterTransaction[]
  categories: Category[]
  accounts: Account[]
  displayCurrency: string
}

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

export function AnalyticsDashboard({
  initialTransactions,
  categories,
  accounts,
  displayCurrency
}: AnalyticsDashboardProps) {
  const { recentTransactions: localTransactions } = useLedger()
  const [period, setPeriod] = useState<AnalyticsPeriod>('this_month')

  // Combinar transacciones de servidor con las mutadas localmente en memoria
  const allTransactions = useMemo(() => {
    const map = new Map<string, MasterTransaction>()
    for (const t of initialTransactions) map.set(t.id, t)
    for (const t of localTransactions) map.set(t.id, t)
    return Array.from(map.values())
  }, [initialTransactions, localTransactions])

  const categoryMap = useMemo(() => {
    return new Map<string, Category>(categories.map((c) => [c.id, c]))
  }, [categories])

  const accountMap = useMemo(() => {
    return new Map<string, Account>(accounts.map((a) => [a.id, a]))
  }, [accounts])

  const periodRange = useMemo(() => getPeriodRange(period), [period])
  const filteredTransactions = useMemo(
    () => filterTransactionsByPeriod(allTransactions, period),
    [allTransactions, period]
  )

  const kpis = useMemo(
    () => computeAnalyticsKPIs(filteredTransactions, periodRange.days, categoryMap),
    [filteredTransactions, periodRange.days, categoryMap]
  )

  const categoryBreakdown = useMemo(
    () => computeCategoryBreakdown(filteredTransactions, categories),
    [filteredTransactions, categories]
  )

  const monthlyCashflow = useMemo(
    () => computeMonthlyCashflow(allTransactions),
    [allTransactions]
  )

  const currencyBreakdown = useMemo(
    () => computeCurrencyBreakdown(filteredTransactions),
    [filteredTransactions]
  )

  // Desglose por tipo de cuenta (Tarjeta, Bancaria, Efectivo)
  const accountTypeBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    let total = 0
    for (const t of filteredTransactions) {
      if (t.status !== 'COMPLETED' || t.type !== 'OUTCOME') continue
      const acc = accountMap.get(t.account_id)
      const type = acc?.type ?? 'checking'
      const amt = Number(t.amount_account || 0)
      map.set(type, (map.get(type) ?? 0) + amt)
      total += amt
    }

    const labels: Record<string, string> = {
      credit_card: 'Tarjetas de crédito',
      checking: 'Cuentas corrientes',
      savings: 'Cajas de ahorro',
      cash: 'Efectivo (Cash)',
      investing: 'Inversiones'
    }

    return Array.from(map.entries())
      .map(([type, amount]) => ({
        type,
        label: labels[type] || type,
        amount: Math.round(amount * 100) / 100,
        percentage: total > 0 ? Math.round((amount / total) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [filteredTransactions, accountMap])

  // Máximo para escala del gráfico de barras de cashflow
  const maxCashflow = useMemo(() => {
    let max = 100
    for (const m of monthlyCashflow) {
      if (m.income > max) max = m.income
      if (m.expense > max) max = m.expense
    }
    return max
  }, [monthlyCashflow])

  const getColorClasses = (color?: string | null) => {
    switch (color) {
      case 'income':
        return { text: 'text-income', bg: 'bg-income', fill: 'var(--income)' }
      case 'expense':
        return { text: 'text-expense', bg: 'bg-expense', fill: 'var(--expense)' }
      case 'pending':
        return { text: 'text-pending', bg: 'bg-pending', fill: 'var(--pending)' }
      case 'accent':
      default:
        return { text: 'text-accent', bg: 'bg-accent', fill: 'var(--accent)' }
    }
  }

  return (
    <div className="space-y-6">
      {/* Selector de Período */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-surface-1 border border-border rounded-control w-fit text-xs">
        <button
          type="button"
          onClick={() => setPeriod('this_month')}
          className={`px-3 py-1.5 rounded-control transition font-medium ${
            period === 'this_month'
              ? 'bg-accent text-[color:var(--on-accent)]'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Este mes
        </button>
        <button
          type="button"
          onClick={() => setPeriod('last_3_months')}
          className={`px-3 py-1.5 rounded-control transition font-medium ${
            period === 'last_3_months'
              ? 'bg-accent text-[color:var(--on-accent)]'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Últimos 3 meses
        </button>
        <button
          type="button"
          onClick={() => setPeriod('last_6_months')}
          className={`px-3 py-1.5 rounded-control transition font-medium ${
            period === 'last_6_months'
              ? 'bg-accent text-[color:var(--on-accent)]'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Últimos 6 meses
        </button>
        <button
          type="button"
          onClick={() => setPeriod('this_year')}
          className={`px-3 py-1.5 rounded-control transition font-medium ${
            period === 'this_year'
              ? 'bg-accent text-[color:var(--on-accent)]'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Este año
        </button>
        <button
          type="button"
          onClick={() => setPeriod('all')}
          className={`px-3 py-1.5 rounded-control transition font-medium ${
            period === 'all'
              ? 'bg-accent text-[color:var(--on-accent)]'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Histórico
        </button>
      </div>

      {/* Grid de 5 KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* KPI 1: Gasto Total */}
        <div className="bg-surface-1 border border-border rounded-card p-4 space-y-1">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-medium">Gastos</span>
            <TrendingDown size={16} className="text-expense" />
          </div>
          <p className="font-mono amount text-xl font-semibold text-expense tabular-nums">
            {formatMoney(kpis.totalExpense, displayCurrency)}
          </p>
          <p className="text-[11px] text-text-muted">En el período elegido</p>
        </div>

        {/* KPI 2: Ingresos Totales */}
        <div className="bg-surface-1 border border-border rounded-card p-4 space-y-1">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-medium">Ingresos</span>
            <TrendingUp size={16} className="text-income" />
          </div>
          <p className="font-mono amount text-xl font-semibold text-income tabular-nums">
            {formatMoney(kpis.totalIncome, displayCurrency)}
          </p>
          <p className="text-[11px] text-text-muted">Cobros y salarios</p>
        </div>

        {/* KPI 3: Balance Neto */}
        <div className="bg-surface-1 border border-border rounded-card p-4 space-y-1">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-medium">Flujo Neto</span>
            <Scale size={16} className="text-accent" />
          </div>
          <p
            className={`font-mono amount text-xl font-semibold tabular-nums ${
              kpis.netSavings >= 0 ? 'text-income' : 'text-expense'
            }`}
          >
            {kpis.netSavings >= 0 ? '+' : ''}
            {formatMoney(kpis.netSavings, displayCurrency)}
          </p>
          <p className="text-[11px] text-text-muted">
            {kpis.netSavings >= 0 ? 'Superávit acumulado' : 'Déficit en el período'}
          </p>
        </div>

        {/* KPI 4: Tasa de Ahorro */}
        <div className="bg-surface-1 border border-border rounded-card p-4 space-y-1">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-medium">Tasa de Ahorro</span>
            <Percent size={16} className="text-accent" />
          </div>
          <p className="font-mono amount text-xl font-semibold text-text-primary tabular-nums">
            {kpis.savingsRate}%
          </p>
          <p className="text-[11px] text-text-muted">Del ingreso retenido</p>
        </div>

        {/* KPI 5: Gasto Diario Promedio */}
        <div className="bg-surface-1 border border-border rounded-card p-4 space-y-1 col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-medium">Promedio Diario</span>
            <Calendar size={16} className="text-text-muted" />
          </div>
          <p className="font-mono amount text-xl font-semibold text-text-primary tabular-nums">
            {formatMoney(kpis.dailyAverage, displayCurrency)}
          </p>
          <p className="text-[11px] text-text-muted">Por cada día ({periodRange.days}d)</p>
        </div>
      </div>

      {/* Grid Principal de Visualización */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Gastos por Categoría */}
        <div className="bg-surface-1 border border-border rounded-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-base font-semibold text-text-primary flex items-center gap-2">
                <Layers size={18} className="text-accent" />
                Gastos por Categoría
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                Distribución proporcional de egresos en {displayCurrency}
              </p>
            </div>
            <Link
              href="/categories"
              className="text-xs text-accent font-medium hover:underline"
            >
              Gestionar →
            </Link>
          </div>

          {categoryBreakdown.length > 0 ? (
            <div className="space-y-3 pt-2">
              {/* Barra Stacked Visual */}
              <div className="h-3 w-full bg-surface-2 rounded-full overflow-hidden flex">
                {categoryBreakdown.map((cat) => {
                  const color = getColorClasses(cat.color)
                  return (
                    <div
                      key={cat.categoryId}
                      style={{ width: `${Math.max(1, cat.percentage)}%` }}
                      className={`h-full ${color.bg} transition-all duration-300 border-r border-surface-1 last:border-r-0`}
                      title={`${cat.name}: ${cat.percentage}%`}
                    />
                  )
                })}
              </div>

              {/* Lista Desglosada con Barras de Progreso */}
              <div className="divide-y divide-border pt-1">
                {categoryBreakdown.map((cat) => {
                  const IconComp = ICON_MAP[cat.icon] || Tag
                  const color = getColorClasses(cat.color)

                  return (
                    <div
                      key={cat.categoryId}
                      className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className={`p-1.5 rounded-control ${color.bg}/20 ${color.text} shrink-0`}>
                          <IconComp size={15} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-text-primary truncate">{cat.name}</span>
                            <span className="font-mono text-text-secondary ml-2 font-medium">
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
                        {formatMoney(cat.total, displayCurrency)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-text-muted bg-surface-2/40 rounded-card border border-border-subtle">
              No registraste gastos categorizados en este período.
            </div>
          )}
        </div>

        {/* Gráfico 2: Evolución Mensual (Flujo de Caja) */}
        <div className="bg-surface-1 border border-border rounded-card p-5 space-y-4">
          <div>
            <p className="font-display text-base font-semibold text-text-primary flex items-center gap-2">
              <TrendingUp size={18} className="text-income" />
              Flujo de Caja Mensual
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              Comparativa de Ingresos (<span className="text-income">verde</span>) vs. Gastos (
              <span className="text-expense">rojo</span>)
            </p>
          </div>

          {monthlyCashflow.length > 0 ? (
            <div className="pt-2">
              {/* Gráfico de barras SVG puro */}
              <div className="h-48 w-full flex items-end justify-between gap-2 pt-6 pb-2 border-b border-border">
                {monthlyCashflow.map((m) => {
                  const incomeHeight = Math.max(4, Math.round((m.income / maxCashflow) * 150))
                  const expenseHeight = Math.max(4, Math.round((m.expense / maxCashflow) * 150))

                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                      <div className="w-full flex items-end justify-center gap-1 h-full">
                        {/* Barra Ingresos */}
                        <div
                          style={{ height: `${incomeHeight}px` }}
                          className="w-1/2 max-w-[16px] bg-income rounded-t transition-all group-hover:opacity-80"
                          title={`Ingresos: ${formatMoney(m.income, displayCurrency)}`}
                        />
                        {/* Barra Gastos */}
                        <div
                          style={{ height: `${expenseHeight}px` }}
                          className="w-1/2 max-w-[16px] bg-expense rounded-t transition-all group-hover:opacity-80"
                          title={`Gastos: ${formatMoney(m.expense, displayCurrency)}`}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-text-muted mt-1 truncate">
                        {m.label}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Leyenda */}
              <div className="flex items-center justify-between text-xs text-text-muted pt-3">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-income" />
                    <span>Ingresos</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-expense" />
                    <span>Gastos</span>
                  </span>
                </div>
                <span className="text-[11px]">Últimos meses registrados</span>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-text-muted bg-surface-2/40 rounded-card border border-border-subtle">
              No hay movimientos históricos suficientes para graficar el flujo.
            </div>
          )}
        </div>

        {/* Gráfico 3: Desglose por Divisa Original */}
        <div className="bg-surface-1 border border-border rounded-card p-5 space-y-4">
          <div>
            <p className="font-display text-base font-semibold text-text-primary flex items-center gap-2">
              <Globe2 size={18} className="text-accent" />
              Gastos por Moneda de Origen
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              Consumos efectuados en las monedas locales de cada país
            </p>
          </div>

          {currencyBreakdown.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {currencyBreakdown.map((item) => (
                <div
                  key={item.currency}
                  className="p-3 bg-surface-2/50 border border-border rounded-control flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-accent px-1.5 py-0.5 rounded bg-accent/10">
                      {item.currency}
                    </span>
                    <p className="text-[11px] text-text-muted mt-1">
                      {item.count} {item.count === 1 ? 'movimiento' : 'movimientos'}
                    </p>
                  </div>
                  <span className="font-mono amount text-sm font-semibold tabular-nums text-text-primary">
                    {formatMoney(item.total, item.currency)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-text-muted bg-surface-2/40 rounded-card border border-border-subtle">
              No hay gastos en este período.
            </div>
          )}
        </div>

        {/* Gráfico 4: Métodos de Pago y Cuentas */}
        <div className="bg-surface-1 border border-border rounded-card p-5 space-y-4">
          <div>
            <p className="font-display text-base font-semibold text-text-primary flex items-center gap-2">
              <Wallet size={18} className="text-pending" />
              Gastos por Medio de Pago
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              Distribución entre tarjetas de crédito, cuentas bancarias y efectivo
            </p>
          </div>

          {accountTypeBreakdown.length > 0 ? (
            <div className="space-y-3 pt-1">
              {accountTypeBreakdown.map((item) => (
                <div key={item.type} className="space-y-1 text-xs">
                  <div className="flex justify-between items-center text-text-secondary">
                    <span>{item.label}</span>
                    <span className="font-mono tabular-nums font-semibold text-text-primary">
                      {formatMoney(item.amount, displayCurrency)} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-surface-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-pending transition-all duration-300"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-text-muted bg-surface-2/40 rounded-card border border-border-subtle">
              No hay egresos en cuentas para el período actual.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
