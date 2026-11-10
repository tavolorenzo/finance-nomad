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
    expect(screen.getByText('Registrar pago de tarjeta de crédito')).toBeInTheDocument()
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

  it('permite seleccionar el mes contable del resumen a cancelar y lo envía en la transferencia', async () => {
    const mockAddTransfer = vi.fn().mockResolvedValue({})
    vi.mocked(ledgerContext.useOptionalLedger).mockReturnValue({
      getBalance: () => -250,
      accounts: [
        { id: 'card-1', institution_id: 'inst-card' }
      ],
      addTransfer: mockAddTransfer
    } as any)

    render(
      <RegisterCardPaymentModal
        cardAccount={{ ...mockCardAccount, closing_day: 24 }}
        currentBalance={-250}
        fundingAccounts={mockFundingAccounts}
        initialPeriod="2026-10"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /registrar pago/i }))

    expect(screen.getByText(/Resumen a cancelar \(mes contable\)/i)).toBeInTheDocument()

    const amountInput = screen.getByPlaceholderText('0.00')
    fireEvent.change(amountInput, { target: { value: '250' } })

    const submitBtns = screen.getAllByRole('button', { name: /^registrar pago$/i })
    const submitBtn = submitBtns[submitBtns.length - 1]
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockAddTransfer).toHaveBeenCalledWith(
        expect.objectContaining({
          amountOriginal: 250,
          currencyOriginal: 'EUR',
          accountingPeriod: '2026-10',
          targetAccountingPeriod: '2026-10',
          toAccount: expect.objectContaining({
            id: 'card-1',
            type: 'credit_card'
          })
        })
      )
    })
  })
})
