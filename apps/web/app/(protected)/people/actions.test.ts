import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPerson, updatePerson } from './actions'
import * as supabaseServer from '@/lib/supabase/server'
import * as nextCache from 'next/cache'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}))

describe('people server actions - reserved word and duplicate validations', () => {
  const mockUserId = 'user-test-123'
  let mockSupabase: any
  let peopleDb: Array<{ id: string; user_id: string; name: string; phone: string | null; is_active: boolean }>

  beforeEach(() => {
    vi.clearAllMocks()

    peopleDb = [
      { id: 'p-sys', user_id: mockUserId, name: 'Personal', phone: null, is_active: true },
      { id: 'p-1', user_id: mockUserId, name: 'Gladys', phone: null, is_active: true },
      { id: 'p-2', user_id: mockUserId, name: 'Diego', phone: null, is_active: true }
    ]

    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: mockUserId } }
        })
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table !== 'people') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null })
          }
        }

        const queryState: any = {
          table,
          filters: [] as Array<(item: any) => boolean>,
          selectedFields: '*'
        }

        const builder: any = {
          select: vi.fn().mockImplementation((fields: string) => {
            queryState.selectedFields = fields
            return builder
          }),
          eq: vi.fn().mockImplementation((col: string, val: any) => {
            queryState.filters.push((item: any) => item[col] === val)
            return builder
          }),
          neq: vi.fn().mockImplementation((col: string, val: any) => {
            queryState.filters.push((item: any) => item[col] !== val)
            return builder
          }),
          ilike: vi.fn().mockImplementation((col: string, val: string) => {
            queryState.filters.push((item: any) => (item[col] || '').toLowerCase() === val.toLowerCase())
            return builder
          }),
          maybeSingle: vi.fn().mockImplementation(async () => {
            const matches = peopleDb.filter((item) => queryState.filters.every((f: any) => f(item)))
            return { data: matches[0] ?? null, error: null }
          }),
          single: vi.fn().mockImplementation(async () => {
            const matches = peopleDb.filter((item) => queryState.filters.every((f: any) => f(item)))
            return { data: matches[0] ?? null, error: matches[0] ? null : { message: 'Not found' } }
          }),
          insert: vi.fn().mockImplementation((payload: any) => {
            const newRow = { id: `p-${Date.now()}`, ...payload }
            peopleDb.push(newRow)
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: newRow, error: null })
              })
            }
          }),
          update: vi.fn().mockImplementation((payload: any) => {
            return {
              eq: vi.fn().mockImplementation((col1: string, val1: any) => {
                return {
                  eq: vi.fn().mockImplementation((col2: string, val2: any) => {
                    const row = peopleDb.find((item: any) => item[col1] === val1 && item[col2] === val2)
                    if (row) Object.assign(row, payload)
                    return { data: row, error: null }
                  })
                }
              })
            }
          })
        }

        return builder
      })
    }

    vi.mocked(supabaseServer.createClient).mockResolvedValue(mockSupabase)
  })

  describe('createPerson', () => {
    it('bloquea la creación si el nombre es la palabra reservada "Personal" (case-insensitive)', async () => {
      await expect(createPerson('Personal')).rejects.toThrow(
        '"Personal" es una palabra reservada del sistema para tus consumos propios. Elegí otro nombre.'
      )
      await expect(createPerson('personal')).rejects.toThrow(
        '"Personal" es una palabra reservada del sistema para tus consumos propios. Elegí otro nombre.'
      )
      await expect(createPerson('  PERSONAL  ')).rejects.toThrow(
        '"Personal" es una palabra reservada del sistema para tus consumos propios. Elegí otro nombre.'
      )
    })

    it('bloquea la creación si ya existe una persona con ese nombre (case-insensitive) y sugiere inicial', async () => {
      await expect(createPerson('Diego')).rejects.toThrow(
        'Ya existe una persona con ese nombre. Agregá una inicial para que puedas distinguirla.'
      )
      await expect(createPerson('diego')).rejects.toThrow(
        'Ya existe una persona con ese nombre. Agregá una inicial para que puedas distinguirla.'
      )
    })

    it('permite crear una persona si no colisiona con reservadas ni existentes', async () => {
      const result = await createPerson('Diego M.', '+5491112345678')
      expect(result).toBeDefined()
      expect(nextCache.revalidatePath).toHaveBeenCalledWith('/people')
    })
  })

  describe('updatePerson', () => {
    it('bloquea renombrar el contacto de sistema Personal', async () => {
      await expect(updatePerson('p-sys', 'Personal Pro')).rejects.toThrow(
        'No podés renombrar el contacto de sistema Personal.'
      )
    })

    it('bloquea renombrar un contacto existente a "Personal" (case-insensitive)', async () => {
      await expect(updatePerson('p-1', 'Personal')).rejects.toThrow(
        '"Personal" es una palabra reservada del sistema para tus consumos propios. Elegí otro nombre.'
      )
      await expect(updatePerson('p-1', 'personal')).rejects.toThrow(
        '"Personal" es una palabra reservada del sistema para tus consumos propios. Elegí otro nombre.'
      )
    })

    it('bloquea renombrar si colisiona con el nombre de otra persona existente', async () => {
      // Renombrar p-1 ('Gladys') a 'Diego' (que ya existe en p-2)
      await expect(updatePerson('p-1', 'Diego')).rejects.toThrow(
        'Ya existe una persona con ese nombre. Agregá una inicial para que puedas distinguirla.'
      )
    })

    it('permite renombrar conservando el mismo nombre o diferenciándolo con inicial', async () => {
      await expect(updatePerson('p-1', 'Gladys')).resolves.toBeUndefined()
      await expect(updatePerson('p-1', 'Gladys Mamá')).resolves.toBeUndefined()
      expect(nextCache.revalidatePath).toHaveBeenCalledWith('/people/p-1')
    })
  })
})
