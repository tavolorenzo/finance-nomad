import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ExpressAdjustModal } from './ExpressAdjustModal'
import * as actions from '@/app/(protected)/accounts/actions'
import * as ledgerContext from '@/lib/ledger/ledger-context'

vi.mock('@/app/(protected)/accounts/actions', () => ({
  createBalanceAdjustment: vi.fn()
}))

vi.mock('@/lib/ledger/ledger-context', () => ({
  useOptionalLedger: vi.fn()
}))

describe('ExpressAdjustModal', () => {
  const mockAccount = {
    id: 'acc-1',
    name: 'Caja EUR',
    currency_native: 'EUR',
    institution_id: 'inst-1'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(ledgerContext.useOptionalLedger).mockReturnValue(null)
  })

  it('abre el modal de ajuste rápido al hacer click en el disparador', () => {
    render(<ExpressAdjustModal account={mockAccount} currentBalance={100} />)
    const trigger = screen.getByRole('button', { name: /ajuste express/i })
    fireEvent.click(trigger)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/ajuste express de saldo/i)).toBeInTheDocument()
  })

  it('calcula la diferencia y ejecuta el ajuste vía Server Action', async () => {
    vi.mocked(actions.createBalanceAdjustment).mockResolvedValue({ success: true } as any)
    render(<ExpressAdjustModal account={mockAccount} currentBalance={100} />)

    fireEvent.click(screen.getByRole('button', { name: /ajuste express/i }))

    const input = screen.getByPlaceholderText('0.00')
    fireEvent.change(input, { target: { value: '150' } })

    const submitBtn = screen.getByRole('button', { name: /guardar ajuste/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(actions.createBalanceAdjustment).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'acc-1',
          targetBalance: 150
        })
      )
    })
  })
})
