import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AccountBulkWizard } from './AccountBulkWizard'
import * as bulkActions from '@/app/(protected)/accounts/bulk-card-actions'
import type { Account, Category, Person } from '@/lib/types'

const mockPush = vi.fn()
const mockRefresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh
  })
}))

vi.spyOn(bulkActions, 'saveBulkCardMovementsAction').mockResolvedValue({
  success: true,
  count: 1,
  movementsCount: 1
})

describe('AccountBulkWizard', () => {
  const mockAccount: Account & { institutions: { name: string } } = {
    id: 'acc-1',
    user_id: 'user-1',
    institution_id: 'inst-1',
    name: 'Caja de Ahorro Santander',
    type: 'checking',
    currency_native: 'ARS',
    credit_limit: null,
    closing_day: null,
    is_active: true,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    institutions: { name: 'Banco Santander' }
  }

  const mockCategories: Category[] = [
    {
      id: 'cat-super',
      user_id: 'user-1',
      name: 'Supermercado',
      type: 'OUTCOME',
      icon: 'shopping-cart',
      color: '#10B981',
      is_active: true,
      created_at: '2026-01-01',
      updated_at: '2026-01-01'
    }
  ]

  const mockPeople: Person[] = [
    {
      id: 'p-1',
      user_id: 'user-1',
      name: 'Personal',
      is_active: true,
      created_at: '2026-01-01',
      updated_at: '2026-01-01'
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza cabecera, enlace de retorno y resumen financiero', () => {
    render(
      <AccountBulkWizard
        account={mockAccount}
        categories={mockCategories}
        people={mockPeople}
      />
    )

    expect(
      screen.getByRole('heading', { name: /Carga Rápida de Cuenta · Caja de Ahorro Santander/i })
    ).toBeInTheDocument()
    expect(screen.getByText('Volver a Caja de Ahorro Santander')).toBeInTheDocument()
    expect(screen.getByText('Impacto Financiero del Bloque')).toBeInTheDocument()
    expect(screen.getByText('Total Gastos')).toBeInTheDocument()
    expect(screen.getByText('Total Ingresos')).toBeInTheDocument()
    expect(screen.getByText('Saldo Neto Resultante')).toBeInTheDocument()
  })

  it('permite agregar y eliminar filas en la grilla', () => {
    render(
      <AccountBulkWizard
        account={mockAccount}
        categories={mockCategories}
        people={mockPeople}
      />
    )

    // Inicialmente 1 fila (1 botón de eliminar)
    expect(screen.getAllByLabelText('Eliminar fila')).toHaveLength(1)

    // Agregar fila
    fireEvent.click(screen.getByRole('button', { name: /^Fila$/i }))
    expect(screen.getAllByLabelText('Eliminar fila')).toHaveLength(2)

    // Eliminar una fila
    fireEvent.click(screen.getAllByLabelText('Eliminar fila')[0])
    expect(screen.getAllByLabelText('Eliminar fila')).toHaveLength(1)
  })

  it('abre el modal de pegado mágico para home banking y vuelca los movimientos a la grilla', () => {
    render(
      <AccountBulkWizard
        account={mockAccount}
        categories={mockCategories}
        people={mockPeople}
      />
    )

    // Abrir Pegado Mágico
    fireEvent.click(screen.getByRole('button', { name: /Pegado Mágico/i }))
    expect(screen.getByText('Pegado Mágico de Home Banking')).toBeInTheDocument()

    // Cargar ejemplo bancario
    fireEvent.click(screen.getByText('Cargar ejemplo'))
    expect(screen.getByText('Volcar a la grilla (5)')).toBeInTheDocument()

    // Volcar
    fireEvent.click(screen.getByText('Volcar a la grilla (5)'))

    // Debe poblar la grilla con los 5 movimientos volcados
    expect(screen.getAllByLabelText('Eliminar fila')).toHaveLength(5)
    expect(screen.getByDisplayValue(/TRANSFERENCIA ENVIADA/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue(/SUELDO HABERES/i)).toBeInTheDocument()
  })

  it('guarda los movimientos válidos y redirige a la cuenta', async () => {
    render(
      <AccountBulkWizard
        account={mockAccount}
        categories={mockCategories}
        people={mockPeople}
      />
    )

    // Completar concepto y monto de la primera fila
    const descInput = screen.getByLabelText('Concepto')
    fireEvent.change(descInput, { target: { value: 'Pago de Internet' } })

    const amountInput = screen.getByLabelText('Monto')
    fireEvent.change(amountInput, { target: { value: '4500' } })

    // Botón Guardar
    const saveBtn = screen.getByRole('button', { name: /Guardar movimientos \(1\)/i })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(bulkActions.saveBulkCardMovementsAction).toHaveBeenCalledWith({
        accountId: 'acc-1',
        movements: expect.arrayContaining([
          expect.objectContaining({
            description: 'Pago de Internet',
            amount: 4500,
            type: 'OUTCOME'
          })
        ])
      })
    })

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/accounts/acc-1')
    })
  })

  it('muestra error si se intenta guardar sin movimientos válidos', async () => {
    render(
      <AccountBulkWizard
        account={mockAccount}
        categories={mockCategories}
        people={mockPeople}
      />
    )

    const saveBtn = screen.getByRole('button', { name: /Guardar movimientos \(0\)/i })
    expect(saveBtn).toBeDisabled()
  })
})
