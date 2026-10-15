import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RegisterPersonPaymentModal } from './RegisterPersonPaymentModal'
import * as ledgerContextModule from '@/lib/ledger/ledger-context'
import * as navigationModule from 'next/navigation'
import type { Account, MasterTransaction, Person } from '@/lib/types'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn()
}))

vi.mock('@/lib/ledger/ledger-context', () => ({
  useOptionalLedger: vi.fn()
}))

vi.mock('@/app/(protected)/transactions/new/actions', () => ({
  fetchExchangeRate: vi.fn().mockResolvedValue(1)
}))

describe('RegisterPersonPaymentModal', () => {
  const mockRefresh = vi.fn()
  const mockAddPersonSettlement = vi.fn()
  const mockOnClose = vi.fn()
  const mockOnSuccess = vi.fn()

  const person: Person = {
    id: 'person-gladys',
    name: 'Gladys',
    phone: '+59899123456',
    is_active: true
  }

  const accounts: (Account & { institutions?: { name: string } })[] = [
    {
      id: 'acc-cash',
      user_id: 'u1',
      institution_id: 'inst-1',
      name: 'Itaú Efectivo',
      type: 'cash',
      currency_native: 'UYU',
      is_active: true,
      institutions: { name: 'Banco Itaú' }
    }
  ]

  const today = new Date().toISOString().slice(0, 10)
  // Crear una fecha pasada y una fecha futura
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

  const pendingTransactions: MasterTransaction[] = [
    {
      id: 'tx-1',
      parent_transaction_id: null,
      date: yesterday,
      type: 'OUTCOME',
      amount_original: 500,
      currency_original: 'UYU',
      fee_amount: 0,
      exchange_rate: 1,
      rate_overridden: false,
      amount_account: 500,
      currency_account: 'UYU',
      institution_id: 'inst-1',
      account_id: 'acc-card',
      category_id: null,
      person_id: 'person-gladys',
      installment_current: 1,
      installment_total: 2,
      status: 'COMPLETED',
      notes: 'Supermercado Cuota 1',
      settled_at: null,
      settled_amount: 0
    },
    {
      id: 'tx-2',
      parent_transaction_id: null,
      date: nextMonth,
      type: 'OUTCOME',
      amount_original: 500,
      currency_original: 'UYU',
      fee_amount: 0,
      exchange_rate: 1,
      rate_overridden: false,
      amount_account: 500,
      currency_account: 'UYU',
      institution_id: 'inst-1',
      account_id: 'acc-card',
      category_id: null,
      person_id: 'person-gladys',
      installment_current: 2,
      installment_total: 2,
      status: 'PENDING',
      notes: 'Supermercado Cuota 2',
      settled_at: null,
      settled_amount: 0
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(navigationModule.useRouter).mockReturnValue({
      refresh: mockRefresh,
      push: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn()
    } as any)

    vi.mocked(ledgerContextModule.useOptionalLedger).mockReturnValue({
      addPersonSettlement: mockAddPersonSettlement,
      accounts: [],
      categories: []
    } as any)
  })

  it('no renderiza nada si isOpen es false', () => {
    const { container } = render(
      <RegisterPersonPaymentModal
        person={person}
        pendingTransactions={pendingTransactions}
        accounts={accounts}
        isOpen={false}
        onClose={mockOnClose}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renderiza con el saldo actual (<= hoy) precargado y detecta Caso A', () => {
    render(
      <RegisterPersonPaymentModal
        person={person}
        pendingTransactions={pendingTransactions}
        accounts={accounts}
        isOpen={true}
        onClose={mockOnClose}
      />
    )

    // Pre-carga 500 (deuda actual de tx-1)
    const input = screen.getByPlaceholderText('0.00') as HTMLInputElement
    expect(input.value).toBe('500.00')

    // Detecta Caso A
    expect(screen.getByText(/Caso A: Pago total del saldo actual/i)).toBeInTheDocument()
  })

  it('detecta Caso B cuando el usuario disminuye el importe a pagar', () => {
    render(
      <RegisterPersonPaymentModal
        person={person}
        pendingTransactions={pendingTransactions}
        accounts={accounts}
        isOpen={true}
        onClose={mockOnClose}
      />
    )

    const input = screen.getByPlaceholderText('0.00')
    fireEvent.change(input, { target: { value: '300' } })

    expect(screen.getByText(/Caso B: Pago parcial del saldo actual/i)).toBeInTheDocument()
    expect(screen.getByText(/Restarán por cobrar/i)).toBeInTheDocument()
  })

  it('detecta Caso C cuando el importe supera el saldo actual para cubrir cuotas futuras', () => {
    render(
      <RegisterPersonPaymentModal
        person={person}
        pendingTransactions={pendingTransactions}
        accounts={accounts}
        isOpen={true}
        onClose={mockOnClose}
      />
    )

    const input = screen.getByPlaceholderText('0.00')
    fireEvent.change(input, { target: { value: '800' } })

    expect(screen.getByText(/Caso C: Pago con adelanto a cuotas futuras/i)).toBeInTheDocument()
  })

  it('bloquea y advierte si el importe ingresado supera la deuda total acumulada', () => {
    render(
      <RegisterPersonPaymentModal
        person={person}
        pendingTransactions={pendingTransactions}
        accounts={accounts}
        isOpen={true}
        onClose={mockOnClose}
      />
    )

    const input = screen.getByPlaceholderText('0.00')
    fireEvent.change(input, { target: { value: '1500' } })

    expect(
      screen.getByText(/El importe supera la deuda total acumulada/i)
    ).toBeInTheDocument()

    const submitBtn = screen.getByRole('button', { name: /Registrar cobro/i })
    expect(submitBtn).toBeDisabled()
  })

  it('registra el cobro exitosamente usando el ledger local-first', async () => {
    mockAddPersonSettlement.mockResolvedValueOnce({ id: 'b-1' })

    render(
      <RegisterPersonPaymentModal
        person={person}
        pendingTransactions={pendingTransactions}
        accounts={accounts}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    const submitBtn = screen.getByRole('button', { name: /Registrar cobro/i })
    expect(submitBtn).not.toBeDisabled()

    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockAddPersonSettlement).toHaveBeenCalledWith(
        expect.objectContaining({
          personId: 'person-gladys',
          personName: 'Gladys',
          amountOriginal: 500,
          currencyOriginal: 'UYU',
          amountAccount: 500,
          currencyAccount: 'UYU'
        })
      )
    })
  })
})
