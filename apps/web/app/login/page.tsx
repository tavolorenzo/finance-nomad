'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { sendPasswordResetEmail } from '@/lib/auth/password-reset'
import { getSignUpErrorMessage, getSignInErrorMessage } from '@/lib/auth/password-errors'
import { isValidEmail, checkUserExists } from '@/lib/auth/user-lookup'

type Step = 'email' | 'password_login' | 'password_signup' | 'reset'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const passwordRef = useRef<HTMLInputElement>(null)
  const backToLoginRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('error') === 'confirmacion_invalida') {
      setError('El link no es válido o ya se usó. Pedí uno nuevo.')
    } else if (params.get('confirmed') === 'true') {
      setNotice('¡Tu cuenta fue confirmada con éxito! Ya podés ingresar con tu email y contraseña.')
    }
  }, [])

  useEffect(() => {
    if (step === 'password_login' || step === 'password_signup') {
      passwordRef.current?.focus()
    } else if (step === 'reset' && resetSent) {
      backToLoginRef.current?.focus()
    }
  }, [step, resetSent])

  const emailIsValid = isValidEmail(email)

  function handleChangeEmail() {
    setStep('email')
    setPassword('')
    setConfirmPassword('')
    setError(null)
  }

  function handleSwitchToReset() {
    setStep('reset')
    setResetSent(false)
    setPassword('')
    setConfirmPassword('')
    setError(null)
  }

  function handleBackToLogin() {
    setStep('email')
    setResetSent(false)
    setPassword('')
    setConfirmPassword('')
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

  async function handleCheckEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!emailIsValid) return

    setError(null)
    setNotice(null)
    setLoading(true)

    const { exists, error: checkError } = await checkUserExists(supabase, email)

    setLoading(false)

    if (checkError) {
      // Fallback de resiliencia si la RPC no existe aún o hay fallo de red:
      // Pasamos a login por defecto para no bloquear al usuario
      console.warn('RPC check_user_exists fallback:', checkError.message)
      setStep('password_login')
      return
    }

    if (exists) {
      setStep('password_login')
    } else {
      setStep('password_signup')
    }
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!password) return

    setError(null)
    setNotice(null)
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setError(getSignInErrorMessage(signInError))
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  async function handlePasswordSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` }
    })

    if (signUpError) {
      setError(getSignUpErrorMessage(signUpError))
      setLoading(false)
      return
    }

    // Tras crear cuenta con éxito, regresamos al estado inicial
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setStep('email')
    setLoading(false)
    setNotice('¡Cuenta creada con éxito! Te mandamos un link a tu correo para confirmarla antes de entrar.')
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return

    setError(null)
    setNotice(null)
    setLoading(true)

    const { error: resetError } = await sendPasswordResetEmail(supabase, email)
    if (resetError) {
      setError('No pudimos enviar el link. Revisá el email e intentá de nuevo.')
    } else {
      setResetSent(true)
      setNotice('Te mandamos un link al email para restablecer la contraseña. Revisá tu bandeja de entrada o spam.')
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-surface-1 border border-border rounded-card p-6 space-y-4 shadow-sm">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">Finance Nomad</h1>
          <p className="text-sm text-text-secondary mt-1">
            {step === 'reset'
              ? 'Restablecé tu contraseña'
              : step === 'password_signup'
              ? 'Creá tu contraseña para empezar'
              : step === 'password_login'
              ? 'Ingresá tu contraseña'
              : 'Entrá a tu cuenta o registrate'}
          </p>
        </div>

        {/* 1. Botón Continuar con Google superior (sólo visible en el paso inicial de email) */}
        {step === 'email' && (
          <div className="space-y-3 pt-1">
            <button
              id="btn-google"
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

            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-surface-1 px-2 text-text-muted">o con tu correo</span>
              </div>
            </div>
          </div>
        )}

        {/* 2. Formularios según el paso actual */}
        {step === 'email' && (
          <form onSubmit={handleCheckEmail} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-text-secondary mb-1">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoFocus
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
                autoComplete="email"
              />
            </div>

            {error && <p className="text-sm text-expense font-medium">{error}</p>}
            {notice && <p className="text-sm text-income font-medium">{notice}</p>}

            <button
              id="btn-continue"
              type="submit"
              disabled={!emailIsValid || loading}
              className="w-full bg-accent text-[color:var(--on-accent)] py-3 rounded-control font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Comprobando...' : 'Continuar'}
            </button>
          </form>
        )}

        {step === 'password_login' && (
          <form onSubmit={handlePasswordLogin} className="space-y-4 animate-in fade-in duration-200">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-text-secondary">Email</label>
                <button
                  id="btn-change-email"
                  type="button"
                  onClick={handleChangeEmail}
                  className="text-xs text-accent font-medium hover:underline"
                >
                  Cambiar
                </button>
              </div>
              <div className="px-3 py-2 bg-surface-0 border border-border rounded-control text-sm text-text-primary">
                {email}
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-text-secondary mb-1">
                Contraseña
              </label>
              <input
                ref={passwordRef}
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full"
                autoComplete="current-password"
              />
            </div>

            <div className="flex justify-end">
              <button
                id="btn-forgot-password"
                type="button"
                onClick={handleSwitchToReset}
                className="text-xs text-text-muted hover:text-accent transition"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {error && <p className="text-sm text-expense font-medium">{error}</p>}
            {notice && <p className="text-sm text-income font-medium">{notice}</p>}

            <button
              id="btn-submit"
              type="submit"
              disabled={loading || !password}
              className="w-full bg-accent text-[color:var(--on-accent)] py-3 rounded-control font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>
        )}

        {step === 'password_signup' && (
          <form onSubmit={handlePasswordSignup} className="space-y-4 animate-in fade-in duration-200">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-text-secondary">Email</label>
                <button
                  type="button"
                  onClick={handleChangeEmail}
                  className="text-xs text-accent font-medium hover:underline"
                >
                  Cambiar
                </button>
              </div>
              <div className="px-3 py-2 bg-surface-0 border border-border rounded-control text-sm text-text-primary">
                {email}
              </div>
            </div>

            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium text-text-secondary mb-1">
                Creá tu contraseña
              </label>
              <input
                ref={passwordRef}
                id="signup-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full"
                autoComplete="new-password"
              />
              <p className="text-xs text-text-muted mt-1">
                Mínimo 6 caracteres (te sugerimos 8 o más combinando letras y números).
              </p>
            </div>

            <div>
              <label htmlFor="signup-confirm-password" className="block text-sm font-medium text-text-secondary mb-1">
                Repetí la contraseña
              </label>
              <input
                id="signup-confirm-password"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full"
                autoComplete="new-password"
              />
            </div>

            {error && <p className="text-sm text-expense font-medium">{error}</p>}
            {notice && <p className="text-sm text-income font-medium">{notice}</p>}

            <button
              id="btn-submit"
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className="w-full bg-accent text-[color:var(--on-accent)] py-3 rounded-control font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4 animate-in fade-in duration-200">
            <p className="text-sm text-text-muted">
              {resetSent
                ? 'Revisá tu casilla de correo. El link de restablecimiento te permitirá elegir una contraseña nueva.'
                : 'Ingresá el email de tu cuenta y te mandamos un link para elegir una contraseña nueva.'}
            </p>

            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium text-text-secondary mb-1">
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (resetSent) setResetSent(false)
                }}
                className="w-full"
                autoComplete="email"
              />
            </div>

            {error && <p className="text-sm text-expense font-medium">{error}</p>}
            {notice && <p className="text-sm text-income font-medium">{notice}</p>}

            {resetSent ? (
              <div className="space-y-3 pt-1">
                <button
                  ref={backToLoginRef}
                  id="btn-back-to-login"
                  type="button"
                  onClick={handleBackToLogin}
                  className="w-full bg-accent text-[color:var(--on-accent)] py-3 rounded-control font-medium hover:opacity-90 transition shadow-sm"
                >
                  Volver al inicio de sesión
                </button>

                <button
                  id="btn-resend-link"
                  type="submit"
                  disabled={loading || !emailIsValid}
                  className="w-full text-xs text-text-muted hover:text-text-primary py-1 transition disabled:opacity-50 text-center block"
                >
                  {loading ? 'Reenviando...' : '¿No te llegó? Reenviar link'}
                </button>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <button
                  id="btn-send-reset-link"
                  type="submit"
                  disabled={loading || !emailIsValid}
                  className="w-full bg-accent text-[color:var(--on-accent)] py-3 rounded-control font-medium hover:opacity-90 transition disabled:opacity-50"
                >
                  {loading ? 'Un momento...' : 'Mandar link'}
                </button>

                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="w-full text-xs text-text-muted hover:text-text-primary py-1 transition"
                >
                  Volver al inicio de sesión
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </main>
  )
}
