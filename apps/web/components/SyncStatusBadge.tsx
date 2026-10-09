'use client'

import { Cloud, CloudOff, Check, AlertCircle, RefreshCw } from 'lucide-react'
import { useLedger } from '@/lib/ledger/ledger-context'
import { useState } from 'react'

export function SyncStatusBadge() {
  const { syncState, retrySync } = useLedger()
  const [showTooltip, setShowTooltip] = useState(false)

  const isSyncing = syncState.isSyncing
  const hasFailed = syncState.failedCount > 0
  const hasPending = syncState.pendingCount > 0

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => {
          if (hasFailed || hasPending) {
            retrySync()
          } else {
            setShowTooltip(!showTooltip)
          }
        }}
        title={
          hasFailed
            ? `${syncState.failedCount} cambios pendientes de sincronizar. Tocá para reintentar.`
            : isSyncing
            ? 'Sincronizando cambios con el servidor...'
            : 'Todos los datos están sincronizados.'
        }
        className={`flex items-center gap-1.5 px-2 py-1 rounded-control text-xs font-medium transition cursor-pointer ${
          hasFailed
            ? 'bg-expense/10 text-expense hover:bg-expense/20'
            : isSyncing
            ? 'bg-pending/15 text-pending'
            : hasPending
            ? 'bg-surface-2 text-text-secondary hover:text-text-primary'
            : 'text-text-muted hover:text-text-primary'
        }`}
      >
        {hasFailed ? (
          <>
            <AlertCircle size={14} className="shrink-0 text-expense" />
            <span className="hidden sm:inline">{syncState.failedCount} pendiente{syncState.failedCount > 1 ? 's' : ''}</span>
            <RefreshCw size={12} className="animate-spin ml-0.5 opacity-60" />
          </>
        ) : isSyncing ? (
          <>
            <RefreshCw size={14} className="animate-spin shrink-0 text-accent" />
            <span className="hidden sm:inline text-text-secondary">Sincronizando...</span>
          </>
        ) : hasPending ? (
          <>
            <Cloud size={14} className="shrink-0 text-text-secondary" />
            <span className="hidden sm:inline">{syncState.pendingCount} en cola</span>
          </>
        ) : (
          <span className="flex items-center gap-1 text-income/90">
            <Cloud size={14} className="shrink-0" />
            <Check size={11} className="-ml-1 shrink-0 stroke-[2.5]" />
          </span>
        )}
      </button>

      {/* Tooltip flotante si se cliquea en estado sincronizado */}
      {showTooltip && !hasFailed && !isSyncing && (
        <div
          className="absolute right-0 top-full mt-1.5 w-48 bg-surface-1 border border-border rounded-control p-2 text-[11px] text-text-secondary shadow-lg z-50 animate-in fade-in"
          onMouseLeave={() => setShowTooltip(false)}
        >
          <p className="font-medium text-text-primary">Al día</p>
          <p className="mt-0.5 text-text-muted">
            Tus movimientos están respaldados en la base de datos.
          </p>
        </div>
      )}
    </div>
  )
}
