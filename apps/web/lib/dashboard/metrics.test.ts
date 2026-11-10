import { describe, it, expect } from 'vitest'
import {
  getDashboardPeriodRange,
  isThirdPartyTransaction,
  computeDashboardCashFlow,
  computeDashboardCategorySpending,
  computeDashboardLiabilities,
  computeDashboardReceivables,
  computeQuickLoansSummary
} from './metrics'
import type { MasterTransaction, Person, Category, Account, LoanWithInstallments } from '@/lib/types'

describe('Dashboard Metrics Logic', () => {
  const dummyConvert = (amount: number) => amount

  describe('getDashboardPeriodRange', () => {
    it('calculates this_month range correctly', () => {
      const fixedDate = new Date(2026, 10, 10) // Nov 10, 2026
      const range = getDashboardPeriodRange('this_month', fixedDate)
      expect(range.start).toBe('2026-11-01')
      expect(range.end).toBe('2026-11-30')
      expect(range.label).toBe('Mes actual')
    })

    it('calculates last_30_days range correctly', () => {
      const fixedDate = new Date(2026, 10, 10) // Nov 10, 2026
      const range = getDashboardPeriodRange('last_30_days', fixedDate)
      expect(range.end).toBe('2026-11-10')
      expect(range.start).toBe('2026-10-11')
      expect(range.label).toBe('Últimos 30 días')
    })
  })

  describe('isThirdPartyTransaction', () => {
    const peopleById = new Map<string, Person>([
      ['p-1', { id: 'p-1', name: 'Personal', is_active: true } as Person],
      ['p-2', { id: 'p-2', name: 'Sofi', is_active: true } as Person]
    ])

    it('returns false if tx has no person_id', () => {
      const tx = { person_id: null } as MasterTransaction
      expect(isThirdPartyTransaction(tx, peopleById)).toBe(false)
    })

    it('returns false if person is Personal', () => {
      const tx = { person_id: 'p-1' } as MasterTransaction
      expect(isThirdPartyTransaction(tx, peopleById)).toBe(false)
    })

    it('returns true if person is a third party', () => {
      const tx = { person_id: 'p-2' } as MasterTransaction
      expect(isThirdPartyTransaction(tx, peopleById)).toBe(true)
    })
  })

  describe('computeDashboardCashFlow', () => {
    const peopleById = new Map<string, Person>([
      ['p-2', { id: 'p-2', name: 'Lucas', is_active: true } as Person]
    ])

    const transactions: MasterTransaction[] = [
      {
        id: '1',
        type: 'INCOME',
        status: 'COMPLETED',
        amount_account: 2500,
        currency_account: 'USD',
        date: '2026-11-05'
      } as MasterTransaction,
      {
        id: '2',
        type: 'OUTCOME',
        status: 'COMPLETED',
        amount_account: 800,
        currency_account: 'USD',
        date: '2026-11-06',
        person_id: null
      } as MasterTransaction,
      {
        id: '3',
        type: 'OUTCOME',
        status: 'COMPLETED',
        amount_account: 200,
        currency_account: 'USD',
        date: '2026-11-07',
        person_id: 'p-2' // Third party
      } as MasterTransaction,
      {
        id: '4',
        type: 'TRANSFER',
        status: 'COMPLETED',
        amount_account: 500,
        currency_account: 'USD',
        date: '2026-11-08'
      } as MasterTransaction,
      {
        id: '5',
        type: 'OUTCOME',
        status: 'PENDING',
        amount_account: 300,
        currency_account: 'USD',
        date: '2026-11-09'
      } as MasterTransaction
    ]

    it('computes cashflow excluding transfers, pending and isolating third-party expenses', () => {
      const result = computeDashboardCashFlow({
        transactions,
        startDate: '2026-11-01',
        endDate: '2026-11-30',
        displayCurrency: 'USD',
        peopleById,
        convert: dummyConvert
      })

      expect(result.totalIncome).toBe(2500)
      expect(result.totalPersonalExpenses).toBe(800)
      expect(result.totalThirdPartyExpenses).toBe(200)
      expect(result.netCashFlow).toBe(1700) // 2500 - 800
      expect(result.savingsRate).toBe(68) // (1700 / 2500) * 100
    })
  })

  describe('computeDashboardCategorySpending', () => {
    const categoriesById = new Map<string, Category>([
      ['cat-1', { id: 'cat-1', name: 'Supermercado', icon: 'shopping-cart', color: 'emerald' } as Category],
      ['cat-2', { id: 'cat-2', name: 'Servicios', icon: 'receipt', color: 'amber' } as Category]
    ])
    const peopleById = new Map<string, Person>([
      ['p-2', { id: 'p-2', name: 'Martín', is_active: true } as Person]
    ])

    const transactions: MasterTransaction[] = [
      {
        id: '1',
        type: 'OUTCOME',
        status: 'COMPLETED',
        amount_account: 300,
        category_id: 'cat-1',
        currency_account: 'USD',
        date: '2026-11-05'
      } as MasterTransaction,
      {
        id: '2',
        type: 'OUTCOME',
        status: 'COMPLETED',
        amount_account: 100,
        category_id: 'cat-2',
        currency_account: 'USD',
        date: '2026-11-06'
      } as MasterTransaction,
      {
        id: '3',
        type: 'OUTCOME',
        status: 'COMPLETED',
        amount_account: 500,
        category_id: 'cat-1',
        currency_account: 'USD',
        date: '2026-11-07',
        person_id: 'p-2' // Third party - should be excluded from personal breakdown
      } as MasterTransaction
    ]

    it('groups personal expenses and sorts by amount descending', () => {
      const items = computeDashboardCategorySpending({
        transactions,
        categoriesById,
        peopleById,
        startDate: '2026-11-01',
        endDate: '2026-11-30',
        displayCurrency: 'USD',
        convert: dummyConvert
      })

      expect(items).toHaveLength(2)
      expect(items[0].name).toBe('Supermercado')
      expect(items[0].amount).toBe(300)
      expect(items[0].percentage).toBe(75) // 300 / 400
      expect(items[1].name).toBe('Servicios')
      expect(items[1].amount).toBe(100)
      expect(items[1].percentage).toBe(25) // 100 / 400
    })
  })

  describe('computeDashboardLiabilities and Receivables', () => {
    const cards: Account[] = [
      { id: 'card-1', name: 'Visa Gold', type: 'credit_card', currency_native: 'USD' } as Account
    ]
    const balanceByAccount = new Map<string, number>([
      ['card-1', -450]
    ])
    const transactions: MasterTransaction[] = [
      {
        id: 'tx-future',
        account_id: 'card-1',
        type: 'OUTCOME',
        status: 'COMPLETED',
        amount_account: 120,
        currency_account: 'USD',
        accounting_period: '2026-12',
        date: '2026-11-05'
      } as MasterTransaction,
      {
        id: 'tx-third-party',
        account_id: 'card-1',
        type: 'OUTCOME',
        status: 'COMPLETED',
        amount_account: 80,
        currency_account: 'USD',
        person_id: 'p-sofi',
        settled_at: null,
        settled_amount: 0,
        date: '2026-11-04'
      } as MasterTransaction
    ]
    const peopleById = new Map<string, Person>([
      ['p-sofi', { id: 'p-sofi', name: 'Sofi', is_active: true } as Person]
    ])

    const loans: LoanWithInstallments[] = [
      {
        id: 'loan-borrowed',
        name: 'Préstamo Auto',
        direction: 'BORROWED',
        status: 'ACTIVE',
        is_active: true,
        currency: 'USD',
        installments: [
          { id: 'inst-1', paid: true, installment_amount: 200 },
          { id: 'inst-2', paid: false, installment_amount: 200, due_date: '2026-11-20' },
          { id: 'inst-3', paid: false, installment_amount: 200, due_date: '2026-12-20' }
        ]
      } as unknown as LoanWithInstallments,
      {
        id: 'loan-lent',
        name: 'Préstamo a Primo',
        direction: 'LENT',
        status: 'ACTIVE',
        is_active: true,
        currency: 'USD',
        installments: [
          { id: 'inst-4', paid: false, installment_amount: 150, due_date: '2026-11-15' }
        ]
      } as unknown as LoanWithInstallments
    ]

    it('calculates hybrid liabilities properly', () => {
      const liab = computeDashboardLiabilities({
        creditCardAccounts: cards,
        balanceByAccount,
        transactions,
        loans,
        todayStr: '2026-11-10',
        displayCurrency: 'USD',
        convert: dummyConvert
      })

      expect(liab.cardCurrentDebt).toBe(450)
      expect(liab.cardFutureDebt).toBe(120)
      expect(liab.totalCardDebt).toBe(570)
      expect(liab.loansBorrowedDebt).toBe(400) // 2 unpaid x 200
      expect(liab.totalCurrentLiabilities).toBe(850) // 450 + 400
      expect(liab.totalConsolidatedLiabilities).toBe(970) // 450 + 120 + 400
    })

    it('calculates receivables properly', () => {
      const rec = computeDashboardReceivables({
        transactions,
        loans,
        peopleById,
        displayCurrency: 'USD',
        convert: dummyConvert
      })

      expect(rec.thirdPartyPending).toBe(80)
      expect(rec.loansLentPending).toBe(150)
      expect(rec.totalReceivables).toBe(230)
    })

    it('computes quick loans summary correctly with earliest installment', () => {
      const summary = computeQuickLoansSummary(loans, '2026-11-10')
      expect(summary.activeBorrowedCount).toBe(1)
      expect(summary.activeLentCount).toBe(1)
      expect(summary.nextUpcomingInstallment?.loanName).toBe('Préstamo a Primo')
      expect(summary.nextUpcomingInstallment?.dueDate).toBe('2026-11-15')
    })
  })
})
