import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import {
  CreditCardStatementVerifier,
  type StatementTransactionRow
} from './CreditCardStatementVerifier'
import * as verifyActions from '@/app/(protected)/accounts/verify-card-actions'
import * as navigation from 'next/navigation'
import type { Account, Category, Person } from '@/lib/types'

vi.mock('@/app/(protected)/accounts/verify-card-actions', () => ({
  verifyCardStatementItemAction: vi.fn(),
  verifyAllStatementItemsAction: vi.fn(),
  shiftTransactionToNextMonthAction: vi.fn(),
  amendCardTransactionAction: vi.fn(),
  addMissingStatementTransactionAction: vi.fn()
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn()
}))

describe('CreditCardStatementVerifier', () => {
  const mockRefresh = vi.fn()

  const mockCardAccount: Account & { institutions: { name: string } } = {
    id: 'card-itau',
    institution_id: 'inst-1',
    name: 'Visa Volar Itaú',
    type: 'credit_card',
    currency_native: 'UYU',
    credit_limit: 150000,
    closing_day: 24,
    is_active: true,
    institutions: { name: 'Itaú' }
  }

  const mockCategories: Category[] = [
    { id: 'cat-1', name: 'Supermercado', is_active: true },
    { id: 'cat-2', name: 'Suscripciones', is_active: true }
  ]

  const mockPeople: Person[] = [
    { id: 'per-1', name: 'Personal', phone: null, is_active: true },
    { id: 'per-2', name: 'Gladys', phone: null, is_active: true }
  ]

  const mockTransactions: StatementTransactionRow[] = [
    {
      id: 'tx-1',
      parent_transaction_id: null,
      date: '2026-10-12',
      accounting_period: '2026-10',
      type: 'OUTCOME',
      amount_original: 4500,
      currency_original: 'UYU',
      fee_amount: 0,
      exchange_rate: 1,
      rate_overridden: false,
      amount_account: 4500,
      currency_account: 'UYU',
      institution_id: 'inst-1',
      account_id: 'card-itau',
      category_id: 'cat-1',
      person_id: 'per-1',
      installment_current: 1,
      installment_total: 1,
      status: 'COMPLETED',
      notes: 'Tienda Inglesa',
      settled_at: null,
      is_verified: false,
      categories: { name: 'Supermercado' },
      people: { name: 'Personal' }
    },
    {
      id: 'tx-2',
      parent_transaction_id: 'tx-root',
      date: '2026-10-18',
      accounting_period: '2026-10',
      type: 'OUTCOME',
      amount_original: 50,
      currency_original: 'USD',
      fee_amount: 0,
      exchange_rate: 42,
      rate_overridden: false,
      amount_account: 2100,
      currency_account: 'UYU',
      institution_id: 'inst-1',
      account_id: 'card-itau',
      category_id: 'cat-2',
      person_id: 'per-2',
      installment_current: 2,
      installment_total: 6,
      status: 'COMPLETED',
      notes: 'Amazon USA',
      settled_at: null,
      is_verified: true,
      categories: { name: 'Suscripciones' },
      people: { name: 'Gladys' }
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(navigation.useRouter).mockReturnValue({
      refresh: mockRefresh,
      push: vi.fn()
    } as any)
  })

  it('muestra el summary con pills, desglose multi-moneda (UYU + USD) y lista de gastos del período', () => {
    render(
      <CreditCardStatementVerifier
        account={mockCardAccount}
        transactions={mockTransactions}
        categories={mockCategories}
        people={mockPeople}
        initialPeriod="2026-10"
      />
    )

    expect(screen.getByText('Visa Volar Itaú')).toBeInTheDocument()
    expect(screen.getByText(/Día de cierre configurado: 24/i)).toBeInTheDocument()
    expect(screen.getByText('Tienda Inglesa')).toBeInTheDocument()
    expect(screen.getByText('Amazon USA')).toBeInTheDocument()
    expect(screen.getByText('Cuota 2 de 6')).toBeInTheDocument()
    // Desglose por moneda de origen (UYU y USD separados)
    expect(screen.getByText(/Desglose por moneda de origen/i)).toBeInTheDocument()
    // Estado 1 / 2 confirmados
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
  })

  it('permite confirmar un gasto pendiente llamando a verifyCardStatementItemAction', async () => {
    vi.mocked(verifyActions.verifyCardStatementItemAction).mockResolvedValueOnce({
      success: true,
      verified: true
    })

    render(
      <CreditCardStatementVerifier
        account={mockCardAccount}
        transactions={mockTransactions}
        categories={mockCategories}
        people={mockPeople}
        initialPeriod="2026-10"
      />
    )

    const confirmBtn = screen.getByRole('button', { name: /^Confirmar$/i })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(verifyActions.verifyCardStatementItemAction).toHaveBeenCalledWith({
        transactionId: 'tx-1',
        verified: true
      })
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('permite asignar un gasto al próximo mes llamando a shiftTransactionToNextMonthAction', async () => {
    vi.mocked(verifyActions.shiftTransactionToNextMonthAction).mockResolvedValueOnce({
      success: true,
      shiftedCount: 5,
      newPeriod: '2026-11'
    })

    render(
      <CreditCardStatementVerifier
        account={mockCardAccount}
        transactions={mockTransactions}
        categories={mockCategories}
        people={mockPeople}
        initialPeriod="2026-10"
      />
    )

    const shiftButtons = screen.getAllByRole('button', { name: /Asignar al próximo mes/i })
    fireEvent.click(shiftButtons[1]) // tx-2 (cuota 2 de 6)

    await waitFor(() => {
      expect(verifyActions.shiftTransactionToNextMonthAction).toHaveBeenCalledWith({
        transactionId: 'tx-2'
      })
      expect(
        screen.getByText(/Se desplazaron 5 cuotas en cascada a partir de Noviembre 2026/i)
      ).toBeInTheDocument()
    })
  })

  it('permite abrir el modal de corregir gasto y guardar cambios', async () => {
    vi.mocked(verifyActions.amendCardTransactionAction).mockResolvedValueOnce({
      success: true
    })

    render(
      <CreditCardStatementVerifier
        account={mockCardAccount}
        transactions={mockTransactions}
        categories={mockCategories}
        people={mockPeople}
        initialPeriod="2026-10"
      />
    )

    const editButtons = screen.getAllByRole('button', { name: /Corregir/i })
    fireEvent.click(editButtons[0])

    expect(screen.getByText('Corregir gasto del resumen')).toBeInTheDocument()

    const saveBtn = screen.getByRole('button', { name: /Guardar y confirmar/i })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(verifyActions.amendCardTransactionAction).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionId: 'tx-1',
          notes: 'Tienda Inglesa',
          amountOriginal: 4500
        })
      )
    })
  })
})

