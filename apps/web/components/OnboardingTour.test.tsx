import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OnboardingTour } from './OnboardingTour'

describe('OnboardingTour', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('no renderiza nada si isOpen es false', () => {
    const { container } = render(<OnboardingTour isOpen={false} onClose={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('renderiza el paso 1 cuando isOpen es true', () => {
    render(<OnboardingTour isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('¡Te damos la bienvenida a Finance Nomad!')).toBeInTheDocument()
    expect(screen.getByText(/Paso 1 de 5/i)).toBeInTheDocument()
  })

  it('avanza al paso 2 y permite seleccionar divisa', () => {
    const onCurrencyChange = vi.fn()
    render(
      <OnboardingTour
        isOpen={true}
        onClose={vi.fn()}
        currentCurrency="EUR"
        onCurrencyChange={onCurrencyChange}
      />
    )

    fireEvent.click(screen.getByText('Siguiente'))
    expect(screen.getByText('Tu moneda global de referencia')).toBeInTheDocument()
    expect(screen.getByText(/Paso 2 de 5/i)).toBeInTheDocument()

    // Seleccionar USD
    const usdBtn = screen.getByText('Dólar USA ($)').closest('button')!
    fireEvent.click(usdBtn)
    expect(onCurrencyChange).toHaveBeenCalledWith('USD')
  })

  it('permite retroceder con el botón Anterior', () => {
    render(<OnboardingTour isOpen={true} onClose={vi.fn()} />)

    fireEvent.click(screen.getByText('Siguiente'))
    expect(screen.getByText(/Paso 2 de 5/i)).toBeInTheDocument()

    fireEvent.click(screen.getByText('Anterior'))
    expect(screen.getByText(/Paso 1 de 5/i)).toBeInTheDocument()
  })

  it('guarda en localStorage y llama a onClose al omitir o finalizar', () => {
    const onClose = vi.fn()
    render(<OnboardingTour isOpen={true} onClose={onClose} />)

    fireEvent.click(screen.getByText('Omitir tour'))
    expect(localStorage.getItem('finance_nomad_tour_completed')).toBe('true')
    expect(onClose).toHaveBeenCalled()
  })
})
