'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CloudOff } from 'lucide-react'
import { useModal } from '@/components/Modal'
import { createInstitution, updateInstitution, setInstitutionActive } from '@/app/(protected)/institutions/actions'
import { useOptionalLedger } from '@/lib/ledger/ledger-context'
import { useOnlineStatus } from '@/lib/hooks/use-online-status'
import type { Institution } from '@/lib/types'

export function InstitutionForm({ institution }: { institution?: Institution }) {
  const router = useRouter()
  const { isModal, close } = useModal()
  const ledger = useOptionalLedger()
  const isOnline = useOnlineStatus()
  const [name, setName] = useState(institution?.name ?? '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!isOnline) {
      setError('No tenés conexión a internet. Conectate para continuar.')
      return
    }

    setLoading(true)
    try {
      if (institution) {
        await updateInstitution(institution.id, name)
      } else {
        await createInstitution(name)
      }
      await ledger?.refresh().catch(() => {})
      if (isModal) {
        close()
      } else {
        router.push('/accounts')
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar. Intentá de nuevo.')
      setLoading(false)
    }
  }

  async function handleToggleActive() {
    if (!institution) return
    if (!isOnline) {
      setError('No tenés conexión a internet. Conectate para continuar.')
      return
    }

    setLoading(true)
    try {
      await setInstitutionActive(institution.id, !institution.is_active)
      await ledger?.refresh().catch(() => {})
      if (isModal) {
        close()
      } else {
        router.push('/accounts')
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo desactivar. Intentá de nuevo.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-3">
      {!isOnline && (
        <div className="bg-surface-2 border border-border rounded-control p-3 text-xs text-text-secondary flex items-start gap-2.5">
          <CloudOff size={16} className="text-text-muted shrink-0 mt-0.5" />
          <p>
            Estás sin conexión. Para {institution ? 'modificar' : 'crear'} una institución necesitás internet. Los movimientos contables ya registrados se siguen guardando offline normalmente.
          </p>
        </div>
      )}

      <div>
        <label htmlFor="institution-name" className="block text-sm font-medium text-text-secondary mb-1">
          Nombre de la institución
        </label>
        <input
          id="institution-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Commbank, Wise, Itaú..."
          className="w-full"
          required
          autoFocus
        />
      </div>

      {error && <p className="text-sm text-expense font-medium">{error}</p>}

      <button
        type="submit"
        disabled={loading || !isOnline}
        className="w-full bg-accent text-[color:var(--on-accent)] py-3 rounded-control font-medium hover:opacity-90 transition disabled:opacity-50"
      >
        {!isOnline ? 'Sin conexión a internet' : loading ? 'Guardando...' : institution ? 'Guardar cambios' : 'Crear institución'}
      </button>

      {institution && (
        <button
          type="button"
          onClick={handleToggleActive}
          disabled={loading || !isOnline}
          className="w-full border border-border text-text-primary py-3 rounded-control font-medium hover:bg-surface-2 transition disabled:opacity-50"
        >
          {institution.is_active ? 'Desactivar institución' : 'Reactivar institución'}
        </button>
      )}

      {institution?.is_active === false && (
        <p className="text-xs text-text-muted text-center">
          Está desactivada — no aparece para cargar movimientos nuevos y no se le pueden agregar cuentas. El historial se conserva. Al reactivar, las cuentas siguen desactivadas hasta que las reactives una por una.
        </p>
      )}
    </form>
  )
}