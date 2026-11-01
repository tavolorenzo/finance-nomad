import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PayLoanInstallmentModal } from './PayLoanInstallmentModal'
import * as loansActions from '@/app/(protected)/loans/actions'
import type { Loan, LoanInstallment } from '@/lib/types'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn()
  })
}))

vi.mock('@/app/(protected)/loans/actions', () => ({
  payLoanInstallmentAction: vi.fn().mockResolvedValue({ success: true })
}))

describe('PayLoanInstallmentModal', () => {
  const mockLoan: Loan = {
    id: 'loan-1',
    name: 'Préstamo Auto Itaú',
    principal: 10000,
    currency: 'USD',
    direction: 'BORROWED',
    tea_rate: 0.285,
    includes_vat_22: true,
    total_installments: 12,
    start_date: '2026-03-01',
    status: 'ACTIVE'
  }

  const mockInstallment: LoanInstallment = {
    id: 'inst-1',
    loan_id: 'loan-1',
    period: 1,
    installment_amount: 950,
    payment: 700,
    interest: 200,
    vat_amount: 44,
    balance: 9300,
    due_date: '2026-04-01',
    paid: false
  }

  const mockAccounts = [
    {
      id: 'acc-1',
      name: 'Cuenta Corriente USD',
      currency_native: 'USD',
      institution_id: 'inst-1',
      type: 'checking' as const,
      credit_limit: null,
      is_active: true,
      institutions: { name: 'Banco Itaú' }
    }
  ]

  it('renderiza desglose de capital e intereses y ejecuta el pago', async () => {
    const handleClose = vi.fn()

    render(
      <PayLoanInstallmentModal
        loan={mockLoan}
        installment={mockInstallment}
        accounts={mockAccounts}
        isOpen={true}
        onClose={handleClose}
      />
    )

    expect(screen.getByRole('heading', { name: /Pagar Cuota de Préstamo/i })).toBeInTheDocument()
    expect(screen.getByText('Amortización Capital')).toBeInTheDocument()
    expect(screen.getByText(/Intereses \(con IVA 22%\)/i)).toBeInTheDocument()
    expect(screen.getByText(/US\$ 700,00/i)).toBeInTheDocument()
    // 200 + 44 = 244
    expect(screen.getByText(/US\$ 244,00/i)).toBeInTheDocument()

    const submitBtn = screen.getByRole('button', { name: /Confirmar Pago/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(loansActions.payLoanInstallmentAction).toHaveBeenCalledWith({
        loanId: 'loan-1',
        installmentId: 'inst-1',
        accountId: 'acc-1',
        paidDate: expect.any(String)
      })
    })
  })
})
