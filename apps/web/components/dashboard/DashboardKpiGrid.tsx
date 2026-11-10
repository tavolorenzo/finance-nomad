'use client'

import Link from 'next/link'
import { Wallet, TrendingUp, TrendingDown, Users, Scale, ArrowUpRight } from 'lucide-react'
import { formatMoney } from '@/lib/currency'
import type { CashFlowMetrics, LiabilitiesMetrics, ReceivablesMetrics } from '@/lib/dashboard/metrics'

interface DashboardKpiGridProps {
  netWorth: number
  displayCurrency: string
  cashFlow: CashFlowMetrics
  liabilities: LiabilitiesMetrics
  receivables: ReceivablesMetrics
  periodLabel: string
}

export function DashboardKpiGrid({
  netWorth,
  displayCurrency,
  cashFlow,
  liabilities,
  receivables,
  periodLabel
}: DashboardKpiGridProps) {
  const isCashFlowPositive = cashFlow.netCashFlow >= 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* KPI 1: Patrimonio Neto */}
      <div className="bg-surface-1 border border-border rounded-card p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-text-secondary mb-1">
          <span className="text-xs font-medium uppercase tracking-wider">Patrimonio Neto</span>
          <span className="p-1.5 rounded-full bg-accent/10 text-accent">
            <Wallet size={16} />
          </span>
        </div>
        <div>
          <p className="font-mono amount text-2xl lg:text-3xl font-semibold text-text-primary mt-1">
            {formatMoney(netWorth, displayCurrency)}
          </p>
          <p className="text-xs text-text-muted mt-1">
            Activos líquidos menos deuda consolidada
          </p>
        </div>
      </div>

      {/* KPI 2: Cash Flow del Período */}
      <div className="bg-surface-1 border border-border rounded-card p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-text-secondary mb-1">
          <span className="text-xs font-medium uppercase tracking-wider">
            Flujo ({periodLabel})
          </span>
          <span
            className={`p-1.5 rounded-full ${
              isCashFlowPositive ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense'
            }`}
          >
            {isCashFlowPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          </span>
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <p
              className={`font-mono amount text-2xl lg:text-3xl font-semibold mt-1 ${
                isCashFlowPositive ? 'text-income' : 'text-expense'
              }`}
            >
              {isCashFlowPositive ? '+' : ''}
              {formatMoney(cashFlow.netCashFlow, displayCurrency)}
            </p>
            {cashFlow.totalIncome > 0 && (
              <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-surface-2 text-text-secondary">
                {cashFlow.savingsRate}% ahorro
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-1 truncate">
            Ingresos {formatMoney(cashFlow.totalIncome, displayCurrency)} · Gastos propios {formatMoney(cashFlow.totalPersonalExpenses, displayCurrency)}
          </p>
        </div>
      </div>

      {/* KPI 3: Total Adeudado (Pasivos Híbridos) */}
      <div className="bg-surface-1 border border-border rounded-card p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-text-secondary mb-1">
          <span className="text-xs font-medium uppercase tracking-wider">Total Adeudado</span>
          <span className="p-1.5 rounded-full bg-expense/10 text-expense">
            <Scale size={16} />
          </span>
        </div>
        <div>
          <p className="font-mono amount text-2xl lg:text-3xl font-semibold text-expense mt-1">
            {formatMoney(liabilities.totalCurrentLiabilities, displayCurrency)}
          </p>
          <div className="flex items-center gap-1.5 mt-1 text-xs">
            {liabilities.cardFutureDebt > 0 ? (
              <span className="text-pending font-medium">
                +{formatMoney(liabilities.cardFutureDebt, displayCurrency)} cuotas futuras
              </span>
            ) : (
              <span className="text-text-muted">
                Tarjetas y préstamos al día
              </span>
            )}
          </div>
        </div>
      </div>

      {/* KPI 4: Por Cobrar a Terceros y Préstamos Otorgados */}
      <Link
        href="/people"
        className="group bg-surface-1 border border-border rounded-card p-4 flex flex-col justify-between hover:border-accent hover:bg-surface-2/60 transition block"
      >
        <div className="flex items-center justify-between text-text-secondary mb-1">
          <span className="text-xs font-medium uppercase tracking-wider group-hover:text-accent transition">
            Por Cobrar
          </span>
          <span className="p-1.5 rounded-full bg-accent/15 text-accent">
            <Users size={16} />
          </span>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <p className="font-mono amount text-2xl lg:text-3xl font-semibold text-text-primary group-hover:text-accent transition mt-1">
              {formatMoney(receivables.totalReceivables, displayCurrency)}
            </p>
            <ArrowUpRight size={16} className="text-text-muted group-hover:text-accent transition" />
          </div>
          <p className="text-xs text-text-muted mt-1 truncate">
            {receivables.thirdPartyPending > 0
              ? `${formatMoney(receivables.thirdPartyPending, displayCurrency)} en gastos compartidos`
              : 'Sin cuentas pendientes de terceros'}
          </p>
        </div>
      </Link>
    </div>
  )
}

