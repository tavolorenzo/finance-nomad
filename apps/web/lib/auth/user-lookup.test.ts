import { describe, it, expect, vi } from 'vitest'
import { isValidEmail, checkUserExists } from './user-lookup'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('user-lookup helpers', () => {
  describe('isValidEmail', () => {
    it('reconoce correos válidos', () => {
      expect(isValidEmail('usuario@ejemplo.com')).toBe(true)
      expect(isValidEmail('user.name+tag@sub.domain.co')).toBe(true)
      expect(isValidEmail('  espacios@test.org  ')).toBe(true)
    })

    it('rechaza correos inválidos o vacíos', () => {
      expect(isValidEmail('')).toBe(false)
      expect(isValidEmail('usuario')).toBe(false)
      expect(isValidEmail('usuario@')).toBe(false)
      expect(isValidEmail('@dominio.com')).toBe(false)
      expect(isValidEmail('usuario@dominio')).toBe(false)
      expect(isValidEmail('usuario con espacios@dominio.com')).toBe(false)
    })
  })

  describe('checkUserExists', () => {
    it('retorna error sin llamar a RPC si el formato es inválido', async () => {
      const mockSupabase = {
        rpc: vi.fn()
      } as unknown as SupabaseClient

      const result = await checkUserExists(mockSupabase, 'invalido')
      expect(result.exists).toBe(false)
      expect(result.error).not.toBeNull()
      expect(mockSupabase.rpc).not.toHaveBeenCalled()
    })

    it('devuelve exists: true si el RPC retorna true', async () => {
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({ data: true, error: null })
      } as unknown as SupabaseClient

      const result = await checkUserExists(mockSupabase, 'EXISTENTE@test.com')
      expect(mockSupabase.rpc).toHaveBeenCalledWith('check_user_exists', {
        lookup_email: 'existente@test.com'
      })
      expect(result.exists).toBe(true)
      expect(result.error).toBeNull()
    })

    it('devuelve exists: false si el RPC retorna false', async () => {
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({ data: false, error: null })
      } as unknown as SupabaseClient

      const result = await checkUserExists(mockSupabase, 'nuevo@test.com')
      expect(result.exists).toBe(false)
      expect(result.error).toBeNull()
    })

    it('maneja errores devueltos por el RPC', async () => {
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({ data: null, error: new Error('RPC Error') })
      } as unknown as SupabaseClient

      const result = await checkUserExists(mockSupabase, 'error@test.com')
      expect(result.exists).toBe(false)
      expect(result.error).toBeTruthy()
    })
  })
})
