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
    }
  }, [])

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setNotice(null)
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
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-surface-1 border border-border rounded-card p-6 space-y-3">
        <p className="font-display text-xl font-medium">Finance Nomad</p>
        <p className="text-sm text-text-secondary mb-2">{title}</p>

        {mode === 'reset' && (
          <p className="text-sm text-text-muted">
            Ingresá el email de tu cuenta y te mandamos un link para elegir una contraseña nueva.
          </p>
        )}

        <label className="block text-xs text-text-muted">Email</label>
        <input
          type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full" autoComplete="email"
        />

        {mode !== 'reset' && (
          <>
            <label className="block text-xs text-text-muted">Contraseña</label>
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full" autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={6}
            />
          </>
        )}

        {error && <p className="text-sm text-expense">{error}</p>}
        {notice && <p className="text-sm text-income">{notice}</p>}

        <button type="submit" disabled={loading}
          className="w-full bg-accent text-[color:var(--on-accent)] py-3 rounded-control font-medium disabled:opacity-50">
          {loading ? 'Un momento...' : submitLabel}
        </button>

        {mode === 'login' && (
          <button
            type="button"
            onClick={() => switchMode('reset')}
            className="w-full text-sm text-text-secondary py-1"
          >
            Olvidé la contraseña
          </button>
        )}

        {mode === 'reset' ? (
          <button
            type="button"
            onClick={() => switchMode('login')}
            className="w-full text-sm text-text-secondary py-1"
          >
            Volver al inicio de sesión
          </button>
        ) : (
          <button
            type="button"
            onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
            className="w-full text-sm text-text-secondary py-1"
          >
            {mode === 'login' ? 'No tenés cuenta? Creá una' : 'Ya tenés cuenta? Entrá'}
          </button>
        )}
      </form>
    </main>
  )
}
