'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteTransaction } from '@/app/(protected)/transactions/new/actions'

export function DeleteTransactionButton({ transactionId }: { transactionId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm('¿Seguro que querés eliminar este movimiento? Si es una transferencia, se eliminarán ambos lados.')) {
      return
    }
    setLoading(true)
    try {
      await deleteTransaction(transactionId)
    } catch (err: any) {
      alert(err?.message || 'Error al eliminar el movimiento')
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
      <Trash2 size={13} />
    </button>
  )
}
