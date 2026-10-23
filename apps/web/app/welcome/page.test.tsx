import { describe, it, expect, vi, beforeEach } from 'vitest'
import WelcomePage from './page'

const mockRedirect = vi.fn()
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    mockRedirect(path)
    throw new Error(`NEXT_REDIRECT;${path}`)
  }
}))

const mockGetAuthenticatedUser = vi.fn()
vi.mock('@/lib/supabase/auth-helper', () => ({
  getAuthenticatedUser: (...args: any[]) => mockGetAuthenticatedUser(...args)
}))

const mockMaybeSingle = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    from: mockFrom
  }))
}))

vi.mock('@/components/WelcomeWizard', () => ({
  WelcomeWizard: () => <div data-testid="welcome-wizard">WelcomeWizard Mock</div>
}))

describe('WelcomePage Server Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirige a /login si no hay usuario autenticado', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null)
    await expect(WelcomePage()).rejects.toThrow('NEXT_REDIRECT;/login')
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('redirige a /dashboard si el usuario ya completó el onboarding', async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: 'user-1' })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_settings') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { onboarding_completed: true } })
            })
          })
        }
      }
      if (table === 'accounts') {
        return {
          select: () => ({
            eq: () => ({
              eq: vi.fn().mockResolvedValue({ count: 0 })
            })
          })
        }
      }
      return {}
    })

    await expect(WelcomePage()).rejects.toThrow('NEXT_REDIRECT;/dashboard')
    expect(mockRedirect).toHaveBeenCalledWith('/dashboard')
  })

  it('redirige a /dashboard si el usuario ya tiene cuentas activas', async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: 'user-1' })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_settings') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { onboarding_completed: false } })
            })
          })
        }
      }
      if (table === 'accounts') {
        return {
          select: () => ({
            eq: () => ({
              eq: vi.fn().mockResolvedValue({ count: 2 })
            })
          })
        }
      }
      return {}
    })

    await expect(WelcomePage()).rejects.toThrow('NEXT_REDIRECT;/dashboard')
    expect(mockRedirect).toHaveBeenCalledWith('/dashboard')
  })

  it('renderiza WelcomeWizard si es un usuario nuevo sin cuentas ni onboarding', async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: 'user-1' })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_settings') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: null })
            })
          })
        }
      }
      if (table === 'accounts') {
        return {
          select: () => ({
            eq: () => ({
              eq: vi.fn().mockResolvedValue({ count: 0 })
            })
          })
        }
      }
      return {}
    })

    const result = await WelcomePage()
    expect(mockRedirect).not.toHaveBeenCalled()
    expect(result).toBeDefined()
  })
})
