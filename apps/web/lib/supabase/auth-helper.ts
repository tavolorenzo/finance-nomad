import type { SupabaseClient, User } from '@supabase/supabase-js'

export interface CookieItem {
  name: string
  value: string
}

/**
 * Extrae la información del usuario directamente desde las cookies de sesión
 * de Supabase (`sb-*-auth-token`) de forma síncrona y local sin roundtrip de red.
 * Esto permite mantener la sesión activa en el cliente o servidor cuando no hay conexión.
 */
export function extractUserFromCookies(cookies: CookieItem[]): User | null {
  if (!cookies || !Array.isArray(cookies)) return null

  const authCookie = cookies.find(
    (c) => c.name.startsWith('sb-') && c.name.includes('-auth-token')
  )
  if (!authCookie) return null

  const authCookiePrefix = authCookie.name.split('.')[0]

  // Puede ser una sola cookie o fragmentada (.0, .1, etc.)
  const single = cookies.find((c) => c.name === authCookiePrefix)
  let raw = single ? single.value : ''

  if (!raw) {
    const chunks: string[] = []
    for (let i = 0; ; i++) {
      const c = cookies.find((cookie) => cookie.name === `${authCookiePrefix}.${i}`)
      if (!c) break
      chunks.push(c.value)
    }
    raw = chunks.join('')
  }

  if (!raw) return null

  try {
    let str = raw
    if (str.startsWith('%')) {
      str = decodeURIComponent(str)
    }
    if (str.startsWith('base64-')) {
      str = Buffer.from(str.slice(7), 'base64url').toString('utf8')
    }

    const parsed = JSON.parse(str)

    // Formato 1: Objeto con propiedad user
    if (parsed.user && (parsed.user.id || parsed.user.sub)) {
      return {
        ...parsed.user,
        id: parsed.user.id || parsed.user.sub
      } as User
    }

    // Formato 2: Objeto con access_token JWT o array [access_token, refresh_token]
    const token =
      parsed.access_token || (Array.isArray(parsed) && typeof parsed[0] === 'string' ? parsed[0] : null)

    if (token && typeof token === 'string' && token.includes('.')) {
      const parts = token.split('.')
      if (parts.length >= 2) {
        const payloadStr = Buffer.from(parts[1], 'base64url').toString('utf8')
        const payload = JSON.parse(payloadStr)
        if (payload && (payload.sub || payload.id)) {
          return {
            id: payload.sub || payload.id,
            email: payload.email,
            user_metadata: payload.user_metadata || {},
            app_metadata: payload.app_metadata || {},
            aud: payload.aud || 'authenticated',
            role: payload.role || 'authenticated',
            created_at: payload.created_at || new Date(0).toISOString(),
            confirmed_at: payload.confirmed_at
          } as User
        }
      }
    }
  } catch {
    return null
  }

  return null
}

/**
 * Obtiene el usuario autenticado con tolerancia completa a fallos de red (offline).
 * 1. Intenta revalidar con `supabase.auth.getUser()`.
 * 2. Si falla por corte de red o Supabase inaccesible, recupera la sesión desde las cookies.
 */
export async function getAuthenticatedUser(
  supabase: SupabaseClient,
  providedCookies?: CookieItem[]
): Promise<User | null> {
  // 1. Intento primario con getUser() de Supabase (validación con el servidor si hay conexión)
  try {
    const { data, error } = await supabase.auth.getUser()
    if (data?.user) {
      return data.user
    }

    // Si el error es una revocación explícita (401/403) y no un fallo de red, no hay usuario
    if (
      error &&
      error.status !== 0 &&
      error.name !== 'AuthRetryableFetchError' &&
      !error.message?.includes('fetch failed') &&
      !error.message?.includes('NetworkError') &&
      !error.message?.includes('ENOTFOUND')
    ) {
      return null
    }
  } catch {
    // Error de red no capturado por el SDK (ej. DNS no resuelto o timeout)
  }

  // 2. Fallback offline: usar cookies provistas explícitamente (ej. en middleware)
  if (providedCookies && providedCookies.length > 0) {
    return extractUserFromCookies(providedCookies)
  }

  // 3. Fallback offline en Server Components: extraer cookies vía next/headers
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const all = cookieStore.getAll()
    return extractUserFromCookies(all)
  } catch {
    // Fuera de entorno next/headers
  }

  return null
}
