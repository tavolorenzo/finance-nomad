import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PREFIXES = [
  '/dashboard', '/accounts', '/transactions', '/people', '/budget',
  '/loans', '/portfolio', '/settings', '/institutions'
]

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const path = request.nextUrl.pathname
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p))
  const cookies = request.cookies.getAll()
  const hasAuthCookie = cookies.some((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'))

  // Atajo 1: Ruta protegida sin ninguna cookie de sesión -> Redirigir a login de inmediato sin golpear Supabase
  if (isProtected && !hasAuthCookie) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Atajo 2: /login sin ninguna cookie de sesión -> Mostrar login de inmediato sin llamada a Supabase
  if (path === '/login' && !hasAuthCookie) {
    return supabaseResponse
  }

  // Atajo 3: Prefetches automáticos de Next.js en rutas protegidas con cookie de auth ->
  // Dejar pasar sin revalidar contra el servidor remoto de Supabase en cada hover/enlace
  const isPrefetch =
    request.headers.get('purpose') === 'prefetch' ||
    request.headers.get('next-router-prefetch') === '1'

  if (isPrefetch && isProtected && hasAuthCookie) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: any }[]) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        }
      }
    }
  )

  // Revalidar sesión contra el servidor de Supabase y refrescar cookies de ser necesario
  const { data: { user } } = await supabase.auth.getUser()

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // /auth/update-password queda accesible con sesión (link de recovery)
  // y sin sesión (tokens en el hash que el cliente parsea).
  if (user && path === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
