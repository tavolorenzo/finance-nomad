import { describe, it, expect } from 'vitest'
import {
  detectCardBrand,
  computeClosingInfo,
  computeCardPeriodSummary,
  computeInstallmentsRunoff,
  extractActiveInstallmentPlans,
  computeCardBreakdowns,
  type CardAccountWithInstitution
} from './analytics'
import type { Category, MasterTransaction, Person } from '@/lib/types'

const mockConvert = (amount: number, from: string, to: string) => {
  if (from === to) return amount
  if (from === 'UYU' && to === 'USD') return amount / 40
  if (from === 'USD' && to === 'UYU') return amount * 40
  return amount
}

const mockCard: CardAccountWithInstitution = {
  id: 'card-1',
  institution_id: 'inst-1',
  name: 'Visa Platinum Itaú',
  type: 'credit_card',
  currency_native: 'UYU',
  credit_limit: 100000,
  closing_day: 18,
  is_active: true,
  institutions: { id: 'inst-1', name: 'Itaú', is_active: true }
}

const mockPeople = new Map<string, Person>([
  ['p-personal', { id: 'p-personal', name: 'Personal', phone: null, is_active: true }],
  ['p-gladys', { id: 'p-gladys', name: 'Gladys', phone: '+59899111222', is_active: true }]
])

const mockCategories = new Map<string, Category>([
  ['cat-tech', { id: 'cat-tech', name: 'Tecnología', is_active: true }],
  ['cat-food', { id: 'cat-food', name: 'Supermercado', is_active: true }]
])

function makeTx(overrides: Partial<MasterTransaction>): MasterTransaction {
  return {
    id: 'tx-1',
    parent_transaction_id: null,
    date: '2026-11-02',
    type: 'OUTCOME',
    amount_original: 4000,
    currency_original: 'UYU',
    fee_amount: 0,
    exchange_rate: 1,
    rate_overridden: false,
    amount_account: 4000,
    currency_account: 'UYU',
    institution_id: 'inst-1',
    account_id: 'card-1',
    category_id: 'cat-food',
    person_id: 'p-personal',
    installment_current: 1,
    installment_total: 1,
    status: 'COMPLETED',
    notes: 'Compra test',
    settled_at: null,
    accounting_period: '2026-11',
    is_verified: false,
    ...overrides
  }
}

describe('detectCardBrand', () => {
  it('detecta VISA, AMEX, MASTERCARD y MAESTRO sin importar mayúsculas/minúsculas', () => {
    expect(detectCardBrand('Visa Gold Itaú')).toBe('VISA')
    expect(detectCardBrand('Tarjeta AMEX Platinum')).toBe('AMEX')
    expect(detectCardBrand('Scotiabank American Express')).toBe('AMEX')
    expect(detectCardBrand('BROU Mastercard Black')).toBe('MASTERCARD')
    expect(detectCardBrand('Master Card Internacional')).toBe('MASTERCARD')
    expect(detectCardBrand('Tarjeta Maestro Débito/Crédito')).toBe('MAESTRO')
    expect(detectCardBrand('OCA Blue')).toBeNull()
  })
})

describe('computeClosingInfo', () => {
  it('calcula días restantes dentro del mismo mes y cuando ya pasó el día de cierre', () => {
    const infoBefore = computeClosingInfo(18, '2026-11-10')
    expect(infoBefore?.daysUntilClosing).toBe(8)
    expect(infoBefore?.nextClosingDate).toBe('2026-11-18')

    const infoToday = computeClosingInfo(18, '2026-11-18')
    expect(infoToday?.daysUntilClosing).toBe(0)
    expect(infoToday?.label).toContain('Cierra hoy')

    const infoAfter = computeClosingInfo(18, '2026-11-20')
    expect(infoAfter?.nextClosingDate).toBe('2026-12-18')
    expect(infoAfter?.daysUntilClosing).toBe(28)
  })
})

describe('computeCardPeriodSummary', () => {
  it('separa gastos propios vs terceros, bimonetario, compromisos futuros y límite disponible', () => {
    const txs: MasterTransaction[] = [
      makeTx({
        id: 't1',
        amount_original: 12000,
        currency_original: 'UYU',
        amount_account: 12000,
        person_id: 'p-personal',
        accounting_period: '2026-11',
        is_verified: true
      }),
      makeTx({
        id: 't2',
        amount_original: 100,
        currency_original: 'USD',
        amount_account: 4000,
        currency_account: 'UYU',
        person_id: 'p-gladys',
        accounting_period: '2026-11',
        is_verified: false
      }),
      makeTx({
        id: 't3',
        parent_transaction_id: 'plan-1',
        amount_original: 5000,
        currency_original: 'UYU',
        amount_account: 5000,
        installment_current: 2,
        installment_total: 3,
        status: 'PENDING',
        date: '2026-12-02',
        accounting_period: '2026-12'
      })
    ]

    const summary = computeCardPeriodSummary({
      account: mockCard,
      transactions: txs,
      period: '2026-11',
      todayStr: '2026-11-02',
      displayCurrency: 'UYU',
      peopleById: mockPeople,
      convert: mockConvert
    })

    expect(summary.brand).toBe('VISA')
    expect(summary.periodSpendByCurrency).toEqual({ UYU: 12000, USD: 100 })
    expect(summary.periodPersonalInDisplay).toBe(12000)
    expect(summary.periodThirdPartyInDisplay).toBe(4000)
    expect(summary.periodSpendInDisplay).toBe(16000)
    expect(summary.futureCommittedByCurrency).toEqual({ UYU: 5000 })
    expect(summary.totalCommittedInNative).toBe(21000)
    expect(summary.availableCredit).toBe(79000)
    expect(summary.utilizationPct).toBe(21)
    expect(summary.utilizationLevel).toBe('optimal')
    expect(summary.totalPeriodItems).toBe(2)
    expect(summary.verifiedPeriodItems).toBe(1)
    expect(summary.verificationPct).toBe(50)
  })
})

describe('computeInstallmentsRunoff & extractActiveInstallmentPlans', () => {
  it('proyecta la curva de meses futuros y detecta la liberación de cuotas cuando finaliza un plan', () => {
    const txs: MasterTransaction[] = [
      makeTx({
        id: 'p1-1',
        parent_transaction_id: 'p1-1',
        notes: 'MacBook Air',
        category_id: 'cat-tech',
        amount_original: 200,
        currency_original: 'USD',
        amount_account: 8000,
        installment_current: 2,
        installment_total: 3,
        accounting_period: '2026-11',
        date: '2026-11-02'
      }),
      makeTx({
        id: 'p1-2',
        parent_transaction_id: 'p1-1',
        notes: 'MacBook Air',
        category_id: 'cat-tech',
        amount_original: 200,
        currency_original: 'USD',
        amount_account: 8000,
        installment_current: 3,
        installment_total: 3,
        status: 'PENDING',
        accounting_period: '2026-12',
        date: '2026-12-02'
      })
    ]

    const runoff = computeInstallmentsRunoff({
      cards: [mockCard],
      transactions: txs,
      startPeriod: '2026-11',
      monthsCount: 3,
      displayCurrency: 'UYU',
      peopleById: mockPeople,
      convert: mockConvert
    })

    expect(runoff).toHaveLength(3)
    expect(runoff[0].period).toBe('2026-11')
    expect(runoff[0].totalInDisplay).toBe(8000)
    expect(runoff[0].endingPlansCount).toBe(0)

    expect(runoff[1].period).toBe('2026-12')
    expect(runoff[1].totalInDisplay).toBe(8000)
    expect(runoff[1].endingPlansCount).toBe(1)
    expect(runoff[1].freedMonthlyInDisplay).toBe(8000)
    expect(runoff[1].freedByCurrency).toEqual({ USD: 200 })

    expect(runoff[2].period).toBe('2027-01')
    expect(runoff[2].totalInDisplay).toBe(0)

    const plans = extractActiveInstallmentPlans({
      cards: [mockCard],
      transactions: txs,
      selectedPeriod: '2026-11',
      displayCurrency: 'UYU',
      categoriesById: mockCategories,
      peopleById: mockPeople,
      convert: mockConvert
    })

    expect(plans).toHaveLength(1)
    expect(plans[0].description).toBe('MacBook Air')
    expect(plans[0].currentInstallment).toBe(2)
    expect(plans[0].totalInstallments).toBe(3)
    expect(plans[0].remainingInstallments).toBe(2)
    expect(plans[0].remainingAmount).toBe(400)
    expect(plans[0].endPeriod).toBe('2026-12')
  })
})

describe('computeCardBreakdowns', () => {
  it('ignora TRANSFER y ADJUSTMENT y agrupa consumos por categoría y persona', () => {
    const txs: MasterTransaction[] = [
      makeTx({
        id: 'c1',
        category_id: 'cat-food',
        person_id: 'p-personal',
        amount_original: 6000,
        currency_original: 'UYU',
        accounting_period: '2026-11'
      }),
      makeTx({
        id: 'c2',
        category_id: 'cat-tech',
        person_id: 'p-gladys',
        amount_original: 4000,
        currency_original: 'UYU',
        accounting_period: '2026-11'
      }),
      makeTx({
        id: 'transfer-payment',
        type: 'TRANSFER',
        amount_original: 10000,
        amount_account: 10000,
        accounting_period: '2026-11'
      })
    ]

    const { categories, people } = computeCardBreakdowns({
      cards: [mockCard],
      transactions: txs,
      selectedPeriod: '2026-11',
      displayCurrency: 'UYU',
      categoriesById: mockCategories,
      peopleById: mockPeople,
      convert: mockConvert
    })

    expect(categories).toHaveLength(2)
    expect(categories[0].categoryName).toBe('Supermercado')
    expect(categories[0].percentage).toBe(60)
    expect(categories[1].categoryName).toBe('Tecnología')
    expect(categories[1].percentage).toBe(40)

    expect(people).toHaveLength(2)
    const gladys = people.find((p) => p.personName === 'Gladys')
    expect(gladys?.isPersonal).toBe(false)
    expect(gladys?.periodInDisplay).toBe(4000)
  })
})
