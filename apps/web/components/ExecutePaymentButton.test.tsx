import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ExecutePaymentButton, type EstimateSummary } from './ExecutePaymentButton'
import * as actions from '@/app/(protected)/budget/actions'
import * as ledgerContext from '@/lib/ledger/ledger-context'
import * as navigation from 'next/navigation'

vi.mock('@/app/(protected)/budget/actions', () => ({
  executeBudgetPayment: vi.fn()
}))

vi.mock('@/lib/ledger/ledger-context', () => ({
  useOptionalLedger: vi.fn()
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn()
}))

describe('ExecutePaymentButton', () => {
  const mockRefresh = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(navigation.useRouter).mockReturnValue({
      refresh: mockRefresh
    } as any)
  })

  it('muestra estado deshabilitado si ya fue ejecutado', () => {
    render(<ExecutePaymentButton estimateId="est-1" disabled={true} />)
    const btn = screen.getByRole('button', { name: /ya ejecutado/i })
    expect(btn).toBeDisabled()
  })

  it('ejecuta pago vía Server Action si no hay cuenta preferida configurada', async () => {
    vi.mocked(ledgerContext.useOptionalLedger).mockReturnValue(null)
    vi.mocked(actions.executeBudgetPayment).mockResolvedValue(undefined as any)

    render(<ExecutePaymentButton estimateId="est-1" disabled={false} />)
    const btn = screen.getByRole('button', { name: /ejecutar pago/i })
    fireEvent.click(btn)

    await waitFor(() => {
      expect(actions.executeBudgetPayment).toHaveBeenCalledWith('est-1')
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('asienta pago en el ledger si hay cuenta preferida y ledger activo', async () => {
    const mockAddTransaction = vi.fn().mockResolvedValue(undefined)
    vi.mocked(ledgerContext.useOptionalLedger).mockReturnValue({
      accounts: [
        { id: 'acc-1', institution_id: 'inst-1', currency_native: 'EUR' }
      ],
      addTransaction: mockAddTransaction
    } as any)

    const estimate: EstimateSummary = {
      id: 'est-1',
      name: 'Internet Fibra',
      type: 'EXPENSE_ESTIMATE',
      estimated_amount: 50,
      currency: 'EUR',
      preferred_account_id: 'acc-1',
      category_id: 'cat-servicios'
    }

    render(<ExecutePaymentButton estimateId="est-1" estimate={estimate} disabled={false} />)
    fireEvent.click(screen.getByRole('button', { name: /ejecutar pago/i }))

    await waitFor(() => {
      expect(mockAddTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'OUTCOME',
          amountOriginal: 50,
          notes: 'Internet Fibra',
          accountId: 'acc-1'
        })
      )
    })
  })
})
