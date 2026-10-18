import { describe, it, expect } from 'vitest'
import {
  getPeriodRange,
  filterTransactionsByPeriod,
  computeAnalyticsKPIs,
  computeCategoryBreakdown,
  computeMonthlyCashflow,
  computeCurrencyBreakdown
} from './analytics'
import type { MasterTransaction, Category } from './types'

describe('analytics utilities', () => {
  const dummyCategories: Category[] = [
    { id: 'cat-1', name: 'Supermercado', icon: 'shopping-cart', color: 'accent' },
    { id: 'cat-2', name: 'Alquiler', icon: 'home', color: 'expense' }
  ]
  const catMap = new Map(dummyCategories.map((c) => [c.id, c]))

  const sampleTransactions: MasterTransaction[] = [
    {
      id: 'tx-1',
      parent_transaction_id: null,
      date: '2026-10-01',
      type: 'OUTCOME',
      amount_original: 100,
      currency_original: 'EUR',
      fee_amount: 0,
      exchange_rate: 1,
      rate_overridden: false,
      amount_account: 100,
      currency_account: 'EUR',
      institution_id: 'inst-1',
      account_id: 'acc-1',
      category_id: 'cat-1',
      person_id: null,
      installment_current: 1,
      installment_total: 1,
      status: 'COMPLETED',
      notes: 'Supermercado semanal',
      settled_at: null
    },
    {
      id: 'tx-2',
      parent_transaction_id: null,
      date: '2026-10-05',
      type: 'OUTCOME',
      amount_original: 300,
      currency_original: 'USD',
      fee_amount: 0,
      exchange_rate: 0.9,
      rate_overridden: false,
      amount_account: 270,
      currency_account: 'EUR',
      institution_id: 'inst-1',
      account_id: 'acc-1',
      category_id: 'cat-2',
      person_id: null,
      installment_current: 1,
      installment_total: 1,
      status: 'COMPLETED',
      notes: 'Alquiler octubre',
      settled_at: null
    },
    {
      id: 'tx-3',
      parent_transaction_id: null,
      date: '2026-10-10',
      type: 'INCOME',
      amount_original: 1000,
      currency_original: 'EUR',
      fee_amount: 0,
      exchange_rate: 1,
      rate_overridden: false,
      amount_account: 1000,
      currency_account: 'EUR',
      institution_id: 'inst-1',
      account_id: 'acc-1',
      category_id: null,
      person_id: null,
      installment_current: 1,
      installment_total: 1,
      status: 'COMPLETED',
      notes: 'Sueldo remoto',
      settled_at: null
    },
    {
      id: 'tx-4',
      parent_transaction_id: null,
      date: '2026-11-01',
      type: 'OUTCOME',
      amount_original: 150,
      currency_original: 'EUR',
      fee_amount: 0,
      exchange_rate: 1,
      rate_overridden: false,
      amount_account: 150,
      currency_account: 'EUR',
      institution_id: 'inst-1',
      account_id: 'acc-1',
      category_id: 'cat-1',
      person_id: null,
      installment_current: 2,
      installment_total: 3,
      status: 'PENDING',
      notes: 'Cuota futura diferida',
      settled_at: null
    }
  ]

  it('calcula rangos de fechas por período correctamente', () => {
    const fixedToday = new Date('2026-10-15T12:00:00Z')
    const range = getPeriodRange('this_month', fixedToday)
    expect(range.start).toBe('2026-10-01')
    expect(range.end).toBe('2026-10-15')
    expect(range.days).toBe(15)
  })

  it('computa KPIs correctamente excluyendo pendientes', () => {
    const kpis = computeAnalyticsKPIs(sampleTransactions, 15, catMap)
    expect(kpis.totalExpense).toBe(370) // 100 + 270
    expect(kpis.totalIncome).toBe(1000)
    expect(kpis.netSavings).toBe(630)
    expect(kpis.savingsRate).toBe(63) // (1000 - 370) / 1000 * 100 = 63%
    expect(kpis.topCategory?.name).toBe('Alquiler')
    expect(kpis.topCategory?.amount).toBe(270)
  })

  it('desglosa gastos por categoría ordenados por monto', () => {
    const breakdown = computeCategoryBreakdown(sampleTransactions, dummyCategories)
    expect(breakdown).toHaveLength(2)
    expect(breakdown[0].name).toBe('Alquiler')
    expect(breakdown[0].total).toBe(270)
    expect(breakdown[1].name).toBe('Supermercado')
    expect(breakdown[1].total).toBe(100)
  })

  it('computa flujo mensual de ingresos y egresos', () => {
    const cashflow = computeMonthlyCashflow(sampleTransactions)
    expect(cashflow).toHaveLength(1)
    expect(cashflow[0].month).toBe('2026-10')
    expect(cashflow[0].income).toBe(1000)
    expect(cashflow[0].expense).toBe(370)
    expect(cashflow[0].net).toBe(630)
  })

  it('desglosa gastos por divisa original', () => {
    const currencies = computeCurrencyBreakdown(sampleTransactions)
    expect(currencies).toHaveLength(2)
    const eur = currencies.find((c) => c.currency === 'EUR')
    const usd = currencies.find((c) => c.currency === 'USD')
    expect(eur?.total).toBe(100)
    expect(usd?.total).toBe(300)
  })
})
