import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoginPage from './page'
import * as userLookup from '@/lib/auth/user-lookup'

const mockPush = vi.fn()
const mockRefresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh
  })
}))

const mockSignInWithPassword = vi.fn()
const mockSignUp = vi.fn()
const mockSignInWithOAuth = vi.fn()
const mockResetPasswordForEmail = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: (...args: any[]) => mockSignInWithPassword(...args),
      signUp: (...args: any[]) => mockSignUp(...args),
      signInWithOAuth: (...args: any[]) => mockSignInWithOAuth(...args),
      resetPasswordForEmail: (...args: any[]) => mockResetPasswordForEmail(...args)
    }
  })
}))

vi.mock('@/lib/auth/password-reset', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue({ error: null })
}))

describe('LoginPage flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza el estado inicial con botón de Google y botón Continuar deshabilitado', () => {
    render(<LoginPage />)
    expect(screen.getByText('Continuar con Google')).toBeInTheDocument()
    expect(screen.getByText('o con tu correo')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()

    const continueBtn = screen.getByRole('button', { name: 'Continuar' })
    expect(continueBtn).toBeDisabled()
  })

  it('habilita el botón Continuar cuando se ingresa un correo con formato válido', () => {
    render(<LoginPage />)
    const emailInput = screen.getByLabelText('Email')
    const continueBtn = screen.getByRole('button', { name: 'Continuar' })

    fireEvent.change(emailInput, { target: { value: 'invalido' } })
    expect(continueBtn).toBeDisabled()

    fireEvent.change(emailInput, { target: { value: 'usuario@ejemplo.com' } })
    expect(continueBtn).not.toBeDisabled()
  })

  it('si el usuario está registrado, despliega el input de contraseña y botón Iniciar sesión', async () => {
    vi.spyOn(userLookup, 'checkUserExists').mockResolvedValueOnce({ exists: true, error: null })

    render(<LoginPage />)
    const emailInput = screen.getByLabelText('Email')
    fireEvent.change(emailInput, { target: { value: 'registrado@ejemplo.com' } })

    const continueBtn = screen.getByRole('button', { name: 'Continuar' })
    fireEvent.click(continueBtn)

    await waitFor(() => {
      expect(screen.getByText('Ingresá tu contraseña')).toBeInTheDocument()
      expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
      expect(screen.getByText('¿Olvidaste tu contraseña?')).toBeInTheDocument()
    })
  })

  it('si el usuario NO está registrado, muestra creación de contraseña con 2 campos y Crear cuenta', async () => {
    vi.spyOn(userLookup, 'checkUserExists').mockResolvedValueOnce({ exists: false, error: null })

    render(<LoginPage />)
    const emailInput = screen.getByLabelText('Email')
    fireEvent.change(emailInput, { target: { value: 'nuevo@ejemplo.com' } })

    const continueBtn = screen.getByRole('button', { name: 'Continuar' })
    fireEvent.click(continueBtn)

    await waitFor(() => {
      expect(screen.getByText('Creá tu contraseña para empezar')).toBeInTheDocument()
      expect(screen.getByLabelText('Creá tu contraseña')).toBeInTheDocument()
      expect(screen.getByLabelText('Repetí la contraseña')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeInTheDocument()
    })
  })

  it('permite cambiar de email volviendo al estado inicial con el botón Cambiar', async () => {
    vi.spyOn(userLookup, 'checkUserExists').mockResolvedValueOnce({ exists: true, error: null })

    render(<LoginPage />)
    const emailInput = screen.getByLabelText('Email')
    fireEvent.change(emailInput, { target: { value: 'usuario@ejemplo.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cambiar' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Cambiar' }))

    expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('tras crear la cuenta exitosamente, retorna al estado inicial con aviso positivo', async () => {
    vi.spyOn(userLookup, 'checkUserExists').mockResolvedValueOnce({ exists: false, error: null })
    mockSignUp.mockResolvedValueOnce({ error: null })

    render(<LoginPage />)
    const emailInput = screen.getByLabelText('Email')
    fireEvent.change(emailInput, { target: { value: 'crear@ejemplo.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    await waitFor(() => {
      expect(screen.getByLabelText('Creá tu contraseña')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('Creá tu contraseña'), { target: { value: 'secreta123' } })
    fireEvent.change(screen.getByLabelText('Repetí la contraseña'), { target: { value: 'secreta123' } })

    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    await waitFor(() => {
      // Vuelve al estado inicial con botón Continuar y aviso verde
      expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument()
      expect(screen.getByText(/¡Cuenta creada con éxito!/i)).toBeInTheDocument()
    })
  })

  it('en el flujo de reset, tras mandar el link destaca Volver al inicio de sesión y minimiza Mandar link', async () => {
    vi.spyOn(userLookup, 'checkUserExists').mockResolvedValueOnce({ exists: true, error: null })

    render(<LoginPage />)
    const emailInput = screen.getByLabelText('Email')
    fireEvent.change(emailInput, { target: { value: 'registrado@ejemplo.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    await waitFor(() => {
      expect(screen.getByText('¿Olvidaste tu contraseña?')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('¿Olvidaste tu contraseña?'))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Mandar link' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Mandar link' }))

    await waitFor(() => {
      // El botón de Volver al inicio de sesión es el botón principal y tiene foco
      const backBtn = screen.getByRole('button', { name: 'Volver al inicio de sesión' })
      expect(backBtn).toBeInTheDocument()
      expect(backBtn).toHaveFocus()

      // El botón de mandar link se minimizó a reenviar
      expect(screen.getByRole('button', { name: /Reenviar link/i })).toBeInTheDocument()
    })
  })
})

