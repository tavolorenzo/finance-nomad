import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AnalyticsDashboard } from './AnalyticsDashboard'
import type { MasterTransaction, Category, Account, Person } from '@/lib/types'

vi.mock('@/lib/ledger/ledger-context', () => ({
  useLedger: () => ({
    recentTransactions: []
  })
}))

describe('AnalyticsDashboard', () => {
  const categories: Category[] = [
    { id: 'cat-1', name: 'Supermercado', icon: 'shopping-cart', color: 'accent' },
    { id: 'cat-2', name: 'Alquiler', icon: 'home', color: 'expense' }
  ]

  const accounts: Account[] = [
    {
      id: 'acc-1',
      institution_id: 'inst-1',
      name: 'Wise EUR',
      type: 'checking',
      currency_native: 'EUR',
      credit_limit: null,
      is_active: true
    }
  ]

  const transactions: MasterTransaction[] = [
    {
      id: 'tx-1',
      parent_transaction_id: null,
      date: new Date().toISOString().slice(0, 10),
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
      category_id: 'cat-1',
      person_id: null,
      installment_current: 1,
      installment_total: 1,
      status: 'COMPLETED',
      notes: 'Supermercado semanal',
      settled_at: null
    },
    {
      id: 'tx-2',
      parent_transaction_id: null,
      date: new Date().toISOString().slice(0, 10),
      type: 'INCOME',
      amount_original: 800,
      currency_original: 'EUR',
      fee_amount: 0,
      exchange_rate: 1,
      rate_overridden: false,
      amount_account: 800,
      currency_account: 'EUR',
      institution_id: 'inst-1',
      account_id: 'acc-1',
      category_id: null,
      person_id: null,
      installment_current: 1,
      installment_total: 1,
      status: 'COMPLETED',
      notes: 'Pago remoto',
      settled_at: null
    }
  ]

  it('renderiza las KPI cards con montos y porcentajes', () => {
    render(
      <AnalyticsDashboard
        initialTransactions={transactions}
        categories={categories}
        accounts={accounts}
        displayCurrency="EUR"
      />
    )

    expect(screen.getAllByText('Gastos').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Ingresos').length).toBeGreaterThan(0)
    expect(screen.getByText('Flujo Neto')).toBeInTheDocument()
    expect(screen.getByText('Tasa de Ahorro')).toBeInTheDocument()
    expect(screen.getByText('Promedio Diario')).toBeInTheDocument()
  })

  it('muestra la sección de categorías con porcentajes', () => {
    render(
      <AnalyticsDashboard
        initialTransactions={transactions}
        categories={categories}
        accounts={accounts}
        displayCurrency="EUR"
      />
    )

    expect(screen.getByText('Gastos por Categoría')).toBeInTheDocument()
    expect(screen.getByText('Supermercado')).toBeInTheDocument()
  })

  it('permite cambiar el período seleccionado', () => {
    render(
      <AnalyticsDashboard
        initialTransactions={transactions}
        categories={categories}
        accounts={accounts}
        displayCurrency="EUR"
      />
    )

    const btn3M = screen.getByText('Últimos 3 meses')
    fireEvent.click(btn3M)
    expect(btn3M).toHaveClass('bg-accent')
  })

  it('renderiza el Master Switch y permite alternar entre Solo personales y Todos', () => {
    const people: Person[] = [
      { id: 'p-friend', name: 'Martín G.', phone: null, is_active: true, created_at: '' }
    ]
    const txWithThirdParty: MasterTransaction[] = [
      ...transactions,
      {
        id: 'tx-third',
        parent_transaction_id: null,
        date: new Date().toISOString().slice(0, 10),
        type: 'OUTCOME',
        amount_original: 50,
        currency_original: 'EUR',
        fee_amount: 0,
        exchange_rate: 1,
        rate_overridden: false,
        amount_account: 50,
        currency_account: 'EUR',
        institution_id: 'inst-1',
        account_id: 'acc-1',
        category_id: 'cat-1',
        person_id: 'p-friend',
        installment_current: 1,
        installment_total: 1,
        status: 'COMPLETED',
        notes: 'Gasto compartido',
        settled_at: null
      }
    ]

    render(
      <AnalyticsDashboard
        initialTransactions={txWithThirdParty}
        categories={categories}
        accounts={accounts}
        people={people}
        displayCurrency="EUR"
      />
    )

    // Por defecto está en 'Solo personales': el gasto de 120 EUR se muestra, 50 EUR está excluido
    expect(screen.getByText('Solo personales')).toBeInTheDocument()
    expect(screen.getByText('Todos')).toBeInTheDocument()
    expect(screen.getByText('(1 de terceros excluido)')).toBeInTheDocument()
    expect(screen.getAllByText('€ 120,00').length).toBeGreaterThan(0)
    expect(screen.queryByText('€ 170,00')).not.toBeInTheDocument()

    // Al alternar a 'Todos', se incluyen los 50 EUR (120 + 50 = 170 EUR)
    const btnTodos = screen.getByText('Todos')
    fireEvent.click(btnTodos)

    expect(screen.getAllByText('€ 170,00').length).toBeGreaterThan(0)
  })
})
