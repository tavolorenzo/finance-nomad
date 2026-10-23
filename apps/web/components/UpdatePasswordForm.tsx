'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getPasswordErrorMessage } from '@/lib/auth/password-errors'

export function UpdatePasswordForm({ afterSave = '/dashboard' }: { afterSave?: string }) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)

    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(getPasswordErrorMessage(updateError))
      setLoading(false)
      return
    }

    if (afterSave === '/settings') {
      setPassword('')
      setConfirm('')
      setNotice('Contraseña actualizada')
      setLoading(false)
      router.refresh()
      return
    }

    router.push(afterSave)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="new-password" className="block text-sm font-medium text-text-secondary mb-1">Nueva contraseña</label>
        <input
          id="new-password"
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
        <label htmlFor="confirm-password" className="block text-sm font-medium text-text-secondary mb-1">Repetí la contraseña</label>
        <input
          id="confirm-password"
          type="password"
          required
          minLength={6}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full"
          autoComplete="new-password"
        />
      </div>

      {error && (
        <div className="space-y-1">
          <p className="text-sm text-expense font-medium">{error}</p>
          {(error.includes('expiró') || error.includes('link')) && (
            <Link href="/login" className="inline-block text-xs text-accent font-medium hover:underline">
              Pedí un nuevo enlace acá
            </Link>
          )}
        </div>
      )}
      {notice && <p className="text-sm text-income font-medium">{notice}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-accent text-[color:var(--on-accent)] py-3 rounded-control font-medium hover:opacity-90 transition disabled:opacity-50"
      >
        {loading ? 'Un momento...' : 'Guardar contraseña'}
      </button>
    </form>
  )
}
