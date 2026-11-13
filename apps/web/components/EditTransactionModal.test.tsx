import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EditTransactionModal } from './EditTransactionModal'
import * as ledgerContext from '@/lib/ledger/ledger-context'
import * as onlineHook from '@/lib/hooks/use-online-status'
import type { Category, MasterTransaction, Person } from '@/lib/types'

vi.mock('@/lib/ledger/ledger-context', () => ({
  useOptionalLedger: vi.fn()
}))

vi.mock('@/lib/hooks/use-online-status', () => ({
  useOnlineStatus: vi.fn()
}))

vi.mock('@/app/(protected)/transactions/new/actions', () => ({
  updateTransaction: vi.fn()
}))

const mockCategories: Category[] = [
  { id: 'cat-food', name: 'Comida', icon: 'utensils', color: 'expense', is_active: true },
  { id: 'cat-home', name: 'Hogar', icon: 'home', color: 'accent', is_active: true }
]

const mockPeople: Person[] = [
  { id: 'per-1', name: 'Gladys', phone: null, is_active: true }
]

const baseUncategorizedTx: MasterTransaction = {
  id: 'tx-100',
  parent_transaction_id: null,
  date: '2026-11-10',
  type: 'OUTCOME',
  amount_original: 45,
  currency_original: 'EUR',
  fee_amount: 0,
  exchange_rate: 1,
  rate_overridden: false,
  amount_account: 45,
  currency_account: 'EUR',
  institution_id: 'inst-1',
  account_id: 'acc-1',
  category_id: null,
  person_id: null,
  installment_current: 1,
  installment_total: 1,
  status: 'COMPLETED',
  notes: 'Almuerzo rápido',
  settled_at: null
}

describe('EditTransactionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(onlineHook.useOnlineStatus).mockReturnValue(true)
  })

  it('no renderiza nada si transaction es null', () => {
    vi.mocked(ledgerContext.useOptionalLedger).mockReturnValue(null)
    const { container } = render(
      <EditTransactionModal transaction={null} onClose={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('muestra aviso cuando el movimiento no tiene categoría y permite asignarla', async () => {
    const mockUpdate = vi.fn().mockResolvedValue(undefined)
    const mockClose = vi.fn()
    vi.mocked(ledgerContext.useOptionalLedger).mockReturnValue({
      categories: mockCategories,
      people: mockPeople,
      updateTransaction: mockUpdate
    } as any)

    render(
      <EditTransactionModal
        transaction={baseUncategorizedTx}
        onClose={mockClose}
      />
    )

    expect(screen.getByText('Asignar categoría y editar')).toBeInTheDocument()
    expect(
      screen.getByText('Este movimiento aún no tiene categoría asignada.')
    ).toBeInTheDocument()

    // Seleccionar categoría Comida
    const categorySelect = screen.getByLabelText('Categoría')
    fireEvent.change(categorySelect, { target: { value: 'cat-food' } })

    // Modificar descripción
    const notesInput = screen.getByLabelText('Descripción / Nota')
    fireEvent.change(notesInput, { target: { value: 'Almuerzo en Madrid' } })

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        transactionId: 'tx-100',
        categoryId: 'cat-food',
        personId: null,
        notes: 'Almuerzo en Madrid',
        date: '2026-11-10',
        amountOriginal: 45,
        currencyOriginal: 'EUR',
        amountAccount: 45
      })
      expect(mockClose).toHaveBeenCalled()
    })
  })

  it('ofrece propagar cambios a todas las cuotas cuando installment_total > 1', async () => {
    const mockUpdate = vi.fn().mockResolvedValue(undefined)
    vi.mocked(ledgerContext.useOptionalLedger).mockReturnValue({
      categories: mockCategories,
      people: mockPeople,
      updateTransaction: mockUpdate
    } as any)

    const installmentTx: MasterTransaction = {
      ...baseUncategorizedTx,
      id: 'tx-installment-2',
      parent_transaction_id: 'tx-installment-1',
      installment_current: 2,
      installment_total: 6
    }

    render(
      <EditTransactionModal
        transaction={installmentTx}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('Cuota 2 de 6')).toBeInTheDocument()
    expect(screen.getByText('Aplicar a todas las cuotas del plan')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Categoría'), {
      target: { value: 'cat-home' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionId: 'tx-installment-2',
          categoryId: 'cat-home',
          propagateToInstallments: true
        })
      )
    })
  })
})

