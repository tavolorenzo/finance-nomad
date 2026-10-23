import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DeleteTransactionButton } from './DeleteTransactionButton'
import * as actions from '@/app/(protected)/transactions/new/actions'
import * as ledgerContext from '@/lib/ledger/ledger-context'

vi.mock('@/app/(protected)/transactions/new/actions', () => ({
  deleteTransaction: vi.fn()
}))

vi.mock('@/lib/ledger/ledger-context', () => ({
  useOptionalLedger: vi.fn()
}))

describe('DeleteTransactionButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('no ejecuta eliminación si el usuario cancela la confirmación', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    vi.mocked(ledgerContext.useOptionalLedger).mockReturnValue(null)

    render(<DeleteTransactionButton transactionId="tx-1" />)
    const btn = screen.getByTitle('Eliminar movimiento')
    fireEvent.click(btn)

    expect(confirmSpy).toHaveBeenCalled()
    expect(actions.deleteTransaction).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('elimina vía Server Action si se confirma y no hay ledger', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(ledgerContext.useOptionalLedger).mockReturnValue(null)
    vi.mocked(actions.deleteTransaction).mockResolvedValue(undefined as any)

    render(<DeleteTransactionButton transactionId="tx-1" />)
    fireEvent.click(screen.getByTitle('Eliminar movimiento'))

    await waitFor(() => {
      expect(actions.deleteTransaction).toHaveBeenCalledWith('tx-1')
    })
    confirmSpy.mockRestore()
  })

  it('elimina vía ledger si hay ledger activo', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const mockDelete = vi.fn().mockResolvedValue(undefined)
    vi.mocked(ledgerContext.useOptionalLedger).mockReturnValue({
      deleteTransaction: mockDelete
    } as any)

    render(<DeleteTransactionButton transactionId="tx-ledger" />)
    fireEvent.click(screen.getByTitle('Eliminar movimiento'))

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('tx-ledger')
    })
    confirmSpy.mockRestore()
  })
})
