import type { SupabaseClient } from '@supabase/supabase-js'

export const UPDATE_PASSWORD_PATH = '/auth/update-password'

export function passwordResetRedirectTo(origin: string) {
  return `${origin}/auth/confirm?next=${UPDATE_PASSWORD_PATH}`
}

export async function sendPasswordResetEmail(
  supabase: SupabaseClient,
  email: string
) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: passwordResetRedirectTo(window.location.origin)
  })
}

export function safeNextPath(next: string | null, type: string | null) {
  const allowed =
    next &&
    next.startsWith('/') &&
    !next.startsWith('//') &&
    !next.includes('\\')
      ? next
      : null

  if (allowed) return allowed
  if (type === 'recovery') return UPDATE_PASSWORD_PATH
  return '/dashboard'
}
