import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TransactionForm } from './TransactionForm'
import * as ledgerContext from '@/lib/ledger/ledger-context'
import * as modalModule from '@/components/Modal'
import * as navigation from 'next/navigation'
import type { Account, Category, Person } from '@/lib/types'

vi.mock('@/lib/ledger/ledger-context', () => ({
  useLedger: vi.fn()
}))

vi.mock('@/components/Modal', () => ({
  useModal: vi.fn()
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn()
}))

vi.mock('@/app/(protected)/transactions/new/actions', () => ({
  fetchExchangeRate: vi.fn().mockResolvedValue(1.08)
}))

describe('TransactionForm', () => {
  const mockClose = vi.fn()
  const mockRefresh = vi.fn()
  const mockAddTransaction = vi.fn()

  const mockAccounts: (Account & { institutions: { id: string; name: string } })[] = [
    {
      id: 'acc-1',
      institution_id: 'inst-1',
      name: 'Santander EUR',
      type: 'checking',
      currency_native: 'EUR',
      credit_limit: null,
      is_active: true,
      institutions: { id: 'inst-1', name: 'Santander' }
    },
    {
      id: 'acc-2',
      institution_id: 'inst-1',
      name: 'Santander USD',
      type: 'savings',
      currency_native: 'USD',
      credit_limit: null,
      is_active: true,
      institutions: { id: 'inst-1', name: 'Santander' }
    }
  ]

  const mockCategories: Category[] = [
    {
      id: 'cat-1',
      name: 'Supermercado',
      icon: 'shopping-cart',
      color: 'accent',
      is_active: true,
      created_at: new Date().toISOString()
    }
  ]

  const mockPeople: Person[] = [
    {
      id: 'per-personal',
      name: 'Personal',
      phone: null,
      is_active: true,
      created_at: new Date().toISOString()
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(modalModule.useModal).mockReturnValue({ isModal: false, close: mockClose })
    vi.mocked(navigation.useRouter).mockReturnValue({ refresh: mockRefresh, push: vi.fn() } as any)
    vi.mocked(ledgerContext.useLedger).mockReturnValue({
      addTransaction: mockAddTransaction.mockResolvedValue(undefined),
      settings: { display_currency: 'EUR', active_currencies: [] },
      accounts: mockAccounts
    } as any)
  })

  it('renderiza tipos de movimiento: Gasto, Ingreso y Transferencia', () => {
    render(
      <TransactionForm
        accounts={mockAccounts}
        categories={mockCategories}
        people={mockPeople}
        defaultDate="2026-10-24"
      />
    )

    expect(screen.getByRole('button', { name: /gasto/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ingreso/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /transferencia/i })).toBeInTheDocument()
  })

  it('permite registrar un gasto y llamar a ledger.addTransaction', async () => {
    render(
      <TransactionForm
        accounts={mockAccounts}
        categories={mockCategories}
        people={mockPeople}
        defaultDate="2026-10-24"
      />
    )

    const amountInput = screen.getByPlaceholderText('0.00')
    fireEvent.change(amountInput, { target: { value: '45.50' } })

    const notesInput = screen.getByPlaceholderText(/supermercado, cena/i)
    fireEvent.change(notesInput, { target: { value: 'Compra semanal' } })

    const submitBtn = screen.getByRole('button', { name: /guardar transacción/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockAddTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'OUTCOME',
          amountOriginal: 45.5,
          notes: 'Compra semanal'
        })
      )
    })
  })

  it('al seleccionar transferencia muestra campo de cuenta destino', () => {
    render(
      <TransactionForm
        accounts={mockAccounts}
        categories={mockCategories}
        people={mockPeople}
        defaultDate="2026-10-24"
      />
    )

    const transferBtn = screen.getByRole('button', { name: /transferencia/i })
    fireEvent.click(transferBtn)

    expect(screen.getByText(/cuenta origen/i)).toBeInTheDocument()
    expect(screen.getByText(/cuenta destino/i)).toBeInTheDocument()
  })
})
