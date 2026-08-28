'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { registerCollection } from '@/app/(protected)/people/actions'
import { formatMoney } from '@/lib/currency'
import type { MasterTransaction, Person } from '@/lib/types'

export function PersonActions({
  person,
  pending
}: {
  person: Person
  pending: MasterTransaction[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleCollect() {
    setLoading(true)
    await registerCollection(person.id)
    router.refresh()
    setLoading(false)
  }

  function handleNotify() {
    const lines = pending.map(
      (t) => `- ${t.notes ?? 'Movimiento'}: ${formatMoney(t.amount_account, t.currency_account)}`
    )
    const total = pending.reduce((sum, t) => sum + t.amount_account, 0)
    const currency = pending[0]?.currency_account ?? ''
    const message = `Hola ${person.name}! Te paso el detalle de lo pendiente:\n\n${lines.join('\n')}\n\nTotal: ${formatMoney(total, currency)}`
    const url = person.phone
      ? `https://wa.me/${person.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleNotify}
        disabled={pending.length === 0}
        className="flex-1 border border-border text-text-primary py-2.5 rounded-control text-sm font-medium disabled:opacity-40"
      >
        Notificar por WhatsApp
      </button>
      <button
        onClick={handleCollect}
        disabled={pending.length === 0 || loading}
        className="flex-1 bg-accent text-[color:var(--on-accent)] py-2.5 rounded-control text-sm font-medium disabled:opacity-40"
      >
        {loading ? 'Registrando...' : 'Registrar cobro'}
      </button>
    </div>
  )
}
