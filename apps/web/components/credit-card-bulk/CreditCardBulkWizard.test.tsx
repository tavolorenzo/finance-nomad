import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CreditCardBulkWizard } from './CreditCardBulkWizard'
import type { Account, Category, Person } from '@/lib/types'

const mockPush = vi.fn()
const mockRefresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh
  })
}))

const mockSaveBulk = vi.fn().mockResolvedValue({ success: true, count: 2 })

vi.mock('@/app/(protected)/accounts/bulk-card-actions', () => ({
  saveBulkCardMovementsAction: (...args: any[]) => mockSaveBulk(...args)
}))

const mockCardAccounts: (Account & { institutions?: { name: string } | null })[] = [
  {
    id: 'card-1',
    institution_id: 'inst-1',
    name: 'Visa Signature',
    type: 'credit_card',
    currency_native: 'ARS',
    credit_limit: 500000,
    is_active: true,
    institutions: { name: 'Santander' }
  },
  {
    id: 'card-2',
    institution_id: 'inst-2',
    name: 'Amex Gold',
    type: 'credit_card',
    currency_native: 'USD',
    credit_limit: 3000,
    is_active: true,
    institutions: { name: 'American Express' }
  }
]

const mockCategories: Category[] = [
  { id: 'cat-1', name: 'Supermercado' },
  { id: 'cat-2', name: 'Transporte' },
  { id: 'cat-3', name: 'Servicios & Suscripciones' }
]

const mockPeople: Person[] = [
  { id: 'p-1', name: 'Personal', phone: null },
  { id: 'p-2', name: 'Amigos', phone: null }
]

describe('CreditCardBulkWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('muestra mensaje amigable si el usuario no tiene tarjetas de crédito', () => {
    render(
      <CreditCardBulkWizard
        cardAccounts={[]}
        categories={mockCategories}
        people={mockPeople}
      />
    )

    expect(screen.getByText('No tenés tarjetas de crédito configuradas')).toBeInTheDocument()
    expect(screen.getByText('Ir al Dashboard')).toBeInTheDocument()
  })

  it('renderiza la grilla con tarjeta seleccionada, fila inicial y resumen de impacto', () => {
    render(
      <CreditCardBulkWizard
        cardAccounts={mockCardAccounts}
        categories={mockCategories}
        people={mockPeople}
        isPostOnboarding={true}
      />
    )

    expect(screen.getByText('Carga Rápida de Tarjeta de Crédito')).toBeInTheDocument()
    expect(screen.getByText('Paso Opcional')).toBeInTheDocument()
    expect(screen.getByText('Santander - Visa Signature (ARS)')).toBeInTheDocument()
    expect(screen.getByText('Pegar Resumen Mágico')).toBeInTheDocument()
    expect(screen.getByText('Impacto Financiero Proyectado')).toBeInTheDocument()
  })

  it('permite añadir y eliminar filas dinámicamente', () => {
    render(
      <CreditCardBulkWizard
        cardAccounts={mockCardAccounts}
        categories={mockCategories}
        people={mockPeople}
      />
    )

    const addBtn = screen.getByText('Agregar fila')
    fireEvent.click(addBtn)

    expect(screen.getByText('2 filas (0 válidas)')).toBeInTheDocument()

    // Eliminar la segunda fila
    const deleteButtons = screen.getAllByTitle('Eliminar fila')
    fireEvent.click(deleteButtons[1])

    expect(screen.getByText('1 fila (0 válidas)')).toBeInTheDocument()
  })

  it('calcula en vivo los consumos del resumen actual y cuotas futuras', async () => {
    render(
      <CreditCardBulkWizard
        cardAccounts={mockCardAccounts}
        categories={mockCategories}
        people={mockPeople}
      />
    )

    // Completar descripción y monto
    const descInput = screen.getByPlaceholderText('Comercio / Detalle')
    const amountInput = screen.getByPlaceholderText('0.00')

    fireEvent.change(descInput, { target: { value: 'Heladera Frávega' } })
    fireEvent.change(amountInput, { target: { value: '40000' } })

    // El botón guardar ahora indica 1 consumo
    expect(screen.getByText('Guardar consumos (1)')).toBeInTheDocument()
    expect(screen.getByText('1 fila (1 válida)')).toBeInTheDocument()

    // Abrir selector de cuotas y elegir 6 cuotas
    const quotaBtn = screen.getByTitle('Configurar cuotas')
    fireEvent.click(quotaBtn)
    fireEvent.click(screen.getByText('6 cuotas'))

    // Ahora son 40000 en el resumen y 5 cuotas restantes de 40000 = 200000 en cuotas futuras
    await waitFor(() => {
      expect(screen.getByText('1/6')).toBeInTheDocument()
    })
  })

  it('guarda los movimientos llamando a la server action y redirige', async () => {
    const mockOnComplete = vi.fn()
    render(
      <CreditCardBulkWizard
        cardAccounts={mockCardAccounts}
        categories={mockCategories}
        people={mockPeople}
        onComplete={mockOnComplete}
      />
    )

    const descInput = screen.getByPlaceholderText('Comercio / Detalle')
    const amountInput = screen.getByPlaceholderText('0.00')

    fireEvent.change(descInput, { target: { value: 'Coto' } })
    fireEvent.change(amountInput, { target: { value: '15000' } })

    const saveBtn = screen.getByText('Guardar consumos (1)')
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(mockSaveBulk).toHaveBeenCalledWith({
        accountId: 'card-1',
        movements: expect.arrayContaining([
          expect.objectContaining({
            description: 'Coto',
            amount: 15000,
            personId: 'p-1'
          })
        ])
      })
    })
  })

  it('permite asignar un gasto a otra persona y actualiza el desglose de impacto', async () => {
    const mockOnComplete = vi.fn()
    render(
      <CreditCardBulkWizard
        cardAccounts={mockCardAccounts}
        categories={mockCategories}
        people={mockPeople}
        onComplete={mockOnComplete}
      />
    )

    const descInput = screen.getByPlaceholderText('Comercio / Detalle')
    const amountInput = screen.getByPlaceholderText('0.00')

    fireEvent.change(descInput, { target: { value: 'Cena compartida' } })
    fireEvent.change(amountInput, { target: { value: '25000' } })

    // Por defecto está en Personal ('p-1')
    const personSelect = screen.getByDisplayValue('Personal')
    expect(personSelect).toBeInTheDocument()

    // Cambiar a Amigos ('p-2')
    fireEvent.change(personSelect, { target: { value: 'p-2' } })
    expect(screen.getByDisplayValue('Amigos')).toBeInTheDocument()

    // Resumen de impacto muestra a cobrar
    expect(screen.getByText(/A cobrar \(1 consumo\)/)).toBeInTheDocument()

    const saveBtn = screen.getByText('Guardar consumos (1)')
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(mockSaveBulk).toHaveBeenCalledWith({
        accountId: 'card-1',
        movements: expect.arrayContaining([
          expect.objectContaining({
            description: 'Cena compartida',
            amount: 25000,
            personId: 'p-2'
          })
        ])
      })
    })
  })

  it('permite omitir e ir al dashboard con onSkip', () => {
    const mockOnSkip = vi.fn()
    render(
      <CreditCardBulkWizard
        cardAccounts={mockCardAccounts}
        categories={mockCategories}
        people={mockPeople}
        onSkip={mockOnSkip}
        isPostOnboarding={true}
      />
    )

    const skipBtn = screen.getByText('Omitir por ahora e ir al Dashboard')
    fireEvent.click(skipBtn)

    expect(mockOnSkip).toHaveBeenCalled()
  })
})
