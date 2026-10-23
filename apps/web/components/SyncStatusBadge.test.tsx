import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SyncStatusBadge } from './SyncStatusBadge'
import * as ledgerContext from '@/lib/ledger/ledger-context'

vi.mock('@/lib/ledger/ledger-context', () => ({
  useLedger: vi.fn()
}))

describe('SyncStatusBadge', () => {
  const mockRetrySync = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('muestra estado sincronizado (al día) cuando no hay pendientes ni fallos', () => {
    vi.mocked(ledgerContext.useLedger).mockReturnValue({
      syncState: { isSyncing: false, failedCount: 0, pendingCount: 0 },
      retrySync: mockRetrySync
    } as any)

    render(<SyncStatusBadge />)
    const btn = screen.getByRole('button')
    expect(btn).toHaveAttribute('title', 'Todos los datos están sincronizados.')

    // Al hacer click muestra el tooltip
    fireEvent.click(btn)
    expect(screen.getByText('Al día')).toBeInTheDocument()
  })

  it('muestra estado sincronizando cuando isSyncing es true', () => {
    vi.mocked(ledgerContext.useLedger).mockReturnValue({
      syncState: { isSyncing: true, failedCount: 0, pendingCount: 1 },
      retrySync: mockRetrySync
    } as any)

    render(<SyncStatusBadge />)
    expect(screen.getByText('Sincronizando...')).toBeInTheDocument()
  })

  it('muestra badge de fallos y llama a retrySync al hacer click', () => {
    vi.mocked(ledgerContext.useLedger).mockReturnValue({
      syncState: { isSyncing: false, failedCount: 2, pendingCount: 2 },
      retrySync: mockRetrySync
    } as any)

    render(<SyncStatusBadge />)
    expect(screen.getByText('2 pendientes')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button'))
    expect(mockRetrySync).toHaveBeenCalledTimes(1)
  })
})
