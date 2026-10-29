'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CloudOff, AlertTriangle, AlertCircle } from 'lucide-react'
import { useModal } from '@/components/Modal'
import { createPerson, updatePerson, setPersonActive } from '@/app/(protected)/people/actions'
import { useOptionalLedger } from '@/lib/ledger/ledger-context'
import { useOnlineStatus } from '@/lib/hooks/use-online-status'
import type { Person } from '@/lib/types'

export function PersonForm({
  person,
  hasPendingBalance = false,
  existingPeople
}: {
  person?: Person
  hasPendingBalance?: boolean
  existingPeople?: Person[]
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

  const peopleList = existingPeople ?? ledger?.people ?? []
  const trimmedName = name.trim()
  const isReservedWord = trimmedName.toLowerCase() === 'personal'
  const duplicatePerson =
    trimmedName.length > 0 && !isReservedWord
      ? peopleList.find(
          (p) =>
            p.id !== person?.id &&
            p.name.trim().toLowerCase() === trimmedName.toLowerCase()
        )
      : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!isOnline) {
      setError('No tenés conexión a internet. Conectate para continuar.')
      return
    }

    if (!isPersonal && isReservedWord) {
      setError('"Personal" es una palabra reservada del sistema para tus consumos propios. Elegí otro nombre.')
      return
    }

    if (duplicatePerson) {
      setError('Ya existe una persona con ese nombre. Agregá una inicial para que puedas distinguirla.')
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
          onChange={(e) => {
            setName(e.target.value)
            if (error) setError(null)
          }}
          placeholder="Ej. Gladys, Diego, Ale..."
          className="w-full"
          required
          autoFocus
          disabled={isPersonal}
        />
        {isPersonal && (
          <p className="text-xs text-text-muted mt-1">El nombre del contacto Personal no se puede modificar.</p>
        )}

        {!isPersonal && isReservedWord && (
          <div className="mt-2 flex items-start gap-2 p-2.5 rounded-control bg-surface-2 border border-expense/40 text-xs text-expense">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">&quot;Personal&quot; es una palabra reservada del sistema.</span>
              <span className="text-text-muted mt-0.5 block">
                Este nombre está reservado para tus consumos propios por defecto. Elegí otro nombre para este contacto.
              </span>
            </div>
          </div>
        )}

        {!isPersonal && duplicatePerson && (
          <div className="mt-2 flex items-start gap-2 p-2.5 rounded-control bg-surface-2 border border-border text-xs text-text-secondary">
            <AlertTriangle size={15} className="text-pending shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-text-primary block">
                Ya existe una persona con ese nombre{duplicatePerson.is_active === false ? ' (desactivada)' : ''}.
              </span>
              <span className="text-text-muted mt-0.5 block">
                Agregá una inicial para que puedas distinguirla en tus gastos y cuentas por cobrar.
              </span>
            </div>
          </div>
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
        disabled={loading || !isOnline || (!isPersonal && isReservedWord) || Boolean(duplicatePerson)}
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
