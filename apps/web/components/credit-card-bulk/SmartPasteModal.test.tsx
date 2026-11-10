import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SmartPasteModal } from './SmartPasteModal'

describe('SmartPasteModal', () => {
  const mockCategories = [
    { id: 'cat-1', name: 'Supermercado' },
    { id: 'cat-2', name: 'Transporte' }
  ]
  const mockPeople = [{ id: 'p-1', name: 'Personal' }]

  it('no renderiza nada cuando isOpen es false', () => {
    const { container } = render(
      <SmartPasteModal
        isOpen={false}
        onClose={vi.fn()}
        onApply={vi.fn()}
        defaultCurrency="ARS"
        categories={mockCategories}
        people={mockPeople}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('permite cargar el ejemplo, detecta movimientos en vivo y los aplica', () => {
    const mockOnApply = vi.fn()
    const mockOnClose = vi.fn()

    render(
      <SmartPasteModal
        isOpen={true}
        onClose={mockOnClose}
        onApply={mockOnApply}
        defaultCurrency="ARS"
        categories={mockCategories}
        people={mockPeople}
      />
    )

    expect(screen.getByText('Pegado Mágico de Resumen')).toBeInTheDocument()

    // Cargar ejemplo
    const exampleBtn = screen.getByText('Cargar ejemplo')
    fireEvent.click(exampleBtn)

    // Debe detectar los movimientos del ejemplo
    expect(screen.getByText(/Movimientos detectados:/)).toBeInTheDocument()
    expect(screen.getByText('Volcar a la grilla (4)')).toBeInTheDocument()

    // Aplicar a la grilla
    const applyBtn = screen.getByText('Volcar a la grilla (4)')
    fireEvent.click(applyBtn)

    expect(mockOnApply).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          description: expect.stringContaining('COTO'),
          amount: 14500,
          personId: 'p-1'
        })
      ])
    )
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('permite cambiar la persona por defecto en el pegado mágico', () => {
    const mockOnApply = vi.fn()
    const peopleWithFriends = [
      { id: 'p-1', name: 'Personal' },
      { id: 'p-2', name: 'Amigos' }
    ]

    render(
      <SmartPasteModal
        isOpen={true}
        onClose={vi.fn()}
        onApply={mockOnApply}
        defaultCurrency="ARS"
        categories={mockCategories}
        people={peopleWithFriends}
      />
    )

    // Cambiar la persona a Amigos
    const personSelect = screen.getByDisplayValue('Personal (por defecto)')
    fireEvent.change(personSelect, { target: { value: 'p-2' } })

    // Cargar ejemplo
    fireEvent.click(screen.getByText('Cargar ejemplo'))

    // Aplicar a la grilla
    const applyBtn = screen.getByText('Volcar a la grilla (4)')
    fireEvent.click(applyBtn)

    expect(mockOnApply).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          personId: 'p-2'
        })
      ])
    )
  })

  it('muestra la leyenda recordatoria de verificación y permite asignar moneda a todas las filas', () => {
    const mockOnApply = vi.fn()

    render(
      <SmartPasteModal
        isOpen={true}
        onClose={vi.fn()}
        onApply={mockOnApply}
        defaultCurrency="UYU"
        categories={mockCategories}
        people={mockPeople}
      />
    )

    expect(
      screen.getByText(/Recordá verificar las filas antes de confirmar:/i)
    ).toBeInTheDocument()

    // Cargar ejemplo y asignar USD a todas las filas
    fireEvent.click(screen.getByText('Cargar ejemplo'))
    const currencySelect = screen.getByLabelText(/Moneda a importar:/i)
    fireEvent.change(currencySelect, { target: { value: 'USD' } })

    fireEvent.click(screen.getByText('Volcar a la grilla (4)'))

    expect(mockOnApply).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ currency: 'USD' }),
        expect.objectContaining({ currency: 'USD', isRefund: true })
      ])
    )
  })

  it('funciona en modo cuenta bancaria / home banking y permite alternar Gasto / Ingreso', () => {
    const mockOnApply = vi.fn()
    const mockOnClose = vi.fn()

    render(
      <SmartPasteModal
        isOpen={true}
        onClose={mockOnClose}
        onApply={mockOnApply}
        defaultCurrency="ARS"
        accountType="checking"
        categories={mockCategories}
        people={mockPeople}
      />
    )

    expect(screen.getByText('Pegado Mágico de Home Banking')).toBeInTheDocument()

    // Cargar ejemplo bancario
    fireEvent.click(screen.getByText('Cargar ejemplo'))

    // Debe mostrar los movimientos y botones de Gasto e Ingreso
    expect(screen.getByText('Volcar a la grilla (5)')).toBeInTheDocument()
    const ingresoButtons = screen.getAllByRole('button', { name: 'Ingreso' })
    expect(ingresoButtons.length).toBeGreaterThan(0)

    // Alternar el primer ingreso a gasto
    fireEvent.click(ingresoButtons[0])

    // Volcar a la grilla
    fireEvent.click(screen.getByText('Volcar a la grilla (5)'))
    expect(mockOnApply).toHaveBeenCalled()
    expect(mockOnClose).toHaveBeenCalled()
  })
})
