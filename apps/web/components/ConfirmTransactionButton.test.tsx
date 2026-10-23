import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ConfirmTransactionButton } from './ConfirmTransactionButton'
import * as actions from '@/app/(protected)/transactions/new/actions'
import * as ledgerContext from '@/lib/ledger/ledger-context'

vi.mock('@/app/(protected)/transactions/new/actions', () => ({
  confirmTransaction: vi.fn()
}))

vi.mock('@/lib/ledger/ledger-context', () => ({
  useOptionalLedger: vi.fn()
}))

describe('ConfirmTransactionButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza botón de confirmación correctamente', () => {
    vi.mocked(ledgerContext.useOptionalLedger).mockReturnValue(null)
    render(<ConfirmTransactionButton transactionId="tx-123" />)
    expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument()
  })

  it('llama a la Server Action si no hay ledger en contexto', async () => {
    vi.mocked(ledgerContext.useOptionalLedger).mockReturnValue(null)
    vi.mocked(actions.confirmTransaction).mockResolvedValue({ success: true } as any)

    render(<ConfirmTransactionButton transactionId="tx-123" />)
    const btn = screen.getByRole('button', { name: /confirmar/i })
    fireEvent.click(btn)

    await waitFor(() => {
      expect(actions.confirmTransaction).toHaveBeenCalledWith('tx-123')
    })
  })

  it('llama a ledger.confirmTransaction si hay ledger en contexto', async () => {
    const mockConfirm = vi.fn().mockResolvedValue(undefined)
    vi.mocked(ledgerContext.useOptionalLedger).mockReturnValue({
      confirmTransaction: mockConfirm
    } as any)

    render(<ConfirmTransactionButton transactionId="tx-456" />)
    const btn = screen.getByRole('button', { name: /confirmar/i })
    fireEvent.click(btn)

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith('tx-456')
    })
  })

  it('muestra alerta si ocurre un error', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    vi.mocked(ledgerContext.useOptionalLedger).mockReturnValue(null)
    vi.mocked(actions.confirmTransaction).mockRejectedValue(new Error('Fallo de red'))

    render(<ConfirmTransactionButton transactionId="tx-err" />)
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Fallo de red')
    })
    alertSpy.mockRestore()
  })
})
