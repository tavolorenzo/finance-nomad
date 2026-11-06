import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BudgetEstimateModal } from './BudgetEstimateModal'
import * as onlineHook from '@/lib/hooks/use-online-status'
import * as budgetActions from '@/app/(protected)/budget/actions'

vi.mock('@/lib/hooks/use-online-status', () => ({
  useOnlineStatus: vi.fn()
}))

vi.mock('@/app/(protected)/budget/actions', () => ({
  createBudgetEstimate: vi.fn(),
  updateBudgetEstimate: vi.fn()
}))

vi.mock('@/components/CategoryModal', () => ({
  CategoryModal: () => null
}))

describe('BudgetEstimateModal', () => {
  const categories = [
    { id: 'cat-1', name: 'Vivienda', is_active: true },
    { id: 'cat-2', name: 'Servicios', is_active: true }
  ]
  const accounts = [
    {
      id: 'acc-1',
      institution_id: 'inst-1',
      name: 'Cuenta Itaú',
      type: 'checking' as const,
      currency_native: 'UYU',
      credit_limit: null,
      is_active: true,
      institutions: { name: 'Itaú' }
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(onlineHook.useOnlineStatus).mockReturnValue(true)
  })

  it('muestra aviso preventivo y deshabilita el botón de envío si el usuario está offline', () => {
    vi.mocked(onlineHook.useOnlineStatus).mockReturnValue(false)

    render(
      <BudgetEstimateModal
        isOpen={true}
        onClose={vi.fn()}
        categories={categories}
        accounts={accounts}
        currencies={['USD', 'UYU']}
        displayCurrency="USD"
      />
    )

    expect(
      screen.getByText(/Estás sin conexión\. Conectate a internet para guardar/i)
    ).toBeInTheDocument()
    const submitBtn = screen.getByRole('button', { name: /Crear estimación/i })
    expect(submitBtn).toBeDisabled()
  })

  it('envía los datos correctamente al crear una nueva estimación', async () => {
    const onClose = vi.fn()
    const onSuccess = vi.fn()
    vi.mocked(budgetActions.createBudgetEstimate).mockResolvedValue({ id: 'est-1' } as any)

    render(
      <BudgetEstimateModal
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
        categories={categories}
        accounts={accounts}
        currencies={['USD', 'UYU']}
        displayCurrency="USD"
      />
    )

    fireEvent.change(screen.getByLabelText(/Nombre \/ Concepto/i), {
      target: { value: 'Alquiler Mensual' }
    })
    fireEvent.change(screen.getByLabelText(/Monto mensual estimado/i), {
      target: { value: '950' }
    })
    fireEvent.change(screen.getByLabelText(/Día de vencimiento/i), {
      target: { value: '8' }
    })

    fireEvent.click(screen.getByRole('button', { name: /Crear estimación/i }))

    await waitFor(() => {
      expect(budgetActions.createBudgetEstimate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Alquiler Mensual',
          type: 'EXPENSE_ESTIMATE',
          estimatedAmount: 950,
          currency: 'USD',
          categoryId: 'cat-1',
          dueDay: 8
        })
      )
    })
    expect(onSuccess).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
})
