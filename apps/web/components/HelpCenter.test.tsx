import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HelpCenter } from './HelpCenter'

// Mock de localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    clear: () => {
      store = {}
    }
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('HelpCenter Component', () => {
  it('renderiza la cabecera, el buscador y las pestañas principales', () => {
    render(<HelpCenter currentCurrency="EUR" />)

    expect(screen.getByText('Centro de Ayuda & Wiki')).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText(
        'Buscá por palabra clave (ej. cuotas, cotización, whatsapp, offline, tarjetas)...'
      )
    ).toBeInTheDocument()

    expect(screen.getByText('Wiki & Guías')).toBeInTheDocument()
    expect(screen.getByText('Preguntas Frecuentes')).toBeInTheDocument()
    expect(screen.getByText('Recetas Rápidas')).toBeInTheDocument()
  })

  it('muestra artículos de la Wiki por defecto', () => {
    render(<HelpCenter currentCurrency="EUR" />)

    expect(
      screen.getByText('Multi-moneda y Cotizaciones en Vivo (FX)')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Tarjetas de Crédito y Cuotas Diferidas')
    ).toBeInTheDocument()
  })

  it('permite alternar a la pestaña de Preguntas Frecuentes y expandir una FAQ', () => {
    render(<HelpCenter currentCurrency="EUR" />)

    const faqTab = screen.getByText('Preguntas Frecuentes')
    fireEvent.click(faqTab)

    expect(
      screen.getByText(
        '¿Cómo calcula Finance Nomad el tipo de cambio entre divisas?'
      )
    ).toBeInTheDocument()

    // Clic en la primera pregunta para expandirla
    const questionButton = screen.getByText(
      '¿Cómo calcula Finance Nomad el tipo de cambio entre divisas?'
    )
    fireEvent.click(questionButton)

    // Debe mostrar la respuesta
    expect(
      screen.getByText(/La app consulta los tipos de cambio de mercado en tiempo real/i)
    ).toBeInTheDocument()
  })

  it('permite alternar a la pestaña de Recetas Rápidas', () => {
    render(<HelpCenter currentCurrency="EUR" />)

    const guidesTab = screen.getByText('Recetas Rápidas')
    fireEvent.click(guidesTab)

    expect(
      screen.getByText('Cargar una cena compartida con amigos')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Registrar una compra en cuotas con tarjeta')
    ).toBeInTheDocument()
  })

  it('filtra contenido en vivo al escribir en el buscador', () => {
    render(<HelpCenter currentCurrency="EUR" />)

    const searchInput = screen.getByPlaceholderText(
      'Buscá por palabra clave (ej. cuotas, cotización, whatsapp, offline, tarjetas)...'
    )
    fireEvent.change(searchInput, { target: { value: 'whatsapp' } })

    // Debe seguir en wiki o mostrar coincidencias
    expect(
      screen.getByText('Personas, Gastos Compartidos y Cuentas por Cobrar')
    ).toBeInTheDocument()
  })

  it('muestra estado vacío cuando ninguna coincidencia existe', () => {
    render(<HelpCenter currentCurrency="EUR" />)

    const searchInput = screen.getByPlaceholderText(
      'Buscá por palabra clave (ej. cuotas, cotización, whatsapp, offline, tarjetas)...'
    )
    fireEvent.change(searchInput, {
      target: { value: 'supercalifragilisticoespialidoso' }
    })

    expect(
      screen.getByText('No encontramos resultados para tu búsqueda')
    ).toBeInTheDocument()

    // Limpiar filtros restablece la vista
    const clearButton = screen.getByText('Limpiar filtros y ver todo')
    fireEvent.click(clearButton)

    expect(
      screen.getByText('Multi-moneda y Cotizaciones en Vivo (FX)')
    ).toBeInTheDocument()
  })
})
