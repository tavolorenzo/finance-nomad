import { describe, it, expect } from 'vitest'
import {
  getPasswordErrorMessage,
  getSignUpErrorMessage,
  getSignInErrorMessage
} from './password-errors'

describe('password-errors helper', () => {
  describe('getPasswordErrorMessage', () => {
    it('retorna string vacío si no hay error', () => {
      expect(getPasswordErrorMessage(null)).toBe('')
      expect(getPasswordErrorMessage(undefined)).toBe('')
    })

    it('detecta error de misma contraseña', () => {
      const err = { code: 'same_password', message: 'New password should be different from the old password' }
      expect(getPasswordErrorMessage(err)).toBe('La nueva contraseña tiene que ser distinta a la actual.')
    })

    it('detecta longitud mínima de 8 caracteres', () => {
      const err = { code: 'weak_password', message: 'Password should be at least 8 characters.' }
      expect(getPasswordErrorMessage(err)).toBe('La contraseña debe tener al menos 8 caracteres.')
    })

    it('detecta longitud mínima de 6 caracteres', () => {
      const err = { status: 422, message: 'Password should be at least 6 characters.' }
      expect(getPasswordErrorMessage(err)).toBe('La contraseña debe tener al menos 6 caracteres.')
    })

    it('detecta error de complejidad de caracteres', () => {
      const err = {
        code: 'weak_password',
        message: 'Password should contain at least one character of each: lowercase, uppercase, digits, symbols'
      }
      expect(getPasswordErrorMessage(err)).toContain('mayúsculas, minúsculas, números o símbolos')
    })

    it('detecta contraseñas filtradas en brechas (pwned / HIBP)', () => {
      const err = { code: 'weak_password', message: 'Password is known to be weak and easily guessed or pwned' }
      expect(getPasswordErrorMessage(err)).toContain('muy común o fue vulnerada en filtraciones públicas')
    })

    it('detecta sesión expirada o token ausente', () => {
      const err = { code: 'session_not_found', status: 401, message: 'Auth session missing!' }
      expect(getPasswordErrorMessage(err)).toContain('El link de restablecimiento expiró o no es válido')
    })

    it('detecta rate limit de solicitudes', () => {
      const err = { code: 'over_request_rate_limit', status: 429, message: 'Too many requests' }
      expect(getPasswordErrorMessage(err)).toContain('Demasiados intentos seguidos')
    })

    it('retorna fallback genérico ante errores desconocidos', () => {
      const err = { message: 'Unexpected server error' }
      expect(getPasswordErrorMessage(err)).toBe('No pudimos actualizar la contraseña. Intentá de nuevo.')
    })
  })

  describe('getSignUpErrorMessage', () => {
    it('detecta usuario ya registrado', () => {
      const err = { code: 'user_already_exists', message: 'User already registered' }
      expect(getSignUpErrorMessage(err)).toBe('Ya existe una cuenta con este email. Iniciá sesión o restablecé tu contraseña.')
    })

    it('reutiliza reglas de contraseña débil en signup', () => {
      const err = { code: 'weak_password', message: 'Password should be at least 8 characters.' }
      expect(getSignUpErrorMessage(err)).toBe('La contraseña debe tener al menos 8 caracteres.')
    })

    it('retorna fallback estándar para otros fallos de registro', () => {
      const err = { message: 'Internal error' }
      expect(getSignUpErrorMessage(err)).toBe('No pudimos crear la cuenta. Revisá el email e intentá de nuevo.')
    })
  })

  describe('getSignInErrorMessage', () => {
    it('detecta email no confirmado', () => {
      const err = { message: 'Email not confirmed' }
      expect(getSignInErrorMessage(err)).toBe('Tenés que confirmar tu email antes de entrar. Revisá tu bandeja de entrada.')
    })

    it('retorna mensaje estándar de credenciales', () => {
      const err = { message: 'Invalid login credentials' }
      expect(getSignInErrorMessage(err)).toBe('No pudimos iniciar sesión. Revisá el email y la contraseña.')
    })
  })
})
