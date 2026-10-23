import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SendResetLinkButton } from './SendResetLinkButton'
import * as supabaseClient from '@/lib/supabase/client'
import * as passwordReset from '@/lib/auth/password-reset'

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn()
}))

vi.mock('@/lib/auth/password-reset', () => ({
  sendPasswordResetEmail: vi.fn()
}))

describe('SendResetLinkButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(supabaseClient.createClient).mockReturnValue({} as any)
  })

  it('está deshabilitado si el email está vacío', () => {
    render(<SendResetLinkButton email="" />)
    const btn = screen.getByRole('button', { name: /mandar link/i })
    expect(btn).toBeDisabled()
  })

  it('envía link de restablecimiento exitosamente', async () => {
    vi.mocked(passwordReset.sendPasswordResetEmail).mockResolvedValue({ error: null } as any)

    render(<SendResetLinkButton email="user@example.com" />)
    const btn = screen.getByRole('button', { name: /mandar link/i })
    expect(btn).not.toBeDisabled()
    fireEvent.click(btn)

    await waitFor(() => {
      expect(passwordReset.sendPasswordResetEmail).toHaveBeenCalledWith(expect.anything(), 'user@example.com')
      expect(screen.getByText(/te mandamos un link al email/i)).toBeInTheDocument()
    })
  })

  it('muestra mensaje de error si falla el envío', async () => {
    vi.mocked(passwordReset.sendPasswordResetEmail).mockResolvedValue({
      error: new Error('Error al enviar correo')
    } as any)

    render(<SendResetLinkButton email="error@example.com" />)
    fireEvent.click(screen.getByRole('button', { name: /mandar link/i }))

    await waitFor(() => {
      expect(screen.getByText(/no pudimos enviar el link/i)).toBeInTheDocument()
    })
  })
})
