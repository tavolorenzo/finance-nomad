import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AmortizationTable } from './AmortizationTable'
import type { Loan, LoanInstallment } from '@/lib/types'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn()
  })
}))

describe('AmortizationTable', () => {
  const mockLoan: Loan = {
    id: 'loan-1',
    name: 'Préstamo Itaú',
    principal: 3000,
    currency: 'USD',
    direction: 'BORROWED',
    tea_rate: 0.25,
    includes_vat_22: false,
    total_installments: 3,
    start_date: '2026-01-01',
    status: 'ACTIVE'
  }

  const mockInstallments: LoanInstallment[] = [
    {
      id: 'inst-1',
      loan_id: 'loan-1',
      period: 1,
      installment_amount: 1050,
      payment: 980,
      interest: 70,
      balance: 2020,
      due_date: '2027-01-01',
      paid: true,
      paid_at: '2027-01-01T10:00:00Z'
    },
    {
      id: 'inst-2',
      loan_id: 'loan-1',
      period: 2,
      installment_amount: 1050,
      payment: 1000,
      interest: 50,
      balance: 1020,
      due_date: '2027-02-01',
      paid: false
    },
    {
      id: 'inst-3',
      loan_id: 'loan-1',
      period: 3,
      installment_amount: 1050,
      payment: 1020,
      interest: 30,
      balance: 0,
      due_date: '2027-03-01',
      paid: false
    }
  ]

  const mockAccounts = [
    { id: 'acc-1', name: 'Cuenta Itaú', currency_native: 'USD', institution_id: 'inst-1', type: 'checking' as const, credit_limit: null, is_active: true }
  ]

  it('renderiza todas las cuotas del cronograma y badges de estado', () => {
    render(
      <AmortizationTable
        loan={mockLoan}
        installments={mockInstallments}
        accounts={mockAccounts}
      />
    )

    expect(screen.getByText('Pagada')).toBeInTheDocument()
    expect(screen.getByText('Próxima')).toBeInTheDocument()
    expect(screen.getByText('Pendiente')).toBeInTheDocument()

    // Solo la cuota 2 (la próxima) tiene habilitado el botón Pagar
    const payButtons = screen.getAllByRole('button', { name: /Pagar/i })
    expect(payButtons).toHaveLength(1)
  })
})
