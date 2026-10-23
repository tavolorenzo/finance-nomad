import { describe, it, expect, vi, beforeEach } from 'vitest'
import DashboardPage from './page'

const mockRedirect = vi.fn()
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    mockRedirect(path)
    const error: any = new Error(`NEXT_REDIRECT;${path}`)
    error.digest = `NEXT_REDIRECT;replace;${path};307;;`
    throw error
  }
}))

const mockGetAuthenticatedUser = vi.fn()
vi.mock('@/lib/supabase/auth-helper', () => ({
  getAuthenticatedUser: (...args: any[]) => mockGetAuthenticatedUser(...args)
}))

const mockGetAccountBalances = vi.fn()
const mockConvertToDisplayCurrency = vi.fn()
vi.mock('@/lib/networth', () => ({
  getAccountBalances: (...args: any[]) => mockGetAccountBalances(...args),
  convertToDisplayCurrency: (...args: any[]) => mockConvertToDisplayCurrency(...args)
}))

vi.mock('@/components/DashboardClient', () => ({
  DashboardClient: () => <div data-testid="dashboard-client">DashboardClient Mock</div>
}))

const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    from: mockFrom
  }))
}))

describe('DashboardPage Server Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAccountBalances.mockResolvedValue([])
    mockConvertToDisplayCurrency.mockResolvedValue(0)
  })

  it('redirige a /login si no hay usuario autenticado', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null)
    await expect(DashboardPage()).rejects.toThrow('NEXT_REDIRECT;/login')
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('redirige inteligentemente a /welcome si el usuario no tiene cuentas y no completó onboarding', async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: 'user-new' })

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
              eq: () => ({
                returns: vi.fn().mockResolvedValue({ data: [] })
              })
            })
          })
        }
      }
      if (table === 'master_transactions') {
        return {
          select: () => ({
            order: () => ({
              limit: () => ({
                returns: vi.fn().mockResolvedValue({ data: [] })
              })
            })
          })
        }
      }
      if (table === 'budget_estimates') {
        return {
          select: () => ({
            eq: () => ({
              eq: vi.fn().mockResolvedValue({ data: [] })
            })
          })
        }
      }
      return {}
    })

    await expect(DashboardPage()).rejects.toThrow('NEXT_REDIRECT;/welcome')
    expect(mockRedirect).toHaveBeenCalledWith('/welcome')
  })

  it('no redirige a /welcome si el usuario ya tiene cuentas configuradas', async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: 'user-existing' })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_settings') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { display_currency: 'EUR', onboarding_completed: true } })
            })
          })
        }
      }
      if (table === 'accounts') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                returns: vi.fn().mockResolvedValue({
                  data: [{ id: 'acc-1', name: 'Cuenta 1', type: 'checking', currency_native: 'EUR', institutions: { name: 'Banco' } }]
                })
              })
            })
          })
        }
      }
      if (table === 'master_transactions') {
        return {
          select: () => ({
            order: () => ({
              limit: () => ({
                returns: vi.fn().mockResolvedValue({ data: [] })
              })
            })
          })
        }
      }
      if (table === 'budget_estimates') {
        return {
          select: () => ({
            eq: () => ({
              eq: vi.fn().mockResolvedValue({ data: [] })
            })
          })
        }
      }
      return {}
    })

    const result = await DashboardPage()
    expect(mockRedirect).not.toHaveBeenCalled()
    expect(result).toBeDefined()
  })
})
