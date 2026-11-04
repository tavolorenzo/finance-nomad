'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Settings } from 'lucide-react'
import { formatMoney } from '@/lib/currency'
import { formatWhatsAppMessage } from '@/lib/whatsapp'
import {
  isCurrentCollectibleDebt,
  isDebtOfAccountingPeriod
} from '@/lib/ledger/settlement'
import { WhatsAppNotifyModal } from '@/components/WhatsAppNotifyModal'
import { RegisterPersonPaymentModal } from '@/components/RegisterPersonPaymentModal'
import { useOptionalLedger } from '@/lib/ledger/ledger-context'
import type { Account, Category, MasterTransaction, Person } from '@/lib/types'

export function PersonActions({
  person,
  pending,
  selectedPeriod,
  whatsappTemplate,
  accounts = [],
  categories = []
}: {
  person: Person
  pending: MasterTransaction[]
  selectedPeriod?: string
  whatsappTemplate?: string | null
  accounts?: (Account & { institutions?: { name: string } })[]
  categories?: Category[]
}) {
  const router = useRouter()
  const ledger = useOptionalLedger()
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)

  const today = new Date().toISOString().slice(0, 10)
  const activePeriod =
    selectedPeriod && /^\d{4}-\d{2}$/.test(selectedPeriod)
      ? selectedPeriod
      : today.slice(0, 7)

  const periodPending = pending.filter((t) => isDebtOfAccountingPeriod(t, activePeriod))
  const cumulativePending = pending.filter((t) => isCurrentCollectibleDebt(t, activePeriod))
  const itemsToNotify =
    periodPending.length > 0
      ? periodPending
      : cumulativePending.length > 0
        ? cumulativePending
        : pending

  // Saldo pendiente del período contable seleccionado considerando pagos parciales previos
  const total = itemsToNotify.reduce(
    (sum, t) => sum + Math.max(0, t.amount_account - (t.settled_amount ?? 0)),
    0
  )
  const currency = itemsToNotify[0]?.currency_account ?? pending[0]?.currency_account ?? 'UYU'

  const renderedMessage = formatWhatsAppMessage({
    template: whatsappTemplate,
    personName: person.name,
    totalFormatted: formatMoney(total, currency),
    items: itemsToNotify.map((t) => {
      const rem = Math.max(0, t.amount_account - (t.settled_amount ?? 0))
      const isPartial = (t.settled_amount ?? 0) > 0
      return {
        description: isPartial
          ? `${t.notes || 'Movimiento'} (Saldo restante)`
          : t.notes || 'Movimiento',
        amountFormatted: formatMoney(rem, t.currency_account)
      }
    })
  })

  function handleOpenNotifyModal() {
    setIsNotifyModalOpen(true)
  }

  function handlePaymentSuccess() {
    ledger?.refresh().catch(() => {})
    router.refresh()
  }

  return (
    <>
      <div className="flex gap-2">
        <button
          type="button"
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
          type="button"
          onClick={() => setIsPaymentModalOpen(true)}
          disabled={pending.length === 0}
          className="flex-1 bg-accent text-[color:var(--on-accent)] py-2.5 rounded-control text-sm font-medium hover:opacity-90 transition disabled:opacity-40"
        >
          Registrar cobro
        </button>
      </div>

      <WhatsAppNotifyModal
        isOpen={isNotifyModalOpen}
        onClose={() => setIsNotifyModalOpen(false)}
        person={person}
        initialMessage={renderedMessage}
      />

      <RegisterPersonPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        person={person}
        pendingTransactions={pending}
        selectedPeriod={activePeriod}
        accounts={accounts}
        categories={categories}
        onSuccess={handlePaymentSuccess}
      />
    </>
  )
}
