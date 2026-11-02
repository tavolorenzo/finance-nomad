import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CreditCardsDashboard } from './CreditCardsDashboard'
import type { CardAccountWithInstitution } from '@/lib/credit-cards/analytics'
import type { Category, MasterTransaction, Person } from '@/lib/types'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/cards'
}))

const mockCards: CardAccountWithInstitution[] = [
  {
    id: 'card-visa',
    institution_id: 'inst-1',
    name: 'Itaú Visa Infinite',
    type: 'credit_card',
    currency_native: 'UYU',
    credit_limit: 120000,
    closing_day: 20,
    is_active: true,
    institutions: { id: 'inst-1', name: 'Itaú', is_active: true }
  },
  {
    id: 'card-mc',
    institution_id: 'inst-2',
    name: 'Scotiabank Mastercard Black',
    type: 'credit_card',
    currency_native: 'USD',
    credit_limit: 5000,
    closing_day: 15,
    is_active: true,
    institutions: { id: 'inst-2', name: 'Scotiabank', is_active: true }
  }
]

const mockCategories: Category[] = [
  { id: 'cat-1', name: 'Viajes', is_active: true }
]

const mockPeople: Person[] = [
  { id: 'p-1', name: 'Personal', phone: null, is_active: true },
  { id: 'p-2', name: 'Gladys', phone: '+59899000111', is_active: true }
]

const mockTransactions: MasterTransaction[] = [
  {
    id: 'tx-1',
    parent_transaction_id: 'tx-1',
    date: '2026-11-01',
    type: 'OUTCOME',
    amount_original: 15000,
    currency_original: 'UYU',
    fee_amount: 0,
    exchange_rate: 1,
    rate_overridden: false,
    amount_account: 15000,
    currency_account: 'UYU',
    institution_id: 'inst-1',
    account_id: 'card-visa',
    category_id: 'cat-1',
    person_id: 'p-1',
    installment_current: 1,
    installment_total: 2,
    status: 'COMPLETED',
    notes: 'Pasaje aéreo',
    settled_at: null,
    accounting_period: '2026-11',
    is_verified: true
  },
  {
    id: 'tx-2',
    parent_transaction_id: 'tx-1',
    date: '2026-12-01',
    type: 'OUTCOME',
    amount_original: 15000,
    currency_original: 'UYU',
    fee_amount: 0,
    exchange_rate: 1,
    rate_overridden: false,
    amount_account: 15000,
    currency_account: 'UYU',
    institution_id: 'inst-1',
    account_id: 'card-visa',
    category_id: 'cat-1',
    person_id: 'p-1',
    installment_current: 2,
    installment_total: 2,
    status: 'PENDING',
    notes: 'Pasaje aéreo',
    settled_at: null,
    accounting_period: '2026-12',
    is_verified: false
  }
]

describe('CreditCardsDashboard', () => {
  it('renderiza los 4 bloques, detecta los sellos VISA y Mastercard y muestra planes de cuotas', () => {
    render(
      <CreditCardsDashboard
        initialAccounts={mockCards}
        initialTransactions={mockTransactions}
        initialCategories={mockCategories}
        initialPeople={mockPeople}
        initialDisplayCurrency="UYU"
        initialCustomRates={{ USD_UYU: 40, UYU_USD: 0.025 }}
        initialPeriod="2026-11"
        todayStr="2026-11-02"
      />
    )

    expect(screen.getByText('Itaú Visa Infinite')).toBeInTheDocument()
    expect(screen.getByText('Scotiabank Mastercard Black')).toBeInTheDocument()

    // Sellos de red detectados por nombre
    expect(screen.getByLabelText('Sello VISA')).toBeInTheDocument()
    expect(screen.getByLabelText('Sello Mastercard')).toBeInTheDocument()

    // Plan de cuotas activo
    expect(screen.getByText('Pasaje aéreo')).toBeInTheDocument()
    expect(screen.getByText('Cuota 1 de 2')).toBeInTheDocument()

    // Navegación al período siguiente
    fireEvent.click(screen.getByLabelText('Período siguiente'))
    expect(screen.getByText('Cuota 2 de 2')).toBeInTheDocument()
  })
})
