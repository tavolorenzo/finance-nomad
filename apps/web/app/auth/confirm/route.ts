import { createServerClient } from '@supabase/ssr'
import { type EmailOtpType } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { safeNextPath } from '@/lib/auth/password-reset'

// Ruta a la que apuntan los links de confirmación y restablecimiento
// (emailRedirectTo / resetPasswordForEmail / token_hash).
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')
  const next = safeNextPath(searchParams.get('next'), type)

  const redirectTo = new URL(next, request.url)
  const response = NextResponse.redirect(redirectTo)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // 1. Verificación directa con token_hash (recomendada para SSR y flujo entre dispositivos)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      return response
    }
  }

  // 2. Intercambio de código PKCE
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return response
    }
  }

  // 3. Fallback: Si el usuario ya fue verificado en Supabase pero no se pudo persistir la sesión
  // (ej. abierto desde otro cliente de correo), redirigir al login con confirmación positiva
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('confirmed', 'true')
  return NextResponse.redirect(loginUrl)
}
