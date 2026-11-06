import { describe, it, expect } from 'vitest'
import {
  buildCustomRatesMap,
  convertAmountSync,
  computeBudgetMonthSummary,
  evaluateDueStatus
} from './calculations'
import type {
  BudgetEstimate,
  LoanWithInstallments,
  MasterTransaction,
  Person
} from '@/lib/types'

describe('budget calculations', () => {
  it('buildCustomRatesMap y convertAmountSync convierten entre divisas con tasas manuales o de mercado', () => {
    const ratesMap = buildCustomRatesMap(
      'USD',
      [
        {
          code: 'UYU',
          symbol: '$U',
          name: 'Peso Uruguayo',
          rate_mode: 'manual',
          custom_rate_against_global: 40
        }
      ],
      { USD_EUR: 0.9, EUR_USD: 1.1111 }
    )

    expect(convertAmountSync(100, 'USD', 'UYU', ratesMap, 'USD')).toBe(4000)
    expect(convertAmountSync(4000, 'UYU', 'USD', ratesMap, 'USD')).toBe(100)
    expect(convertAmountSync(100, 'USD', 'EUR', ratesMap, 'USD')).toBe(90)
  })

  it('evaluateDueStatus determina estados cubierto, hoy, vencido y próximo', () => {
    const refDate = new Date(2026, 10, 10) // 10 de noviembre de 2026
    expect(evaluateDueStatus(15, true, '2026-11', refDate)).toEqual({
      dueStatus: 'covered',
      daysUntilDue: null
    })
    expect(evaluateDueStatus(10, false, '2026-11', refDate)).toEqual({
      dueStatus: 'due_today',
      daysUntilDue: 0
    })
    expect(evaluateDueStatus(5, false, '2026-11', refDate)).toEqual({
      dueStatus: 'overdue',
      daysUntilDue: -5
    })
    expect(evaluateDueStatus(18, false, '2026-11', refDate)).toEqual({
      dueStatus: 'upcoming',
      daysUntilDue: 8
    })
  })

  it('computeBudgetMonthSummary cruza estimados con gastos reales, excluyendo TRANSFER, ADJUSTMENT y terceros, e integra cuotas', () => {
    const people: Person[] = [
      { id: 'p-personal', name: 'Personal', phone: null },
      { id: 'p-third', name: 'Gladys', phone: null }
    ]

    const estimates: BudgetEstimate[] = [
      {
        id: 'est-rent',
        name: 'Alquiler',
        type: 'EXPENSE_ESTIMATE',
        estimated_amount: 1000,
        currency: 'USD',
        category_id: 'cat-housing',
        due_day: 10,
        preferred_account_id: 'acc-usd',
        is_active: true
      },
      {
        id: 'est-salary',
        name: 'Sueldo Remoto',
        type: 'INCOME_ESTIMATE',
        estimated_amount: 3000,
        currency: 'USD',
        category_id: 'cat-salary',
        due_day: 5,
        preferred_account_id: 'acc-usd',
        is_active: true
      }
    ]

    const transactions: MasterTransaction[] = [
      // Gasto propio válido en Alquiler (600 USD)
      {
        id: 'tx-1',
        parent_transaction_id: null,
        date: '2026-11-05',
        type: 'OUTCOME',
        amount_original: 600,
        currency_original: 'USD',
        fee_amount: 0,
        exchange_rate: 1,
        rate_overridden: false,
        amount_account: 600,
        currency_account: 'USD',
        institution_id: 'inst-1',
        account_id: 'acc-usd',
        category_id: 'cat-housing',
        person_id: 'p-personal',
        installment_current: 1,
        installment_total: 1,
        status: 'COMPLETED',
        notes: 'Adelanto alquiler',
        settled_at: null
      },
      // Gasto de tercero en la misma categoría -> debe ignorarse
      {
        id: 'tx-2',
        parent_transaction_id: null,
        date: '2026-11-06',
        type: 'OUTCOME',
        amount_original: 400,
        currency_original: 'USD',
        fee_amount: 0,
        exchange_rate: 1,
        rate_overridden: false,
        amount_account: 400,
        currency_account: 'USD',
        institution_id: 'inst-1',
        account_id: 'acc-usd',
        category_id: 'cat-housing',
        person_id: 'p-third',
        installment_current: 1,
        installment_total: 1,
        status: 'COMPLETED',
        notes: 'Gasto Gladys',
        settled_at: null
      },
      // Transferencia o Ajuste en la misma categoría -> nunca debe computar como gasto
      {
        id: 'tx-3',
        parent_transaction_id: null,
        date: '2026-11-07',
        type: 'TRANSFER',
        amount_original: 500,
        currency_original: 'USD',
        fee_amount: 0,
        exchange_rate: 1,
        rate_overridden: false,
        amount_account: 500,
        currency_account: 'USD',
        institution_id: 'inst-1',
        account_id: 'acc-usd',
        category_id: 'cat-housing',
        person_id: null,
        installment_current: 1,
        installment_total: 1,
        status: 'COMPLETED',
        notes: 'Transferencia interna',
        settled_at: null
      },
      // Cuota de tarjeta de crédito en el período contable 2026-11
      {
        id: 'tx-card-quota',
        parent_transaction_id: 'parent-1',
        date: '2026-11-15',
        accounting_period: '2026-11',
        type: 'OUTCOME',
        amount_original: 120,
        currency_original: 'USD',
        fee_amount: 0,
        exchange_rate: 1,
        rate_overridden: false,
        amount_account: 120,
        currency_account: 'USD',
        institution_id: 'inst-1',
        account_id: 'acc-card',
        category_id: 'cat-tech',
        person_id: null,
        installment_current: 2,
        installment_total: 6,
        status: 'PENDING',
        notes: 'MacBook Pro',
        settled_at: null
      }
    ]

    const loans: LoanWithInstallments[] = [
      {
        id: 'loan-1',
        name: 'Préstamo Auto Itaú',
        principal: 5000,
        currency: 'USD',
        direction: 'BORROWED',
        tea_rate: 0.12,
        includes_vat_22: true,
        total_installments: 12,
        start_date: '2026-10-01',
        status: 'ACTIVE',
        is_active: true,
        installments: [
          {
            id: 'inst-2',
            loan_id: 'loan-1',
            period: 2,
            installment_amount: 250,
            interest: 40,
            payment: 210,
            balance: 4580,
            due_date: '2026-11-20',
            paid: false
          }
        ]
      }
    ]

    const summary = computeBudgetMonthSummary({
      period: '2026-11',
      estimates,
      transactions,
      loans,
      people,
      displayCurrency: 'USD',
      ratesMap: { USD_USD: 1 },
      referenceDate: new Date(2026, 10, 8)
    })

    expect(summary.expenseEstimates).toHaveLength(1)
    expect(summary.expenseEstimates[0].realAmountInEstimateCurrency).toBe(600)
    expect(summary.expenseEstimates[0].coveragePct).toBe(60)
    expect(summary.expenseEstimates[0].isCovered).toBe(false)

    // Compromisos: 1 cuota de tarjeta (120) + 1 cuota de préstamo (250) = 370
    expect(summary.commitments).toHaveLength(2)
    expect(summary.totalCommitmentsDisplay).toBe(370)

    // Margen proyectado: 3000 - (1000 + 370) = 1630
    expect(summary.projectedSavingsDisplay).toBe(1630)
  })
})
