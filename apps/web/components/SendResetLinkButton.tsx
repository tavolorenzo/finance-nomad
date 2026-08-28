'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { sendPasswordResetEmail } from '@/lib/auth/password-reset'

export function SendResetLinkButton({ email }: { email: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function handleClick() {
    setError(null)
    setNotice(null)
    setLoading(true)
    const supabase = createClient()
    const { error: resetError } = await sendPasswordResetEmail(supabase, email)
    if (resetError) {
      setError('No pudimos enviar el link. Revisá tu conexión e intentá de nuevo.')
    } else {
      setNotice('Te mandamos un link al email para restablecer la contraseña.')
    }
    setLoading(false)
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || !email}
        className="w-full border border-border text-text-primary py-2.5 rounded-control text-sm font-medium disabled:opacity-50"
      >
        {loading ? 'Un momento...' : 'Mandar link de restablecimiento'}
      </button>
      {error && <p className="text-sm text-expense">{error}</p>}
      {notice && <p className="text-sm text-income">{notice}</p>}
    </div>
  )
}
