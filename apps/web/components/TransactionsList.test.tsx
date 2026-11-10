import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TransactionsList } from './TransactionsList'
import * as ledgerContext from '@/lib/ledger/ledger-context'
import type { MasterTransaction } from '@/lib/types'

vi.mock('@/lib/ledger/ledger-context', () => ({
  useLedger: vi.fn()
}))

vi.mock('./ConfirmTransactionButton', () => ({
  ConfirmTransactionButton: () => <button>Confirmar Mock</button>
}))

vi.mock('./DeleteTransactionButton', () => ({
  DeleteTransactionButton: () => <button>Eliminar Mock</button>
}))

describe('TransactionsList', () => {
  const mockLoadMore = vi.fn()

  const mockTx: MasterTransaction = {
    id: 'tx-1',
    parent_transaction_id: null,
    date: '2026-10-24',
    type: 'OUTCOME',
    amount_original: 120,
    currency_original: 'EUR',
    fee_amount: 0,
    exchange_rate: 1,
    rate_overridden: false,
    amount_account: 120,
    currency_account: 'EUR',
    institution_id: 'inst-1',
    account_id: 'acc-1',
    category_id: null,
    person_id: null,
    installment_current: 1,
    installment_total: 1,
    status: 'COMPLETED',
    notes: 'Cena con amigos',
    settled_at: null,
    settled_amount: 0
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('muestra mensaje vacío si no hay movimientos', () => {
    vi.mocked(ledgerContext.useLedger).mockReturnValue({
      recentTransactions: [],
      hasMoreTransactions: false,
      loadMoreTransactions: mockLoadMore,
      isInitialized: true
    } as any)

    render(<TransactionsList />)
    expect(screen.getByText(/todavía no cargaste movimientos este mes/i)).toBeInTheDocument()
  })

  it('renderiza movimientos con formato monetario y notas', () => {
    vi.mocked(ledgerContext.useLedger).mockReturnValue({
      recentTransactions: [mockTx],
      hasMoreTransactions: false,
      loadMoreTransactions: mockLoadMore,
      isInitialized: true
    } as any)

    render(<TransactionsList />)
    expect(screen.getByText('Cena con amigos')).toBeInTheDocument()
    expect(screen.getByText(/120/)).toBeInTheDocument()
  })

  it('permite cargar más movimientos si hasMoreTransactions es true', async () => {
    vi.mocked(ledgerContext.useLedger).mockReturnValue({
      recentTransactions: [mockTx],
      hasMoreTransactions: true,
      loadMoreTransactions: mockLoadMore.mockResolvedValue(undefined),
      isInitialized: true
    } as any)

    render(<TransactionsList />)
    const loadMoreBtn = screen.getByRole('button', { name: /cargar movimientos anteriores/i })
    expect(loadMoreBtn).toBeInTheDocument()

    fireEvent.click(loadMoreBtn)
    await waitFor(() => {
      expect(mockLoadMore).toHaveBeenCalled()
    })
  })

  it('pagína a 20 movimientos por página e incluye controles de navegación', () => {
    const twentyFiveTx: MasterTransaction[] = Array.from({ length: 25 }, (_, i) => ({
      ...mockTx,
      id: `tx-${i + 1}`,
      notes: `Movimiento general ${i + 1}`
    }))

    vi.mocked(ledgerContext.useLedger).mockReturnValue({
      recentTransactions: twentyFiveTx,
      hasMoreTransactions: false,
      loadMoreTransactions: mockLoadMore,
      isInitialized: true
    } as any)

    render(<TransactionsList />)

    expect(screen.getByText('Movimiento general 1')).toBeInTheDocument()
    expect(screen.getByText('Movimiento general 20')).toBeInTheDocument()
    expect(screen.queryByText('Movimiento general 21')).not.toBeInTheDocument()

    // Control de paginación
    expect(screen.getByLabelText('Paginación de resultados')).toBeInTheDocument()

    // Ir a página 2
    const nextBtn = screen.getByLabelText('Página siguiente')
    fireEvent.click(nextBtn)

    expect(screen.getByText('Movimiento general 21')).toBeInTheDocument()
    expect(screen.getByText('Movimiento general 25')).toBeInTheDocument()
    expect(screen.queryByText('Movimiento general 1')).not.toBeInTheDocument()
  })
})
