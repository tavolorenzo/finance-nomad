import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoanCard } from './LoanCard'
import type { LoanWithInstallments } from '@/lib/types'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn()
  })
}))

describe('LoanCard', () => {
  const mockLoan: LoanWithInstallments = {
    id: 'loan-1',
    name: 'Préstamo Auto Itaú',
    principal: 10000,
    currency: 'USD',
    direction: 'BORROWED',
    tea_rate: 0.285,
    includes_vat_22: false,
    total_installments: 12,
    start_date: '2026-03-01',
    status: 'ACTIVE',
    institution: { id: 'inst-1', name: 'Banco Itaú', is_active: true },
    person: null,
    installments: [
      {
        id: 'inst-1',
        loan_id: 'loan-1',
        period: 1,
        installment_amount: 950,
        payment: 700,
        interest: 250,
        balance: 9300,
        due_date: '2026-04-01',
        paid: true
      },
      {
        id: 'inst-2',
        loan_id: 'loan-1',
        period: 2,
        installment_amount: 950,
        payment: 720,
        interest: 230,
        balance: 8580,
        due_date: '2026-05-01',
        paid: false
      }
    ]
  }

  const mockAccounts = [
    { id: 'acc-1', name: 'Cuenta Corriente', currency_native: 'USD', institution_id: 'inst-1', type: 'checking' as const, credit_limit: null, is_active: true }
  ]

  it('renderiza nombre, contraparte, saldo y progreso de amortización', () => {
    render(<LoanCard loan={mockLoan} accounts={mockAccounts} />)

    expect(screen.getByText('Préstamo Auto Itaú')).toBeInTheDocument()
    expect(screen.getByText('Banco Itaú')).toBeInTheDocument()
    expect(screen.getByText('Mi Deuda')).toBeInTheDocument()
    // 1 de 12 cuotas (8%)
    expect(screen.getByText(/1 de 12 cuotas/)).toBeInTheDocument()
    // Botón para pagar la próxima cuota 2
    expect(screen.getByRole('button', { name: /Pagar Cuota/i })).toBeInTheDocument()
  })

  it('muestra estado Cancelado cuando el préstamo está totalmente pagado', () => {
    const paidLoan: LoanWithInstallments = {
      ...mockLoan,
      status: 'PAID',
      installments: mockLoan.installments.map((i) => ({ ...i, paid: true }))
    }

    render(<LoanCard loan={paidLoan} accounts={mockAccounts} />)
    expect(screen.getByText('Finalizado')).toBeInTheDocument()
    expect(screen.getByText(/Todas las cuotas se encuentran canceladas/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Pagar Cuota/i })).not.toBeInTheDocument()
  })
})
