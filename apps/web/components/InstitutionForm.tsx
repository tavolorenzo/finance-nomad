'use client'

import { useState } from 'react'
import { createInstitution, updateInstitution, setInstitutionActive } from '@/app/(protected)/institutions/actions'
import type { Institution } from '@/lib/types'

export function InstitutionForm({ institution }: { institution?: Institution }) {
  const [name, setName] = useState(institution?.name ?? '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (institution) {
        await updateInstitution(institution.id, name)
      } else {
        await createInstitution(name)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar. Intentá de nuevo.')
      setLoading(false)
    }
  }

  async function handleToggleActive() {
    if (!institution) return
    setLoading(true)
    try {
      await setInstitutionActive(institution.id, !institution.is_active)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo desactivar. Intentá de nuevo.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-3">
      <label className="block text-xs text-text-muted">Nombre de la institución</label>
      <input
        type="text" value={name} onChange={(e) => setName(e.target.value)}
        placeholder="Ej. Commbank, Wise, Itaú..." className="w-full" required autoFocus
      />

      {error && <p className="text-sm text-expense">{error}</p>}

      <button type="submit" disabled={loading}
        className="w-full bg-accent text-[color:var(--on-accent)] py-3 rounded-control font-medium disabled:opacity-50">
        {loading ? 'Guardando...' : institution ? 'Guardar cambios' : 'Crear institución'}
      </button>

      {institution && (
        <button type="button" onClick={handleToggleActive} disabled={loading}
          className="w-full border border-border text-text-primary py-3 rounded-control font-medium disabled:opacity-50">
          {institution.is_active ? 'Desactivar institución' : 'Reactivar institución'}
        </button>
      )}

      {institution?.is_active === false && (
        <p className="text-xs text-text-muted">
          Está desactivada — no aparece para cargar movimientos nuevos y no se le pueden agregar cuentas. El historial se conserva. Al reactivar, las cuentas siguen desactivadas hasta que las reactives una por una.
        </p>
      )}
    </form>
  )
}
