'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { sendPasswordResetEmail } from '@/lib/auth/password-reset'

type Mode = 'login' | 'signup' | 'reset'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('error') === 'confirmacion_invalida') {
      setError('El link no es válido o ya se usó. Pedí uno nuevo.')
    } else if (params.get('confirmed') === 'true') {
      setNotice('¡Tu cuenta fue confirmada con éxito! Ya podés ingresar con tu email y contraseña.')
    }
  }, [])

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setNotice(null)
  }

  async function handleOAuth(provider: 'google' | 'apple') {
    setError(null)
    setNotice(null)
    setLoading(true)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/confirm?next=/dashboard`
      }
    })
    if (oauthError) {
      setError(`No pudimos conectar con ${provider === 'google' ? 'Google' : 'Apple'}. Intentá de nuevo.`)
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setLoading(true)

    if (mode === 'reset') {
      const { error: resetError } = await sendPasswordResetEmail(supabase, email)
      if (resetError) {
        setError('No pudimos enviar el link. Revisá el email e intentá de nuevo.')
      } else {
        setNotice('Te mandamos un link al email para restablecer la contraseña.')
      }
      setLoading(false)
      return
    }

    if (mode === 'login') {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setError('No pudimos iniciar sesión. Revisá el email y la contraseña.')
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } else {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/confirm` }
      })
      if (signUpError) {
        setError('No pudimos crear la cuenta. Revisá el email e intentá de nuevo.')
      } else {
        setNotice('Revisá tu email para confirmar la cuenta antes de entrar.')
      }
    }
    setLoading(false)
  }

  const title =
    mode === 'login' ? 'Entrá a tu cuenta' : mode === 'signup' ? 'Creá tu cuenta' : 'Restablecé la contraseña'

  const submitLabel =
    mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Crear cuenta' : 'Mandar link'

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-surface-1 border border-border rounded-card p-6 space-y-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">Finance Nomad</h1>
          <p className="text-sm text-text-secondary mt-1">{title}</p>
        </div>

        {mode === 'reset' && (
          <p className="text-sm text-text-muted">
            Ingresá el email de tu cuenta y te mandamos un link para elegir una contraseña nueva.
          </p>
        )}

        {mode !== 'reset' && (
          <div className="space-y-2 pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleOAuth('google')}
              className="w-full flex items-center justify-center gap-3 bg-surface-2 hover:bg-surface-0 border border-border text-text-primary py-2.5 px-4 rounded-control font-medium transition disabled:opacity-50 text-sm"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continuar con Google</span>
            </button>

            {/* Botón de acceso con Apple deshabilitado/oculto temporalmente hasta su configuración en Supabase */}
            {/*
            <button
              type="button"
              disabled={loading}
              onClick={() => handleOAuth('apple')}
              className="w-full flex items-center justify-center gap-3 bg-surface-2 hover:bg-surface-0 border border-border text-text-primary py-2.5 px-4 rounded-control font-medium transition disabled:opacity-50 text-sm"
            >
              <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.58-7.7-11.64-13.98-5.99-9.35-10.74-19.98-14.25-31.9-3.52-11.92-5.27-23.23-5.27-33.94 0-14.36 3.59-26.47 10.77-36.33 7.18-9.86 16.3-14.86 27.36-15 4.35 0 9.29 1.14 14.82 3.43 5.53 2.28 9.28 3.52 11.25 3.72 2.65-.43 6.64-1.8 11.97-4.11 5.33-2.31 10.02-3.32 14.07-3.03 15.54.98 27.27 6.78 35.19 17.41-13.79 8.37-20.5 19.8-20.13 34.3.37 11.45 4.78 20.94 13.23 28.48 8.45 7.54 18.28 11.75 29.49 12.63-2.31 7.29-5.18 14.73-8.6 22.33zm-39.73-109.8c0-6.19 2.24-12.18 6.72-17.97 4.48-5.79 10.09-9.75 16.83-11.88.85 4.99.57 10.21-.84 15.66-1.41 5.45-4.14 10.37-8.19 14.76-3.8 4.25-8.19 7.37-13.16 9.36-.64-3.33-1.36-6.64-1.36-9.93z" />
              </svg>
              <span>Continuar con Apple</span>
            </button>
            */}

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-surface-1 px-2 text-text-muted">o continuá con email</span>
              </div>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="login-email" className="block text-sm font-medium text-text-secondary mb-1">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full"
            autoComplete="email"
          />
        </div>

        {mode !== 'reset' && (
          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-text-secondary mb-1">
              Contraseña
            </label>
            <input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={6}
            />
          </div>
        )}

        {error && <p className="text-sm text-expense font-medium">{error}</p>}
        {notice && <p className="text-sm text-income font-medium">{notice}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent text-[color:var(--on-accent)] py-3 rounded-control font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? 'Un momento...' : submitLabel}
        </button>

        {mode === 'login' && (
          <button
            type="button"
            onClick={() => switchMode('reset')}
            className="w-full text-xs text-text-muted hover:text-text-primary py-1 transition"
          >
            Olvidé la contraseña
          </button>
        )}

        {mode === 'reset' ? (
          <button
            type="button"
            onClick={() => switchMode('login')}
            className="w-full text-xs text-text-muted hover:text-text-primary py-1 transition"
          >
            Volver al inicio de sesión
          </button>
        ) : (
          <button
            type="button"
            onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
            className="w-full text-xs text-text-muted hover:text-text-primary py-1 transition"
          >
            {mode === 'login' ? '¿No tenés cuenta? Creá una' : '¿Ya tenés cuenta? Entrá'}
          </button>
        )}
      </form>
    </main>
  )
}
