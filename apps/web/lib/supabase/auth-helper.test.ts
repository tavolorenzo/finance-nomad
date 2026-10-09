import { describe, it, expect, vi } from 'vitest'
import { extractUserFromCookies, getAuthenticatedUser } from './auth-helper'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('auth-helper', () => {
  describe('extractUserFromCookies', () => {
    it('retorna null si no hay cookies de sesión', () => {
      expect(extractUserFromCookies([])).toBeNull()
      expect(extractUserFromCookies([{ name: 'theme', value: 'dark' }])).toBeNull()
    })

    it('extrae el usuario de una cookie en formato objeto con user', () => {
      const sessionObj = {
        user: { id: 'usr-123', email: 'test@nomad.com' },
        access_token: 'fake-jwt'
      }
      const raw = 'base64-' + Buffer.from(JSON.stringify(sessionObj)).toString('base64url')
      const cookies = [{ name: 'sb-ref-auth-token', value: raw }]

      const user = extractUserFromCookies(cookies)
      expect(user).not.toBeNull()
      expect(user?.id).toBe('usr-123')
      expect(user?.email).toBe('test@nomad.com')
    })

    it('extrae el usuario decodificando el JWT en formato array [access_token, refresh_token]', () => {
      const payload = { sub: 'usr-jwt-456', email: 'jwt@nomad.com' }
      const jwt = 'header.' + Buffer.from(JSON.stringify(payload)).toString('base64url') + '.signature'
      const sessionArray = [jwt, 'refresh-tok']
      const raw = 'base64-' + Buffer.from(JSON.stringify(sessionArray)).toString('base64url')
      const cookies = [{ name: 'sb-project-auth-token', value: raw }]

      const user = extractUserFromCookies(cookies)
      expect(user).not.toBeNull()
      expect(user?.id).toBe('usr-jwt-456')
      expect(user?.email).toBe('jwt@nomad.com')
    })

    it('soporta cookies divididas en chunks (.0, .1)', () => {
      const sessionObj = {
        user: { id: 'usr-chunk', email: 'chunk@nomad.com' },
        access_token: 'tok'
      }
      const raw = 'base64-' + Buffer.from(JSON.stringify(sessionObj)).toString('base64url')
      const mid = Math.floor(raw.length / 2)
      const chunk0 = raw.slice(0, mid)
      const chunk1 = raw.slice(mid)

      const cookies = [
        { name: 'sb-ref-auth-token.0', value: chunk0 },
        { name: 'sb-ref-auth-token.1', value: chunk1 }
      ]

      const user = extractUserFromCookies(cookies)
      expect(user).not.toBeNull()
      expect(user?.id).toBe('usr-chunk')
      expect(user?.email).toBe('chunk@nomad.com')
    })
  })

  describe('getAuthenticatedUser', () => {
    it('devuelve el usuario de Supabase si getUser() responde exitosamente', async () => {
      const mockUser = { id: 'usr-online', email: 'online@nomad.com' }
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null
          })
        }
      } as unknown as SupabaseClient

      const user = await getAuthenticatedUser(mockSupabase)
      expect(user).toEqual(mockUser)
    })

    it('hace fallback a cookies si getUser() falla por error de red offline', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: {
              name: 'AuthRetryableFetchError',
              message: 'fetch failed',
              status: 0
            }
          })
        }
      } as unknown as SupabaseClient

      const sessionObj = {
        user: { id: 'usr-offline', email: 'offline@nomad.com' },
        access_token: 'fake-jwt'
      }
      const raw = 'base64-' + Buffer.from(JSON.stringify(sessionObj)).toString('base64url')
      const cookies = [{ name: 'sb-ref-auth-token', value: raw }]

      const user = await getAuthenticatedUser(mockSupabase, cookies)
      expect(user).not.toBeNull()
      expect(user?.id).toBe('usr-offline')
    })

    it('devuelve null si getUser() rechaza la sesión con 401/403 (revocada)', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: {
              name: 'AuthApiError',
              message: 'Invalid token',
              status: 401
            }
          })
        }
      } as unknown as SupabaseClient

      const sessionObj = {
        user: { id: 'usr-revoked', email: 'revoked@nomad.com' }
      }
      const raw = 'base64-' + Buffer.from(JSON.stringify(sessionObj)).toString('base64url')
      const cookies = [{ name: 'sb-ref-auth-token', value: raw }]

      const user = await getAuthenticatedUser(mockSupabase, cookies)
      expect(user).toBeNull()
    })
  })
})
