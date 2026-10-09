'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CloudOff } from 'lucide-react'
import { useModal } from '@/components/Modal'
import { createPerson, updatePerson, setPersonActive } from '@/app/(protected)/people/actions'
import { useOptionalLedger } from '@/lib/ledger/ledger-context'
import { useOnlineStatus } from '@/lib/hooks/use-online-status'
import type { Person } from '@/lib/types'

export function PersonForm({
  person,
  hasPendingBalance = false
}: {
  person?: Person
  hasPendingBalance?: boolean
}) {
  const router = useRouter()
  const { isModal, close } = useModal()
  const ledger = useOptionalLedger()
  const isOnline = useOnlineStatus()
  const [name, setName] = useState(person?.name ?? '')
  const [phone, setPhone] = useState(person?.phone ?? '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isPersonal = person?.name === 'Personal'
  const isDeactivated = person?.is_active === false

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!isOnline) {
      setError('No tenés conexión a internet. Conectate para continuar.')
      return
    }

    setLoading(true)
    try {
      if (person) {
        await updatePerson(person.id, name, phone)
      } else {
        await createPerson(name, phone)
      }
      await ledger?.refresh().catch(() => {})
      if (isModal) {
        close()
      } else {
        router.push(person ? `/people/${person.id}` : '/people')
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar. Intentá de nuevo.')
      setLoading(false)
    }
  }

  async function handleToggleActive() {
    if (!person) return
    if (!isOnline) {
      setError('No tenés conexión a internet. Conectate para continuar.')
      return
    }

    setError(null)
    setLoading(true)
    try {
      await setPersonActive(person.id, isDeactivated)
      await ledger?.refresh().catch(() => {})
      if (isModal) {
        close()
      } else {
        router.push(`/people/${person.id}`)
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo modificar el estado. Intentá de nuevo.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      {!isOnline && (
        <div className="bg-surface-2 border border-border rounded-control p-3 text-xs text-text-secondary flex items-start gap-2.5">
          <CloudOff size={16} className="text-text-muted shrink-0 mt-0.5" />
          <p>
            Estás sin conexión. Para {person ? 'modificar' : 'crear'} una persona necesitás internet. Los movimientos contables ya registrados se siguen guardando offline normalmente.
          </p>
        </div>
      )}

      <div>
        <label htmlFor="person-name" className="block text-sm font-medium text-text-secondary mb-1">
          Nombre
        </label>
        <input
          id="person-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Gladys, Diego, Ale..."
          className="w-full"
          required
          autoFocus
          disabled={isPersonal}
        />
        {isPersonal && (
          <p className="text-xs text-text-muted mt-1">El nombre del contacto Personal no se puede modificar.</p>
        )}
      </div>

      <div>
        <label htmlFor="person-phone" className="block text-sm font-medium text-text-secondary mb-1">
          Número de teléfono (WhatsApp)
        </label>
        <input
          id="person-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Ej. +54 9 11 1234-5678"
          className="w-full"
        />
        <p className="text-xs text-text-muted mt-1">
          Incluí el código de país para poder enviar recordatorios de cobro directamente a su WhatsApp.
        </p>
      </div>

      {error && <p className="text-sm text-expense font-medium">{error}</p>}

      <button
        type="submit"
        disabled={loading || !isOnline}
        className="w-full bg-accent text-[color:var(--on-accent)] py-3 rounded-control font-medium hover:opacity-90 transition disabled:opacity-50"
      >
        {!isOnline ? 'Sin conexión a internet' : loading ? 'Guardando...' : person ? 'Guardar cambios' : 'Crear persona'}
      </button>

      {person && !isPersonal && (
        <div className="pt-2 border-t border-border space-y-2">
          <button
            type="button"
            onClick={handleToggleActive}
            disabled={loading || !isOnline || (!isDeactivated && hasPendingBalance)}
            className="w-full border border-border text-text-primary py-2.5 rounded-control text-sm font-medium hover:bg-surface-2 transition disabled:opacity-40"
          >
            {isDeactivated ? 'Reactivar persona' : 'Desactivar persona'}
          </button>

          {!isDeactivated && hasPendingBalance && (
            <p className="text-xs text-text-muted text-center">
              Solo podés desactivar a una persona si su saldo por cobrar está en 0.
            </p>
          )}

          {isDeactivated && (
            <p className="text-xs text-text-muted text-center">
              Está desactivada — no aparece para asignar nuevos gastos. El historial de movimientos se conserva intacto.
            </p>
          )}
        </div>
      )}
    </form>
  )
}
