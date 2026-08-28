'use client'

import { useState } from 'react'
import { createAccount, updateAccount, setAccountActive } from '@/app/(protected)/accounts/actions'
import type { Account, AccountType, Institution } from '@/lib/types'

const TYPES: { value: AccountType; label: string }[] = [
  { value: 'checking', label: 'Cuenta corriente' },
  { value: 'savings', label: 'Caja de ahorro' },
  { value: 'investing', label: 'Inversión' },
  { value: 'credit_card', label: 'Tarjeta de crédito' },
  { value: 'cash', label: 'Efectivo' }
]
const CURRENCIES = ['AUD', 'EUR', 'USD', 'UYU', 'NZD']

export function AccountForm({
  institutions,
  account,
  defaultInstitutionId
}: {
  institutions: Institution[]
  account?: Account
  defaultInstitutionId?: string
}) {
  const [institutionId, setInstitutionId] = useState(
    account?.institution_id
      ?? (institutions.some((i) => i.id === defaultInstitutionId) ? defaultInstitutionId : undefined)
      ?? institutions[0]?.id
      ?? ''
  )
  const [name, setName] = useState(account?.name ?? '')
  const [type, setType] = useState<AccountType>(account?.type ?? 'checking')
  const [currency, setCurrency] = useState(account?.currency_native ?? 'AUD')
  const [creditLimit, setCreditLimit] = useState(account?.credit_limit?.toString() ?? '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const input = {
        name,
        type,
        currencyNative: currency,
        creditLimit: creditLimit ? parseFloat(creditLimit) : null
      }
      if (account) {
        await updateAccount(account.id, input)
      } else {
        await createAccount({ ...input, institutionId })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar. Intentá de nuevo.')
      setLoading(false)
    }
  }

  async function handleToggleActive() {
    if (!account) return
    setLoading(true)
    try {
      await setAccountActive(account.id, !account.is_active)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo desactivar. Intentá de nuevo.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-3">
      {!account && (
        <>
          <label className="block text-xs text-text-muted">Institución</label>
          <select value={institutionId} onChange={(e) => setInstitutionId(e.target.value)} className="w-full" required>
            {institutions.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        </>
      )}

      <label className="block text-xs text-text-muted">Nombre del producto</label>
      <input
        type="text" value={name} onChange={(e) => setName(e.target.value)}
        placeholder="Ej. Everyday, Amex, Cash..." className="w-full" required autoFocus
      />

      <label className="block text-xs text-text-muted">Tipo</label>
      <select value={type} onChange={(e) => setType(e.target.value as AccountType)} className="w-full">
        {TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      <label className="block text-xs text-text-muted">Moneda nativa</label>
      <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full">
        {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>

      {type === 'credit_card' && (
        <>
          <label className="block text-xs text-text-muted">Límite de crédito</label>
          <input
            type="number" step="0.01" value={creditLimit}
            onChange={(e) => setCreditLimit(e.target.value)} className="w-full"
          />
        </>
      )}

      {error && <p className="text-sm text-expense">{error}</p>}

      <button type="submit" disabled={loading}
        className="w-full bg-accent text-[color:var(--on-accent)] py-3 rounded-control font-medium disabled:opacity-50">
        {loading ? 'Guardando...' : account ? 'Guardar cambios' : 'Crear cuenta'}
      </button>

      {account && (
        <button type="button" onClick={handleToggleActive} disabled={loading}
          className="w-full border border-border text-text-primary py-3 rounded-control font-medium disabled:opacity-50">
          {account.is_active ? 'Desactivar cuenta' : 'Reactivar cuenta'}
        </button>
      )}

      {account?.is_active === false && (
        <p className="text-xs text-text-muted">
          Está desactivada — no aparece como opción para cargar movimientos nuevos, pero su historial se conserva.
        </p>
      )}
    </form>
  )
}
