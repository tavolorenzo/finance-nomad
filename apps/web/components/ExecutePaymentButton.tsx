'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { executeBudgetPayment } from '@/app/(protected)/budget/actions'

export function ExecutePaymentButton({ estimateId, disabled }: { estimateId: string; disabled: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      await executeBudgetPayment(estimateId)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo ejecutar el pago')
    }
    setLoading(false)
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={disabled || loading}
        className="text-xs bg-accent text-[color:var(--on-accent)] px-3 py-1.5 rounded-control font-medium disabled:opacity-40"
      >
        {loading ? 'Ejecutando...' : disabled ? 'Ya ejecutado' : 'Ejecutar pago'}
      </button>
      {error && <p className="text-xs text-expense mt-1">{error}</p>}
    </div>
  )
}
