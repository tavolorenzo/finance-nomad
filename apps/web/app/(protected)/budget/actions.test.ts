import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createBudgetEstimate,
  updateBudgetEstimate,
  toggleBudgetEstimateActive,
  executeBudgetPayment
} from './actions'
import * as supabaseServer from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}))

vi.mock('@/lib/fx', () => ({
  getRate: vi.fn().mockResolvedValue(40),
  calculateAccountAmount: (orig: number, fee: number, rate: number) =>
    Math.round((orig - fee) * rate * 100) / 100
}))

describe('budget server actions', () => {
  const mockInsert = vi.fn()
  const mockUpdate = vi.fn()
  const mockSelect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } }
        })
      },
      from: vi.fn((table: string) => {
        if (table === 'budget_estimates') {
          return {
            insert: (payload: any) => {
              mockInsert(payload)
              return {
                select: () => ({
                  single: () =>
                    Promise.resolve({
                      data: { id: 'est-new', ...payload },
                      error: null
                    })
                })
              }
            },
            update: (payload: any) => {
              mockUpdate(payload)
              return {
                eq: () => ({
                  eq: () => ({
                    select: () => ({
                      single: () =>
                        Promise.resolve({
                          data: { id: 'est-1', ...payload },
                          error: null
                        })
                    }),
                    then: (resolve: any) => resolve({ error: null })
                  })
                })
              }
            },
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () =>
                    Promise.resolve({
                      data: {
                        id: 'est-1',
                        name: 'Alquiler',
                        type: 'EXPENSE_ESTIMATE',
                        estimated_amount: 1000,
                        currency: 'USD',
                        category_id: 'cat-1',
                        preferred_account_id: 'acc-uyu'
                      },
                      error: null
                    })
                })
              })
            })
          }
        }
        if (table === 'accounts') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () =>
                    Promise.resolve({
                      data: {
                        id: 'acc-uyu',
                        institution_id: 'inst-1',
                        currency_native: 'UYU'
                      },
                      error: null
                    })
                })
              })
            })
          }
        }
        if (table === 'master_transactions') {
          return {
            insert: (payload: any) => {
              mockSelect(payload)
              return Promise.resolve({ error: null })
            }
          }
        }
        return {}
      })
    }

    vi.mocked(supabaseServer.createClient).mockResolvedValue(mockSupabase as any)
  })

  it('createBudgetEstimate valida e inserta un nuevo estimado de gasto fijo', async () => {
    const res = await createBudgetEstimate({
      name: '  Fibra Óptica  ',
      type: 'EXPENSE_ESTIMATE',
      estimatedAmount: 45.5,
      currency: 'usd',
      categoryId: 'cat-services',
      dueDay: 12,
      preferredAccountId: 'acc-1'
    })

    expect(res.name).toBe('Fibra Óptica')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-123',
        name: 'Fibra Óptica',
        type: 'EXPENSE_ESTIMATE',
        estimated_amount: 45.5,
        currency: 'USD',
        category_id: 'cat-services',
        due_day: 12,
        preferred_account_id: 'acc-1',
        is_active: true
      })
    )
  })

  it('createBudgetEstimate rechaza montos menores o iguales a cero', async () => {
    await expect(
      createBudgetEstimate({
        name: 'Alquiler',
        type: 'EXPENSE_ESTIMATE',
        estimatedAmount: 0,
        currency: 'USD',
        categoryId: 'cat-1'
      })
    ).rejects.toThrow('El monto estimado debe ser mayor a 0.')
  })

  it('updateBudgetEstimate actualiza los campos y el estado activo', async () => {
    await updateBudgetEstimate('est-1', {
      name: 'Alquiler Actualizado',
      type: 'EXPENSE_ESTIMATE',
      estimatedAmount: 1100,
      currency: 'USD',
      categoryId: 'cat-1',
      dueDay: 5,
      isActive: false
    })

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Alquiler Actualizado',
        estimated_amount: 1100,
        due_day: 5,
        is_active: false
      })
    )
  })

  it('toggleBudgetEstimateActive realiza baja lógica sin borrado físico', async () => {
    await toggleBudgetEstimateActive('est-1', false)
    expect(mockUpdate).toHaveBeenCalledWith({ is_active: false })
  })

  it('executeBudgetPayment convierte multimoneda cuando la cuenta difiere de la moneda del estimado', async () => {
    await executeBudgetPayment('est-1', {
      accountId: 'acc-uyu',
      exchangeRate: 41.5,
      date: '2026-11-05'
    })

    expect(mockSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'OUTCOME',
        amount_original: 1000,
        currency_original: 'USD',
        exchange_rate: 41.5,
        rate_overridden: true,
        amount_account: 41500,
        currency_account: 'UYU',
        accounting_period: '2026-11',
        notes: 'Alquiler'
      })
    )
  })
})
