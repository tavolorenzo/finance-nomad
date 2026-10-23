import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UpdatePasswordForm } from './UpdatePasswordForm'
import * as navigation from 'next/navigation'
import * as supabaseClient from '@/lib/supabase/client'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn()
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn()
}))

describe('UpdatePasswordForm', () => {
  const mockPush = vi.fn()
  const mockRefresh = vi.fn()
  const mockUpdateUser = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(navigation.useRouter).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh
    } as any)
    vi.mocked(supabaseClient.createClient).mockReturnValue({
      auth: {
        updateUser: mockUpdateUser
      }
    } as any)
  })

  it('muestra error si las contraseñas no coinciden', async () => {
    render(<UpdatePasswordForm />)
    const inputs = screen.getAllByLabelText(/contraseña/i)
    fireEvent.change(inputs[0], { target: { value: 'password123' } })
    fireEvent.change(inputs[1], { target: { value: 'password456' } })

    fireEvent.click(screen.getByRole('button', { name: /guardar contraseña/i }))

    expect(screen.getByText('Las contraseñas no coinciden.')).toBeInTheDocument()
    expect(mockUpdateUser).not.toHaveBeenCalled()
  })

  it('actualiza contraseña exitosamente y redirige a la ruta indicada', async () => {
    mockUpdateUser.mockResolvedValue({ error: null })
    render(<UpdatePasswordForm afterSave="/dashboard" />)

    const inputs = screen.getAllByLabelText(/contraseña/i)
    fireEvent.change(inputs[0], { target: { value: 'mi-nueva-clave-8' } })
    fireEvent.change(inputs[1], { target: { value: 'mi-nueva-clave-8' } })

    fireEvent.click(screen.getByRole('button', { name: /guardar contraseña/i }))

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'mi-nueva-clave-8' })
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('muestra mensaje de confirmación sin redirigir si afterSave es /settings', async () => {
    mockUpdateUser.mockResolvedValue({ error: null })
    render(<UpdatePasswordForm afterSave="/settings" />)

    const inputs = screen.getAllByLabelText(/contraseña/i)
    fireEvent.change(inputs[0], { target: { value: 'mi-nueva-clave-8' } })
    fireEvent.change(inputs[1], { target: { value: 'mi-nueva-clave-8' } })

    fireEvent.click(screen.getByRole('button', { name: /guardar contraseña/i }))

    await waitFor(() => {
      expect(screen.getByText('Contraseña actualizada')).toBeInTheDocument()
      expect(mockPush).not.toHaveBeenCalled()
    })
  })
})
