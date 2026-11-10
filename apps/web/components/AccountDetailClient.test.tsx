import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AccountDetailClient, type TransactionWithRelations } from './AccountDetailClient'
import type { Account } from '@/lib/types'

vi.mock('@/components/RegisterCardPaymentModal', () => ({
  RegisterCardPaymentModal: ({ initialPeriod }: { initialPeriod?: string }) => (
    <div data-testid="mock-register-payment-modal" data-initial-period={initialPeriod}>
      Registrar Pago Mock
    </div>
  )
}))

vi.mock('@/components/ExpressAdjustModal', () => ({
  ExpressAdjustModal: () => <div data-testid="mock-express-adjust-modal">Ajuste Express Mock</div>
}))

vi.mock('@/components/ConfirmTransactionButton', () => ({
  ConfirmTransactionButton: () => <button type="button">Confirmar</button>
}))

vi.mock('@/components/DeleteTransactionButton', () => ({
  DeleteTransactionButton: () => <button type="button">Eliminar</button>
}))

const mockBankCard: Account & { institutions: { name: string; is_active: boolean } } = {
  id: 'acc-savings',
  user_id: 'user-1',
  institution_id: 'inst-1',
  name: 'Caja de Ahorro USD',
  type: 'savings',
  currency_native: 'USD',
  credit_limit: null,
  closing_day: null,
  is_active: true,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  institutions: { name: 'Itaú Uruguay', is_active: true }
}

const mockCreditCard: Account & { institutions: { name: string; is_active: boolean } } = {
  id: 'card-visa',
  user_id: 'user-1',
  institution_id: 'inst-1',
  name: 'Visa Infinite',
  type: 'credit_card',
  currency_native: 'UYU',
  credit_limit: 150000,
  closing_day: 20,
  is_active: true,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  institutions: { name: 'Itaú Uruguay', is_active: true }
}

const mockTransactions: TransactionWithRelations[] = [
  {
    id: 'tx-1',
    user_id: 'user-1',
    parent_transaction_id: 'tx-1',
    date: '2026-11-05',
    type: 'OUTCOME',
    amount_original: 3500,
    currency_original: 'UYU',
    fee_amount: 0,
    exchange_rate: 1,
    rate_overridden: false,
    amount_account: 3500,
    currency_account: 'UYU',
    institution_id: 'inst-1',
    account_id: 'card-visa',
    category_id: null,
    person_id: null,
    accounting_period: '2026-11',
    installment_current: 1,
    installment_total: 1,
    status: 'COMPLETED',
    is_verified: true,
    notes: 'Supermercado Disco',
    created_at: '2026-11-05',
    updated_at: '2026-11-05'
  },
  {
    id: 'tx-2',
    user_id: 'user-1',
    parent_transaction_id: 'tx-2',
    date: '2026-10-18',
    type: 'OUTCOME',
    amount_original: 1200,
    currency_original: 'UYU',
    fee_amount: 0,
    exchange_rate: 1,
    rate_overridden: false,
    amount_account: 1200,
    currency_account: 'UYU',
    institution_id: 'inst-1',
    account_id: 'card-visa',
    category_id: null,
    person_id: null,
    accounting_period: '2026-10',
    installment_current: 1,
    installment_total: 1,
    status: 'COMPLETED',
    is_verified: false,
    notes: 'Farmacia',
    created_at: '2026-10-18',
    updated_at: '2026-10-18'
  },
  {
    id: 'tx-3',
    user_id: 'user-1',
    parent_transaction_id: 'tx-3',
    date: '2026-11-02',
    type: 'OUTCOME',
    amount_original: 50,
    currency_original: 'USD',
    fee_amount: 0,
    exchange_rate: 42,
    rate_overridden: false,
    amount_account: 2100,
    currency_account: 'UYU',
    institution_id: 'inst-1',
    account_id: 'card-visa',
    category_id: null,
    person_id: null,
    accounting_period: '2026-11',
    installment_current: 1,
    installment_total: 1,
    status: 'COMPLETED',
    is_verified: false,
    notes: 'Amazon Web Services',
    created_at: '2026-11-02',
    updated_at: '2026-11-02'
  },
  {
    id: 'tx-future',
    user_id: 'user-1',
    parent_transaction_id: 'tx-plan',
    date: '2026-12-05',
    type: 'OUTCOME',
    amount_original: 2000,
    currency_original: 'UYU',
    fee_amount: 0,
    exchange_rate: 1,
    rate_overridden: false,
    amount_account: 2000,
    currency_account: 'UYU',
    institution_id: 'inst-1',
    account_id: 'card-visa',
    category_id: null,
    person_id: null,
    accounting_period: '2026-12',
    installment_current: 2,
    installment_total: 3,
    status: 'PENDING',
    is_verified: false,
    notes: 'Electrodoméstico cuota 2/3',
    created_at: '2026-11-05',
    updated_at: '2026-11-05'
  }
]

describe('AccountDetailClient', () => {
  it('renderiza la barra de período contable y la información de una cuenta bancaria', () => {
    render(
      <AccountDetailClient
        account={mockBankCard}
        allAccounts={[mockBankCard]}
        initialTransactions={[]}
        initialPeriod="2026-11"
        todayStr="2026-11-07"
      />
    )

    expect(screen.getByRole('heading', { name: 'Caja de Ahorro USD' })).toBeInTheDocument()
    expect(screen.getAllByText('Itaú Uruguay').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Período contable:/i)).toBeInTheDocument()
    expect(screen.getAllByText(/noviembre 2026/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByTestId('mock-express-adjust-modal')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /carga rápida/i })).toHaveAttribute(
      'href',
      '/accounts/acc-savings/bulk'
    )
  })

  it('renderiza consumos bimonetarios y botón de verificar con el período en tarjeta de crédito', () => {
    render(
      <AccountDetailClient
        account={mockCreditCard}
        allAccounts={[mockCreditCard]}
        initialTransactions={mockTransactions}
        initialPeriod="2026-11"
        todayStr="2026-11-07"
      />
    )

    expect(screen.getByRole('heading', { name: 'Visa Infinite' })).toBeInTheDocument()
    expect(screen.getAllByText(/UYU/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/USD/i).length).toBeGreaterThanOrEqual(1)

    // El enlace de verificar resumen debe tener el período actual seleccionado
    const verifyLink = screen.getByRole('link', { name: /verificar resumen/i })
    expect(verifyLink).toHaveAttribute('href', '/accounts/card-visa/verify?period=2026-11')

    // El modal de pago debe recibir initialPeriod
    const paymentModal = screen.getByTestId('mock-register-payment-modal')
    expect(paymentModal).toHaveAttribute('data-initial-period', '2026-11')
  })

  it('permite conmutar al período anterior y muestra el botón para volver al período actual', () => {
    render(
      <AccountDetailClient
        account={mockCreditCard}
        allAccounts={[mockCreditCard]}
        initialTransactions={mockTransactions}
        initialPeriod="2026-11"
        todayStr="2026-11-07"
      />
    )

    const prevButton = screen.getByLabelText(/período anterior/i)
    fireEvent.click(prevButton)

    // Ahora el período seleccionado es 2026-10 (octubre 2026)
    expect(screen.getAllByText(/octubre 2026/i).length).toBeGreaterThanOrEqual(1)

    // Debe aparecer el botón para volver al período actual (noviembre 2026)
    const returnButton = screen.getByRole('button', { name: /volver a/i })
    expect(returnButton).toBeInTheDocument()

    // El enlace de verificar debe haberse actualizado a 2026-10
    const verifyLink = screen.getByRole('link', { name: /verificar resumen/i })
    expect(verifyLink).toHaveAttribute('href', '/accounts/card-visa/verify?period=2026-10')

    // Al hacer click en "Volver", regresa a noviembre 2026
    fireEvent.click(returnButton)
    expect(screen.getAllByText(/noviembre 2026/i).length).toBeGreaterThanOrEqual(1)
  })

  it('filtra los movimientos visibles entre el período seleccionado y todos los movimientos', () => {
    render(
      <AccountDetailClient
        account={mockCreditCard}
        allAccounts={[mockCreditCard]}
        initialTransactions={mockTransactions}
        initialPeriod="2026-11"
        todayStr="2026-11-07"
      />
    )

    // Por defecto está en modo "Este período" (2 movimientos en 2026-11: tx-1 y tx-3)
    expect(screen.getByText('Supermercado Disco')).toBeInTheDocument()
    expect(screen.getByText('Amazon Web Services')).toBeInTheDocument()
    expect(screen.queryByText('Farmacia')).not.toBeInTheDocument() // Corresponde a 2026-10

    // Conmutar a "Todos"
    const allTab = screen.getByRole('button', { name: /todos/i })
    fireEvent.click(allTab)

    expect(screen.getByText('Farmacia')).toBeInTheDocument()
    expect(screen.getByText('Supermercado Disco')).toBeInTheDocument()
  })

  it('pagína el listado de movimientos cuando hay más de 20 movimientos', () => {
    const manyTransactions: TransactionWithRelations[] = Array.from({ length: 25 }, (_, i) => ({
      id: `tx-many-${i + 1}`,
      user_id: 'user-1',
      parent_transaction_id: `tx-many-${i + 1}`,
      date: '2026-11-05',
      type: 'OUTCOME',
      amount_original: 100 + i,
      currency_original: 'UYU',
      fee_amount: 0,
      exchange_rate: 1,
      rate_overridden: false,
      amount_account: 100 + i,
      currency_account: 'UYU',
      institution_id: 'inst-1',
      account_id: 'card-visa',
      category_id: null,
      person_id: null,
      accounting_period: '2026-11',
      installment_current: 1,
      installment_total: 1,
      status: 'COMPLETED',
      is_verified: false,
      notes: `Movimiento Número ${i + 1}`,
      created_at: '2026-11-05',
      updated_at: '2026-11-05'
    }))

    render(
      <AccountDetailClient
        account={mockCreditCard}
        allAccounts={[mockCreditCard]}
        initialTransactions={manyTransactions}
        initialPeriod="2026-11"
        todayStr="2026-11-07"
      />
    )

    // En la página 1 deben estar los movimientos 1 al 20
    expect(screen.getByText('Movimiento Número 1')).toBeInTheDocument()
    expect(screen.getByText('Movimiento Número 20')).toBeInTheDocument()
    expect(screen.queryByText('Movimiento Número 21')).not.toBeInTheDocument()

    // Debe mostrar el control de paginación
    expect(screen.getByLabelText('Paginación de resultados')).toBeInTheDocument()
    expect(screen.getByText(/Mostrando/i)).toBeInTheDocument()

    // Navegar a la página 2
    const nextBtn = screen.getByLabelText('Página siguiente')
    fireEvent.click(nextBtn)

    // Ahora en la página 2 debe estar el movimiento 21 y 25, pero no el 1
    expect(screen.getByText('Movimiento Número 21')).toBeInTheDocument()
    expect(screen.getByText('Movimiento Número 25')).toBeInTheDocument()
    expect(screen.queryByText('Movimiento Número 1')).not.toBeInTheDocument()
  })
})
