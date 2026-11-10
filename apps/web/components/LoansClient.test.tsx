import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoansClient } from './LoansClient'
import * as ledgerContextModule from '@/lib/ledger/ledger-context'
import type { LoanWithInstallments, Account } from '@/lib/types'

vi.mock('next/link', () => ({
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  )
}))

vi.mock('./LoanCard', () => ({
  LoanCard: ({ loan }: { loan: LoanWithInstallments }) => (
    <div data-testid="loan-card">{loan.name}</div>
  )
}))

const mockLoan: LoanWithInstallments = {
  id: 'loan-1',
  user_id: 'u1',
  name: 'Préstamo Auto Itaú',
  direction: 'BORROWED',
  principal: 10000,
  currency: 'USD',
  tea_rate: 0.15,
  includes_vat_22: false,
  total_installments: 12,
  start_date: '2026-01-01',
  due_day: 10,
  amortization_type: 'FRENCH_ITAU',
  status: 'ACTIVE',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  installments: [
    {
      id: 'inst-1',
      loan_id: 'loan-1',
      period: 1,
      due_date: '2026-02-10',
      installment_amount: 900,
      principal_amount: 800,
      interest_amount: 100,
      vat_amount: 0,
      payment: 900,
      balance: 9200,
      paid: false,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z'
    }
  ]
}

const mockAccount: Account & { institutions?: { name: string } | null } = {
  id: 'acc-1',
  user_id: 'u1',
  institution_id: 'inst-1',
  name: 'Caja de Ahorro USD',
  type: 'CHECKING',
  currency_native: 'USD',
  is_active: true,
  credit_limit: null,
  closing_day: null,
  due_day: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  institutions: { name: 'Banco Itaú' }
}

describe('LoansClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renderiza la lista de préstamos provistos por props y siembra en ledger', () => {
    const seedInitialDataMock = vi.fn()
    vi.spyOn(ledgerContextModule, 'useOptionalLedger').mockReturnValue({
      loans: [],
      accounts: [],
      seedInitialData: seedInitialDataMock
    } as any)

    render(
      <LoansClient
        loans={[mockLoan]}
        accounts={[mockAccount]}
        displayCurrency="USD"
      />
    )

    expect(screen.getByText('Préstamo Auto Itaú')).toBeInTheDocument()
    expect(seedInitialDataMock).toHaveBeenCalledWith({ loans: [mockLoan] })
  })

  it('hidrata los préstamos desde useOptionalLedger si props.loans está vacío (modo offline)', () => {
    vi.spyOn(ledgerContextModule, 'useOptionalLedger').mockReturnValue({
      loans: [mockLoan],
      accounts: [mockAccount],
      seedInitialData: vi.fn()
    } as any)

    render(
      <LoansClient
        loans={[]}
        accounts={[]}
        displayCurrency="USD"
      />
    )

    expect(screen.getByText('Préstamo Auto Itaú')).toBeInTheDocument()
  })

  it('muestra mensaje vacío si no hay préstamos en props ni en ledger', () => {
    vi.spyOn(ledgerContextModule, 'useOptionalLedger').mockReturnValue({
      loans: [],
      accounts: [],
      seedInitialData: vi.fn()
    } as any)

    render(
      <LoansClient
        loans={[]}
        accounts={[]}
        displayCurrency="USD"
      />
    )

    expect(screen.getByText('No hay préstamos para mostrar')).toBeInTheDocument()
  })
})

