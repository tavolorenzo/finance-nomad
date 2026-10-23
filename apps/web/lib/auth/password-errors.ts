import type { AuthError } from '@supabase/supabase-js'

interface GenericAuthError {
  code?: string
  message?: string
  status?: number
}

/**
 * Traduce y contextualiza los errores devueltos por Supabase Auth al actualizar o cambiar contraseñas.
 * Respeta el tono rioplatense y provee causas claras de rechazo.
 */
export function getPasswordErrorMessage(error: AuthError | Error | null | unknown): string {
  if (!error) return ''

  const err = error as GenericAuthError
  const code = (err.code || '').toLowerCase()
  const msg = (err.message || '').toLowerCase()
  const status = err.status

  // 1. Misma contraseña que la actual
  if (
    code === 'same_password' ||
    msg.includes('different from the old') ||
    msg.includes('same password')
  ) {
    return 'La nueva contraseña tiene que ser distinta a la actual.'
  }

  // 2. Contraseña débil o rechazo por complejidad / longitud / HIBP
  if (
    code === 'weak_password' ||
    status === 422 ||
    msg.includes('at least') ||
    msg.includes('weak') ||
    msg.includes('characters') ||
    msg.includes('compromised') ||
    msg.includes('pwned') ||
    msg.includes('complexity')
  ) {
    if (msg.includes('at least 8')) {
      return 'La contraseña debe tener al menos 8 caracteres.'
    }
    if (msg.includes('at least 6')) {
      return 'La contraseña debe tener al menos 6 caracteres.'
    }
    if (
      msg.includes('uppercase') ||
      msg.includes('lowercase') ||
      msg.includes('digit') ||
      msg.includes('symbol') ||
      msg.includes('character of each')
    ) {
      return 'La contraseña no cumple los requisitos de seguridad (combiná mayúsculas, minúsculas, números o símbolos).'
    }
    if (
      msg.includes('compromised') ||
      msg.includes('pwned') ||
      msg.includes('easily guessed') ||
      msg.includes('leaked')
    ) {
      return 'Esta contraseña es muy común o fue vulnerada en filtraciones públicas. Por tu seguridad, elegí una más robusta.'
    }
    return 'La contraseña es muy débil. Te sugerimos usar al menos 8 caracteres combinando letras y números.'
  }

  // 3. Sesión de recuperación expirada, inválida o ausente
  if (
    code === 'session_not_found' ||
    code === 'session_expired' ||
    status === 401 ||
    msg.includes('session') ||
    msg.includes('jwt') ||
    msg.includes('token') ||
    msg.includes('unauthorized')
  ) {
    return 'El link de restablecimiento expiró o no es válido. Solicitá uno nuevo desde el inicio de sesión.'
  }

  // 4. Límite de tasa / Rate limit
  if (code === 'over_request_rate_limit' || status === 429 || msg.includes('rate limit')) {
    return 'Demasiados intentos seguidos. Esperá unos instantes antes de volver a intentar.'
  }

  // 5. Mensaje por defecto en tono rioplatense
  return 'No pudimos actualizar la contraseña. Intentá de nuevo.'
}

/**
 * Traduce los errores durante el registro de nuevos usuarios (signUp).
 */
export function getSignUpErrorMessage(error: AuthError | Error | null | unknown): string {
  if (!error) return ''

  const err = error as GenericAuthError
  const code = (err.code || '').toLowerCase()
  const msg = (err.message || '').toLowerCase()
  const status = err.status

  if (code === 'user_already_exists' || msg.includes('already registered')) {
    return 'Ya existe una cuenta con este email. Iniciá sesión o restablecé tu contraseña.'
  }

  if (
    code === 'weak_password' ||
    status === 422 ||
    msg.includes('password') ||
    msg.includes('characters')
  ) {
    return getPasswordErrorMessage(error)
  }

  if (code === 'over_request_rate_limit' || status === 429 || msg.includes('rate limit')) {
    return 'Demasiados intentos seguidos. Esperá unos minutos e intentá de nuevo.'
  }

  return 'No pudimos crear la cuenta. Revisá el email e intentá de nuevo.'
}

/**
 * Traduce los errores durante el inicio de sesión tradicional (signInWithPassword).
 */
export function getSignInErrorMessage(error: AuthError | Error | null | unknown): string {
  if (!error) return ''

  const err = error as GenericAuthError
  const code = (err.code || '').toLowerCase()
  const msg = (err.message || '').toLowerCase()
  const status = err.status

  if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) {
    return 'Tenés que confirmar tu email antes de entrar. Revisá tu bandeja de entrada.'
  }

  if (code === 'over_request_rate_limit' || status === 429 || msg.includes('rate limit')) {
    return 'Demasiados intentos seguidos. Esperá unos minutos e intentá de nuevo.'
  }

  return 'No pudimos iniciar sesión. Revisá el email y la contraseña.'
}
