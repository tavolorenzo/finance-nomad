import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WelcomeWizard } from './WelcomeWizard'

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

vi.mock('@/app/(protected)/welcome/actions', () => ({
  seedUserSpaceAction: (...args: any[]) => mockSeedUserSpace(...args),
  skipWelcomeAction: (...args: any[]) => mockSkipWelcome(...args)
}))

describe('WelcomeWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza el paso 1 con las opciones de divisa', () => {
    render(<WelcomeWizard />)
    expect(screen.getByText('¿Cuál es tu divisa de referencia?')).toBeInTheDocument()
    expect(screen.getByText('Paso 1 de 3')).toBeInTheDocument()
    expect(screen.getByText('EUR')).toBeInTheDocument()
    expect(screen.getByText('USD')).toBeInTheDocument()
  })

  it('permite avanzar al paso 2 y configurar packs de cuentas', () => {
    render(<WelcomeWizard />)
    
    // Cambiar a USD
    fireEvent.click(screen.getByText('USD'))

    // Avanzar a paso 2
    fireEvent.click(screen.getByText('Continuar'))
    expect(screen.getByText('¿Cómo gestionás tu dinero habitualmente?')).toBeInTheDocument()
    expect(screen.getByText('Paso 2 de 3')).toBeInTheDocument()
    expect(screen.getByText('Nómada Digital')).toBeInTheDocument()
    expect(screen.getByText('Tradicional / Local')).toBeInTheDocument()
  })

  it('permite retroceder con el botón Atrás', () => {
    render(<WelcomeWizard />)
    fireEvent.click(screen.getByText('Continuar'))
    expect(screen.getByText('Paso 2 de 3')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Atrás'))
    expect(screen.getByText('Paso 1 de 3')).toBeInTheDocument()
  })

  it('avanza al paso 3, gestiona categorías y contactos, e inicializa el espacio', async () => {
    render(<WelcomeWizard />)
    
    // Paso 1 -> Paso 2
    fireEvent.click(screen.getByText('Continuar'))
    // Paso 2 -> Paso 3
    fireEvent.click(screen.getByText('Continuar'))

    expect(screen.getByText('Categorías y división de gastos')).toBeInTheDocument()
    expect(screen.getByText('Paso 3 de 3')).toBeInTheDocument()

    // Agregar un amigo a Split Pay
    const input = screen.getByPlaceholderText('Ej. Diego, Gladys, Romina...')
    fireEvent.change(input, { target: { value: 'Diego' } })
    fireEvent.click(screen.getByText('Agregar'))
    expect(screen.getByText('Diego')).toBeInTheDocument()

    // Click en inicializar
    const finishBtn = screen.getByText('Inicializar mi espacio →')
    fireEvent.click(finishBtn)

    await waitFor(() => {
      expect(mockSeedUserSpace).toHaveBeenCalledTimes(1)
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
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
})
