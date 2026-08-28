'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { UpdatePasswordForm } from '@/components/UpdatePasswordForm'

export default function UpdatePasswordPage() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading')

  useEffect(() => {
    const supabase = createClient()
    let hasSession = false

    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        hasSession = true
        setStatus('ready')
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        hasSession = true
        setStatus('ready')
      }
    })

    void check()
    const timeout = window.setTimeout(() => {
      if (!hasSession) setStatus('missing')
    }, 2500)

    return () => {
      subscription.unsubscribe()
      window.clearTimeout(timeout)
    }
  }, [])

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-surface-1 border border-border rounded-card p-6 space-y-3">
        <p className="font-display text-xl font-medium">Finance Nomad</p>
        <p className="text-sm text-text-secondary mb-2">Elegí una contraseña nueva</p>

        {status === 'loading' && (
          <p className="text-sm text-text-muted">Validando el link...</p>
        )}

        {status === 'ready' && <UpdatePasswordForm />}

        {status === 'missing' && (
          <div className="space-y-3">
            <p className="text-sm text-expense">
              El link no es válido o ya se usó. Pedí uno nuevo.
            </p>
            <Link href="/login" className="block text-sm text-accent font-medium">
              Volver al inicio de sesión
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
