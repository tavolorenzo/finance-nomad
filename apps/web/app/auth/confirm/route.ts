import { createClient } from '@/lib/supabase/server'
import { type EmailOtpType } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { type NextRequest } from 'next/server'
import { safeNextPath } from '@/lib/auth/password-reset'

// Ruta a la que apuntan los links de confirmación y restablecimiento
// (emailRedirectTo / resetPasswordForEmail).
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')
  const next = safeNextPath(searchParams.get('next'), type)

  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) redirect(next)
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) redirect(next)
  }

  redirect('/login?error=confirmacion_invalida')
}
