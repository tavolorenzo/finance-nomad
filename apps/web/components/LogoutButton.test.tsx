import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LogoutButton } from './LogoutButton'
import * as navigation from 'next/navigation'
import * as supabaseClient from '@/lib/supabase/client'
import * as outboxDb from '@/lib/storage/outbox-db'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn()
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn()
}))

vi.mock('@/lib/storage/outbox-db', () => ({
  clearLedgerDb: vi.fn()
}))

describe('LogoutButton', () => {
  const mockPush = vi.fn()
  const mockRefresh = vi.fn()
  const mockSignOut = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(navigation.useRouter).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh
    } as any)
    vi.mocked(supabaseClient.createClient).mockReturnValue({
      auth: {
        signOut: mockSignOut.mockResolvedValue({})
      }
    } as any)
    vi.mocked(outboxDb.clearLedgerDb).mockResolvedValue()
  })

  it('renderiza botón estándar en fila', () => {
    render(<LogoutButton variant="row" />)
    expect(screen.getByRole('button', { name: /cerrar sesión/i })).toBeInTheDocument()
  })

  it('renderiza botón como icono accesible', () => {
    render(<LogoutButton variant="icon" />)
    expect(screen.getByRole('button', { name: /cerrar sesión/i })).toBeInTheDocument()
  })

  it('limpia base local, desautentica de Supabase y redirige a login', async () => {
    render(<LogoutButton />)
    fireEvent.click(screen.getByRole('button', { name: /cerrar sesión/i }))

    await waitFor(() => {
      expect(outboxDb.clearLedgerDb).toHaveBeenCalled()
      expect(mockSignOut).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/login')
      expect(mockRefresh).toHaveBeenCalled()
    })
  })
})
