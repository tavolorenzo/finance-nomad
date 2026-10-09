'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useModal } from '@/components/Modal'
import { createPerson, updatePerson, setPersonActive } from '@/app/(protected)/people/actions'
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
  const [name, setName] = useState(person?.name ?? '')
  const [phone, setPhone] = useState(person?.phone ?? '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isPersonal = person?.name === 'Personal'
  const isDeactivated = person?.is_active === false

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (person) {
        await updatePerson(person.id, name, phone)
      } else {
        await createPerson(name, phone)
      }
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
    setError(null)
    setLoading(true)
    try {
      await setPersonActive(person.id, isDeactivated)
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
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Nombre</label>
        <input
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
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Número de teléfono (WhatsApp)
        </label>
        <input
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
        disabled={loading}
        className="w-full bg-accent text-[color:var(--on-accent)] py-3 rounded-control font-medium hover:opacity-90 transition disabled:opacity-50"
      >
        {loading ? 'Guardando...' : person ? 'Guardar cambios' : 'Crear persona'}
      </button>

      {person && !isPersonal && (
        <div className="pt-2 border-t border-border space-y-2">
          <button
            type="button"
            onClick={handleToggleActive}
            disabled={loading || (!isDeactivated && hasPendingBalance)}
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
