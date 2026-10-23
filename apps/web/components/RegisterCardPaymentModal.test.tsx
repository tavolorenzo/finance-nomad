import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RegisterCardPaymentModal } from './RegisterCardPaymentModal'
import * as ledgerContext from '@/lib/ledger/ledger-context'
import type { Account } from '@/lib/types'

vi.mock('@/lib/ledger/ledger-context', () => ({
  useOptionalLedger: vi.fn()
}))

describe('RegisterCardPaymentModal', () => {
  const mockCardAccount = {
    id: 'card-1',
    name: 'Visa Platinum',
    currency_native: 'EUR'
  }

  const mockFundingAccounts: (Account & { institutions?: { name: string } })[] = [
    {
      id: 'acc-debito',
      institution_id: 'inst-1',
      name: 'Cuenta Nómina',
      type: 'checking',
      currency_native: 'EUR',
      credit_limit: null,
      is_active: true
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(ledgerContext.useOptionalLedger).mockReturnValue(null)
  })

  it('abre el modal de pago de tarjeta al hacer click', () => {
    render(
      <RegisterCardPaymentModal
        cardAccount={mockCardAccount}
        currentBalance={-250}
        fundingAccounts={mockFundingAccounts}
      />
    )

    const btn = screen.getByRole('button', { name: /registrar pago/i })
    fireEvent.click(btn)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Registrar pago de tarjeta')).toBeInTheDocument()
  })

  it('permite cargar el monto total de deuda con el botón de atajo', () => {
    render(
      <RegisterCardPaymentModal
        cardAccount={mockCardAccount}
        currentBalance={-250}
        fundingAccounts={mockFundingAccounts}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /registrar pago/i }))
    const totalDebtBtn = screen.getByRole('button', { name: /pagar total/i })
    fireEvent.click(totalDebtBtn)

    const amountInput = screen.getByPlaceholderText('0.00')
    expect(amountInput).toHaveValue(250)
  })
})
