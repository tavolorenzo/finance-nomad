'use client'

import { useState } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { useOptionalLedger } from '@/lib/ledger/ledger-context'
import { deleteTransaction as deleteTransactionServer } from '@/app/(protected)/transactions/new/actions'

export function DeleteTransactionButton({ transactionId }: { transactionId: string }) {
  const [loading, setLoading] = useState(false)
  const ledger = useOptionalLedger()

  async function handleDelete() {
    if (!confirm('¿Seguro que querés eliminar este movimiento? Si es una transferencia, se eliminarán ambos lados.')) {
      return
    }
    setLoading(true)
    try {
      if (ledger) {
        await ledger.deleteTransaction(transactionId)
      } else {
        await deleteTransactionServer(transactionId)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar el movimiento'
      alert(msg)
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      title="Eliminar movimiento"
      className="text-text-muted hover:text-expense p-1 rounded transition opacity-60 hover:opacity-100 disabled:opacity-30"
    >
      {loading ? <Loader2 size={13} className="animate-spin text-expense" /> : <Trash2 size={13} />}
    </button>
  )
}
