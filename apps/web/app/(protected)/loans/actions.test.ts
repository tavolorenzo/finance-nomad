import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createLoanAction,
  deleteLoanAction,
  payLoanInstallmentAction,
  ensureLoanInterestCategory
} from './actions'
import * as supabaseServer from '@/lib/supabase/server'
import * as nextCache from 'next/cache'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}))

vi.mock('@/lib/fx', () => ({
  getRate: vi.fn().mockResolvedValue(1),
  calculateAccountAmount: vi.fn().mockImplementation((amount, fee, rate) => (amount - fee) * rate)
}))

describe('loans server actions', () => {
  const mockUserId = 'user-test-loans'
  let mockSupabase: any
  let loansDb: any[]
  let installmentsDb: any[]
  let transactionsDb: any[]
  let categoriesDb: any[]
  let accountsDb: any[]

  beforeEach(() => {
    vi.clearAllMocks()

    loansDb = []
    installmentsDb = []
    transactionsDb = []
    categoriesDb = []
    accountsDb = [
      { id: 'acc-1', user_id: mockUserId, institution_id: 'inst-1', currency_native: 'USD' }
    ]

    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: mockUserId } }
        })
      },
      from: vi.fn().mockImplementation((table: string) => {
        let currentData =
          table === 'loans'
            ? loansDb
            : table === 'loan_installments'
            ? installmentsDb
            : table === 'master_transactions'
            ? transactionsDb
            : table === 'categories'
            ? categoriesDb
            : table === 'accounts'
            ? accountsDb
            : []

        let filters: Array<(item: any) => boolean> = []

        const builder: any = {
          select: vi.fn().mockImplementation((fields?: string, options?: any) => {
            if (options?.head && options?.count === 'exact') {
              // Simular count head
              return {
                eq: vi.fn().mockImplementation((col: string, val: any) => {
                  filters.push((item) => item[col] === val)
                  return {
                    eq: vi.fn().mockImplementation((c2: string, v2: any) => {
                      filters.push((item) => item[c2] === v2)
                      const count = currentData.filter((item) => filters.every((f) => f(item))).length
                      return Promise.resolve({ count, data: null, error: null })
                    })
                  }
                })
              }
            }
            return builder
          }),
          eq: vi.fn().mockImplementation((col: string, val: any) => {
            filters.push((item: any) => item[col] === val)
            return builder
          }),
          lt: vi.fn().mockImplementation((col: string, val: any) => {
            filters.push((item: any) => item[col] < val)
            return builder
          }),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockImplementation((n: number) => {
            const res = currentData.filter((item) => filters.every((f) => f(item))).slice(0, n)
            return Promise.resolve({ data: res, error: null })
          }),
          ilike: vi.fn().mockImplementation((col: string, val: string) => {
            filters.push((item: any) => String(item[col]).toLowerCase() === val.toLowerCase())
            return builder
          }),
          insert: vi.fn().mockImplementation((rows: any) => {
            const toAdd = Array.isArray(rows) ? rows : [rows]
            toAdd.forEach((r) => {
              if (!r.id) r.id = 'gen-' + Math.random().toString(36).slice(2)
              currentData.push(r)
            })
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: toAdd[0], error: null })
              }),
              then: (resolve: any) => resolve({ data: toAdd, error: null })
            }
          }),
          update: vi.fn().mockImplementation((updates: any) => {
            return {
              eq: vi.fn().mockImplementation((col: string, val: any) => {
                currentData.forEach((item) => {
                  if (item[col] === val) Object.assign(item, updates)
                })
                return {
                  eq: vi.fn().mockImplementation((c2: string, v2: any) => {
                    return Promise.resolve({ error: null })
                  }),
                  then: (resolve: any) => resolve({ error: null })
                }
              })
            }
          }),
          delete: vi.fn().mockImplementation(() => {
            return {
              eq: vi.fn().mockImplementation((col: string, val: any) => {
                return Promise.resolve({ error: null })
              })
            }
          }),
          single: vi.fn().mockImplementation(() => {
            const match = currentData.find((item) => filters.every((f) => f(item)))
            return Promise.resolve({ data: match || null, error: match ? null : { message: 'Not found' } })
          }),
          maybeSingle: vi.fn().mockImplementation(() => {
            const match = currentData.find((item) => filters.every((f) => f(item)))
            return Promise.resolve({ data: match || null, error: null })
          })
        }

        return builder
      })
    }

    vi.mocked(supabaseServer.createClient).mockResolvedValue(mockSupabase)
  })

  it('valida campos obligatorios en createLoanAction', async () => {
    const formData = new FormData()
    formData.append('name', '')
    await expect(createLoanAction(formData)).rejects.toThrow('Ingresá un nombre o descripción')

    formData.set('name', 'Préstamo Auto')
    formData.append('principal', '-500')
    await expect(createLoanAction(formData)).rejects.toThrow('El monto de capital debe ser mayor a 0.')
  })

  it('crea el préstamo y genera las cuotas con el sistema francés de Itaú', async () => {
    const formData = new FormData()
    formData.append('name', 'Préstamo Itaú')
    formData.append('direction', 'BORROWED')
    formData.append('principal', '12000')
    formData.append('currency', 'USD')
    formData.append('tea_rate', '25') // 25% TEA
    formData.append('total_installments', '12')
    formData.append('start_date', '2026-03-01')
    formData.append('due_day', '10')

    const res = await createLoanAction(formData)
    expect(res.success).toBe(true)
    expect(loansDb).toHaveLength(1)
    expect(loansDb[0].name).toBe('Préstamo Itaú')
    expect(loansDb[0].status).toBe('ACTIVE')
    expect(installmentsDb).toHaveLength(12)
    expect(installmentsDb[0].period).toBe(1)
    expect(installmentsDb[11].period).toBe(12)
    expect(installmentsDb[11].balance).toBe(0)
  })

  it('registra movimiento de desembolso inicial si record_disbursement es true', async () => {
    const formData = new FormData()
    formData.append('name', 'Préstamo con Acreditación')
    formData.append('direction', 'BORROWED')
    formData.append('principal', '5000')
    formData.append('currency', 'USD')
    formData.append('total_installments', '6')
    formData.append('start_date', '2026-03-01')
    formData.append('disbursement_account_id', 'acc-1')
    formData.append('record_disbursement', 'true')

    await createLoanAction(formData)
    expect(transactionsDb).toHaveLength(1)
    expect(transactionsDb[0].type).toBe('INCOME')
    expect(transactionsDb[0].amount_original).toBe(5000)
    expect(transactionsDb[0].notes).toContain('Desembolso préstamo: Préstamo con Acreditación')
  })

  it('realiza soft delete en deleteLoanAction', async () => {
    loansDb.push({ id: 'loan-del', user_id: mockUserId, name: 'Viejo', is_active: true })
    await deleteLoanAction('loan-del')
    expect(loansDb[0].is_active).toBe(false)
  })

  it('rechaza pagos salteados si hay cuotas anteriores pendientes', async () => {
    loansDb.push({
      id: 'loan-1',
      user_id: mockUserId,
      name: 'Préstamo Activo',
      direction: 'BORROWED',
      total_installments: 3,
      currency: 'USD'
    })
    installmentsDb.push(
      { id: 'inst-1', loan_id: 'loan-1', period: 1, payment: 100, interest: 20, paid: false },
      { id: 'inst-2', loan_id: 'loan-1', period: 2, payment: 100, interest: 15, paid: false }
    )

    // Intenta pagar la cuota 2 directamente
    await expect(
      payLoanInstallmentAction({
        loanId: 'loan-1',
        installmentId: 'inst-2',
        accountId: 'acc-1'
      })
    ).rejects.toThrow('Debés pagar las cuotas en orden correlativo')
  })

  it('paga cuota en orden correlativo desglosando capital e intereses (Opción B)', async () => {
    loansDb.push({
      id: 'loan-1',
      user_id: mockUserId,
      name: 'Préstamo Auto',
      direction: 'BORROWED',
      total_installments: 2,
      currency: 'USD'
    })
    installmentsDb.push(
      { id: 'inst-1', loan_id: 'loan-1', period: 1, payment: 450, interest: 50, vat_amount: 11, paid: false }
    )

    const res = await payLoanInstallmentAction({
      loanId: 'loan-1',
      installmentId: 'inst-1',
      accountId: 'acc-1'
    })

    expect(res.success).toBe(true)
    expect(installmentsDb[0].paid).toBe(true)

    // Opción B: Fila 1 capital (450) + Fila 2 interés + IVA (50 + 11 = 61)
    expect(transactionsDb).toHaveLength(2)
    const capitalTx = transactionsDb.find((t) => t.notes.includes('(Capital)'))
    const interestTx = transactionsDb.find((t) => t.notes.includes('(Interés)'))

    expect(capitalTx).toBeDefined()
    expect(capitalTx.amount_original).toBe(450)
    expect(capitalTx.type).toBe('OUTCOME')

    expect(interestTx).toBeDefined()
    expect(interestTx.amount_original).toBe(61)
    expect(interestTx.type).toBe('OUTCOME')
    expect(interestTx.parent_transaction_id).toBe(capitalTx.id)
  })
})
