import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WelcomeWizard, detectRecommendedCurrency } from './WelcomeWizard'

const mockPush = vi.fn()
const mockRefresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh
  })
}))

const mockSeedUserSpace = vi.fn().mockResolvedValue({ success: true })
const mockSkipWelcome = vi.fn().mockResolvedValue({ success: true })

vi.mock('@/app/welcome/actions', () => ({
  seedUserSpaceAction: (...args: any[]) => mockSeedUserSpace(...args),
  skipWelcomeAction: (...args: any[]) => mockSkipWelcome(...args)
}))

let mockIsOnline = true
vi.mock('@/lib/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockIsOnline
}))

describe('WelcomeWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsOnline = true
  })

  it('detecta correctamente la moneda recomendada según la región', () => {
    const currency = detectRecommendedCurrency()
    expect(['EUR', 'USD', 'AUD', 'UYU', 'GBP', 'NZD']).toContain(currency)
  })

  it('renderiza el paso 1 con las opciones de divisa y progreso de 5 pasos', () => {
    render(<WelcomeWizard />)
    expect(screen.getByText('¿Cuál es tu moneda de referencia?')).toBeInTheDocument()
    expect(screen.getByText('Paso 1 de 5')).toBeInTheDocument()
    expect(screen.getByText('EUR')).toBeInTheDocument()
    expect(screen.getByText('USD')).toBeInTheDocument()
    expect(screen.getByText('AUD')).toBeInTheDocument()
    expect(screen.getByText('UYU')).toBeInTheDocument()
  })

  it('permite avanzar al paso 2 y configurar instituciones, cuentas y saldo inicial', () => {
    render(<WelcomeWizard />)

    // Cambiar a USD
    fireEvent.click(screen.getByText('USD'))

    // Avanzar al paso 2
    fireEvent.click(screen.getByText('Continuar'))
    expect(screen.getByText('Instituciones y Cuentas')).toBeInTheDocument()
    expect(screen.getByText('Paso 2 de 5')).toBeInTheDocument()

    // Comprobar instituciones iniciales
    expect(screen.getByDisplayValue('Mi Banco Principal')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Billetera')).toBeInTheDocument()

    // Agregar otra institución
    const addInstBtn = screen.getByText('Agregar otra institución (banco o billetera)')
    fireEvent.click(addInstBtn)
    expect(screen.getByDisplayValue('Otro Banco o Billetera')).toBeInTheDocument()

    // Cargar saldo inicial en una cuenta
    const balanceInputs = screen.getAllByPlaceholderText('0.00')
    expect(balanceInputs.length).toBeGreaterThan(0)
    fireEvent.change(balanceInputs[0], { target: { value: '1500.50' } })
    expect(balanceInputs[0]).toHaveValue(1500.5)
  })

  it('permite retroceder con el botón Atrás', () => {
    render(<WelcomeWizard />)
    fireEvent.click(screen.getByText('Continuar'))
    expect(screen.getByText('Paso 2 de 5')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Atrás'))
    expect(screen.getByText('Paso 1 de 5')).toBeInTheDocument()
  })

  it('avanza a paso 3 de categorías y permite agregar categorías personalizadas', () => {
    render(<WelcomeWizard />)
    fireEvent.click(screen.getByText('Continuar')) // 1 -> 2
    fireEvent.click(screen.getByText('Continuar')) // 2 -> 3

    expect(screen.getByText('Categorías de gastos e ingresos')).toBeInTheDocument()
    expect(screen.getByText('Paso 3 de 5')).toBeInTheDocument()
    expect(screen.getByText('Supermercado')).toBeInTheDocument()

    // Agregar categoría personalizada
    const catInput = screen.getByPlaceholderText('Ej. Gimnasio, Mascotas, Educación...')
    fireEvent.change(catInput, { target: { value: 'Gimnasio' } })
    fireEvent.click(screen.getByText('Agregar'))
    expect(screen.getByText('Gimnasio')).toBeInTheDocument()
  })

  it('avanza a paso 4 de personas y permite registrar contactos para Split Pay', () => {
    render(<WelcomeWizard />)
    fireEvent.click(screen.getByText('Continuar')) // 1 -> 2
    fireEvent.click(screen.getByText('Continuar')) // 2 -> 3
    fireEvent.click(screen.getByText('Continuar')) // 3 -> 4

    expect(screen.getByText('Personas y gastos compartidos')).toBeInTheDocument()
    expect(screen.getByText('Paso 4 de 5')).toBeInTheDocument()
    expect(screen.getByText('Personal (Tus consumos propios)')).toBeInTheDocument()

    // Agregar contacto
    const personInput = screen.getByPlaceholderText('Nombre del contacto (ej. Diego, Romina, Gladys, Mamá...)')
    fireEvent.change(personInput, { target: { value: 'Diego' } })
    fireEvent.click(screen.getByText('Agregar'))
    expect(screen.getByText('Diego')).toBeInTheDocument()
  })

  it('avanza al paso 5 de confirmación y lanza la animación interactiva al inicializar', async () => {
    render(<WelcomeWizard />)
    fireEvent.click(screen.getByText('Continuar')) // 1 -> 2
    fireEvent.click(screen.getByText('Continuar')) // 2 -> 3
    fireEvent.click(screen.getByText('Continuar')) // 3 -> 4
    fireEvent.click(screen.getByText('Continuar')) // 4 -> 5

    expect(screen.getByText('¡Todo listo para arrancar!')).toBeInTheDocument()
    expect(screen.getByText('Paso 5 de 5')).toBeInTheDocument()

    // Presionar botón de finalización
    const finishBtn = screen.getByText('Configurá mi espacio →')
    fireEvent.click(finishBtn)

    // Debe mostrar la animación de configuración
    expect(screen.getByText('Configurando tu espacio financiero...')).toBeInTheDocument()

    await waitFor(() => {
      expect(mockSeedUserSpace).toHaveBeenCalledTimes(1)
    })
  })

  it('permite omitir el asistente con el enlace superior', async () => {
    render(<WelcomeWizard />)
    fireEvent.click(screen.getByText('Omitir y empezar en blanco →'))

    await waitFor(() => {
      expect(mockSkipWelcome).toHaveBeenCalledTimes(1)
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('muestra aviso preventivo y bloquea la acción si está offline', () => {
    mockIsOnline = false
    render(<WelcomeWizard />)

    expect(
      screen.getByText('Estás sin conexión a internet. Para inicializar tu espacio necesitás estar online.')
    ).toBeInTheDocument()

    // Omitir debe estar deshabilitado
    const skipBtn = screen.getByText('Omitir y empezar en blanco →')
    expect(skipBtn).toBeDisabled()
  })

  it('permite seleccionar ARS como divisa global en el paso 1', () => {
    render(<WelcomeWizard />)
    expect(screen.getByText('ARS')).toBeInTheDocument()
    fireEvent.click(screen.getByText('ARS'))
    expect(screen.getByText('Peso argentino')).toBeInTheDocument()
  })

  it('abre el modal de catálogo de monedas al hacer click en Más monedas', () => {
    render(<WelcomeWizard />)
    const moreBtn = screen.getByText('Más monedas')
    fireEvent.click(moreBtn)
    expect(screen.getByText('Elegí una divisa')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Buscá por nombre, código o país/i)).toBeInTheDocument()
  })

  it('no incluye la opción de inversión en el selector de tipo de cuenta', () => {
    render(<WelcomeWizard />)
    fireEvent.click(screen.getByText('Continuar')) // 1 -> 2
    expect(screen.getByText('Instituciones y Cuentas')).toBeInTheDocument()

    // Comprobar que no hay ninguna opción de inversión en el DOM
    expect(screen.queryByText('Inversión')).toBeNull()
    expect(screen.queryByRole('option', { name: /inversión/i })).toBeNull()
  })

  it('distingue tarjetas de crédito mostrando Límite de crédito y enviándolo en seedUserSpaceAction', async () => {
    render(<WelcomeWizard />)
    fireEvent.click(screen.getByText('Continuar')) // 1 -> 2

    // Agregar una tarjeta de crédito en la primera institución
    const addAccBtn = screen.getAllByText(/Agregar otra cuenta a/i)[0]
    fireEvent.click(addAccBtn)

    // Verificar que aparece el campo "Límite de crédito"
    expect(screen.getByText('Límite de crédito')).toBeInTheDocument()

    // Seleccionar el input mediante su label accesible e ingresar el valor
    const cardLimitInput = screen.getByLabelText('Límite de crédito')
    fireEvent.change(cardLimitInput, { target: { value: '250000' } })

    // Avanzar hasta finalizar
    fireEvent.click(screen.getByText('Continuar')) // 2 -> 3
    fireEvent.click(screen.getByText('Continuar')) // 3 -> 4
    fireEvent.click(screen.getByText('Continuar')) // 4 -> 5

    const finishBtn = screen.getByText('Configurá mi espacio →')
    fireEvent.click(finishBtn)

    await waitFor(() => {
      expect(mockSeedUserSpace).toHaveBeenCalledTimes(1)
      const callArg = mockSeedUserSpace.mock.calls[0][0]
      const cardAccount = callArg.accounts.find((a: any) => a.type === 'credit_card')
      expect(cardAccount).toBeDefined()
      expect(cardAccount.creditLimit).toBe(250000)
      expect(cardAccount.initialBalance).toBeUndefined()
    })
  })
})
