'use client'

import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { confirmTransaction } from '@/app/(protected)/transactions/new/actions'

export function ConfirmTransactionButton({ transactionId }: { transactionId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    try {
      setLoading(true)
      await confirmTransaction(transactionId)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al confirmar la cuota')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleConfirm}
      disabled={loading}
      className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-control bg-surface-2 text-text-secondary hover:bg-accent hover:text-surface-0 transition disabled:opacity-50"
      title="Confirmar cuota e impactar saldo"
    >
      {loading ? (
        <Loader2 size={11} className="animate-spin" />
      ) : (
        <Check size={11} />
      )}
      <span>Confirmar</span>
    </button>
  )
}
