import type { SupabaseClient } from '@supabase/supabase-js'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Valida la sintaxis básica de una dirección de correo electrónico.
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false
  return EMAIL_REGEX.test(email.trim())
}

/**
 * Consulta a Supabase mediante la función RPC `check_user_exists`
 * si el correo ya cuenta con un usuario registrado en auth.users.
 */
export async function checkUserExists(
  supabase: SupabaseClient,
  email: string
): Promise<{ exists: boolean; error: Error | null }> {
  const cleanEmail = email.trim().toLowerCase()
  if (!isValidEmail(cleanEmail)) {
    return { exists: false, error: new Error('Formato de email inválido') }
  }

  try {
    const { data, error } = await supabase.rpc('check_user_exists', {
      lookup_email: cleanEmail
    })

    if (error) {
      return { exists: false, error }
    }

    return { exists: Boolean(data), error: null }
  } catch (err: any) {
    return { exists: false, error: err instanceof Error ? err : new Error(String(err)) }
  }
}
