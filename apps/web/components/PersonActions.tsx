'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Settings } from 'lucide-react'
import { registerCollection } from '@/app/(protected)/people/actions'
import { formatMoney } from '@/lib/currency'
import { formatWhatsAppMessage } from '@/lib/whatsapp'
import { WhatsAppNotifyModal } from '@/components/WhatsAppNotifyModal'
import type { MasterTransaction, Person } from '@/lib/types'

export function PersonActions({
  person,
  pending,
  whatsappTemplate
}: {
  person: Person
  pending: MasterTransaction[]
  whatsappTemplate?: string | null
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false)

  async function handleCollect() {
    setLoading(true)
    await registerCollection(person.id)
    router.refresh()
    setLoading(false)
  }

  const total = pending.reduce((sum, t) => sum + t.amount_account, 0)
  const currency = pending[0]?.currency_account ?? ''

  const renderedMessage = formatWhatsAppMessage({
    template: whatsappTemplate,
    personName: person.name,
    totalFormatted: formatMoney(total, currency),
    items: pending.map((t) => ({
      description: t.notes || 'Movimiento',
      amountFormatted: formatMoney(t.amount_account, t.currency_account)
    }))
  })

  function handleOpenNotifyModal() {
    setIsNotifyModalOpen(true)
  }

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={handleOpenNotifyModal}
          disabled={pending.length === 0}
          className="flex-1 border border-border text-text-primary py-2.5 rounded-control text-sm font-medium hover:bg-surface-2 transition disabled:opacity-40"
        >
          Notificar por WhatsApp
        </button>
        <Link
          href="/people/template"
          title="Configurar plantilla de WhatsApp"
          className="px-3 border border-border text-text-muted hover:text-text-primary rounded-control flex items-center justify-center hover:bg-surface-2 transition"
        >
          <Settings size={16} />
        </Link>
        <button
          onClick={handleCollect}
          disabled={pending.length === 0 || loading}
          className="flex-1 bg-accent text-[color:var(--on-accent)] py-2.5 rounded-control text-sm font-medium hover:opacity-90 transition disabled:opacity-40"
        >
          {loading ? 'Registrando...' : 'Registrar cobro'}
        </button>
      </div>

      <WhatsAppNotifyModal
        isOpen={isNotifyModalOpen}
        onClose={() => setIsNotifyModalOpen(false)}
        person={person}
        initialMessage={renderedMessage}
      />
    </>
  )
}
