import { describe, it, expect, vi, beforeEach } from 'vitest'
import WelcomeCreditCardPage from './page'

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

const mockFrom = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    from: mockFrom
  }))
}))

vi.mock('@/components/credit-card-bulk/CreditCardBulkWizard', () => ({
  CreditCardBulkWizard: (props: any) => (
    <div data-testid="bulk-wizard">Bulk Wizard with {props.cardAccounts.length} cards</div>
  )
}))

describe('WelcomeCreditCardPage Server Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirige a /login si no hay usuario autenticado', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null)
    await expect(WelcomeCreditCardPage()).rejects.toThrow('NEXT_REDIRECT;/login')
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('redirige a /dashboard si el usuario no tiene tarjetas de crédito activas', async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: 'user-1' })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'accounts') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  returns: vi.fn().mockResolvedValue({ data: [] })
                })
              })
            })
          })
        }
      }
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () => ({
                returns: vi.fn().mockResolvedValue({ data: [] })
              })
            })
          })
        })
      }
    })

    await expect(WelcomeCreditCardPage()).rejects.toThrow('NEXT_REDIRECT;/dashboard')
    expect(mockRedirect).toHaveBeenCalledWith('/dashboard')
  })

  it('renderiza CreditCardBulkWizard si el usuario tiene tarjetas de crédito', async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: 'user-1' })

    const mockCards = [
      { id: 'card-1', name: 'Visa Gold', type: 'credit_card', currency_native: 'ARS' }
    ]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'accounts') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  returns: vi.fn().mockResolvedValue({ data: mockCards })
                })
              })
            })
          })
        }
      }
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () => ({
                returns: vi.fn().mockResolvedValue({ data: [] })
              })
            })
          })
        })
      }
    })

    const el = await WelcomeCreditCardPage()
    expect(el).toBeDefined()
  })
})
