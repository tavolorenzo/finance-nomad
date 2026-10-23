import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CurrencyManagerCard } from './CurrencyManagerCard'
import type { ActiveCurrency } from '@/lib/types'

const mockUpdateActiveCurrencies = vi.fn().mockResolvedValue({ success: true })
vi.mock('@/app/(protected)/settings/actions', () => ({
  updateActiveCurrencies: (...args: any[]) => mockUpdateActiveCurrencies(...args)
}))

let mockIsOnline = true
vi.mock('@/lib/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockIsOnline
}))

describe('CurrencyManagerCard', () => {
  const initialCurrencies: ActiveCurrency[] = [
    { code: 'USD', name: 'Dólar estadounidense', symbol: '$', flag: '🇺🇸', rate_mode: 'auto' },
    { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', rate_mode: 'auto' },
    { code: 'ARS', name: 'Peso argentino', symbol: '$', flag: '🇦🇷', rate_mode: 'manual', custom_rate_against_global: 1280 }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockIsOnline = true
  })

  it('renderiza las divisas iniciales y marca la moneda global', () => {
    render(<CurrencyManagerCard initialCurrencies={initialCurrencies} displayCurrency="USD" />)

    expect(screen.getByText('Tus divisas y cotizaciones')).toBeInTheDocument()
    expect(screen.getByText('Moneda global')).toBeInTheDocument()
    expect(screen.getByText('1 USD = 1280 ARS (Manual)')).toBeInTheDocument()
    expect(screen.getByText('Cotización en vivo (API)')).toBeInTheDocument()
  })

  it('permite abrir el modal de catálogo para agregar otra divisa', () => {
    render(<CurrencyManagerCard initialCurrencies={initialCurrencies} displayCurrency="USD" />)

    fireEvent.click(screen.getByText('Agregar divisa'))
    expect(screen.getByPlaceholderText(/Buscá por nombre, código o país/i)).toBeInTheDocument()
  })

  it('permite alternar a modo de ajuste manual e ingresar cotización', async () => {
    render(<CurrencyManagerCard initialCurrencies={initialCurrencies} displayCurrency="USD" />)

    // EUR está en modo auto, hacemos click en 'Ajustar manual'
    const adjustBtns = screen.getAllByText('Ajustar manual')
    fireEvent.click(adjustBtns[0])

    const input = screen.getByPlaceholderText('Ej. 1280')
    expect(input).toBeInTheDocument()

    fireEvent.change(input, { target: { value: '0.92' } })
    const saveBtn = screen.getByTitle('Guardar cotización')
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(mockUpdateActiveCurrencies).toHaveBeenCalled()
    })
  })
})
