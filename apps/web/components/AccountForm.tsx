'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CloudOff } from 'lucide-react'
import { useModal } from '@/components/Modal'
import { createAccount, updateAccount, setAccountActive } from '@/app/(protected)/accounts/actions'
import { useOptionalLedger } from '@/lib/ledger/ledger-context'
import { useOnlineStatus } from '@/lib/hooks/use-online-status'
import type { Account, AccountType, Institution } from '@/lib/types'

const TYPES: { value: AccountType; label: string }[] = [
  { value: 'checking', label: 'Cuenta corriente' },
  { value: 'savings', label: 'Caja de ahorro' },
  { value: 'investing', label: 'Inversión' },
  { value: 'credit_card', label: 'Tarjeta de crédito' },
  { value: 'cash', label: 'Efectivo' }
]
const BASE_CURRENCIES = ['AUD', 'EUR', 'USD', 'UYU', 'NZD', 'ARS']

export function AccountForm({
  institutions,
  account,
  defaultInstitutionId
}: {
  institutions: Institution[]
  account?: Account
  defaultInstitutionId?: string
}) {
  const router = useRouter()
  const { isModal, close } = useModal()
  const ledger = useOptionalLedger()
  const isOnline = useOnlineStatus()

  const activeCurrsFromSettings = (ledger?.settings?.active_currencies || []).map((c) => c.code)
  const availableCurrencies = Array.from(
    new Set([
      ...activeCurrsFromSettings,
      account?.currency_native,
      ledger?.settings?.display_currency,
      ...BASE_CURRENCIES
    ])
  ).filter(Boolean) as string[]

  const [institutionId, setInstitutionId] = useState(
    account?.institution_id
    ?? (institutions.some((i) => i.id === defaultInstitutionId) ? defaultInstitutionId : undefined)
    ?? institutions[0]?.id
    ?? ''
  )
  const [name, setName] = useState(account?.name ?? '')
  const [type, setType] = useState<AccountType>(account?.type ?? 'checking')
  const [currency, setCurrency] = useState(
    account?.currency_native ?? ledger?.settings?.display_currency ?? 'EUR'
  )
  const [creditLimit, setCreditLimit] = useState(account?.credit_limit?.toString() ?? '')
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
    if (!account) return
    if (!isOnline) {
      setError('No tenés conexión a internet. Conectate para continuar.')
      return
    }

    setLoading(true)
    try {
      await setAccountActive(account.id, !account.is_active)
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
            Estás sin conexión. Para {account ? 'modificar' : 'crear'} una cuenta necesitás internet. Los movimientos contables ya registrados se siguen guardando offline normalmente.
          </p>
        </div>
      )}

      {!account && (
        <div>
          <label htmlFor="account-institution" className="block text-sm font-medium text-text-secondary mb-1">
            Institución
          </label>
          <select
            id="account-institution"
            value={institutionId}
            onChange={(e) => setInstitutionId(e.target.value)}
            className="w-full"
            required
          >
            {institutions.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="account-name" className="block text-sm font-medium text-text-secondary mb-1">
          Nombre de la cuenta / producto
        </label>
        <input
          id="account-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Cuenta Corriente, Visa Gold, Efectivo..."
          className="w-full"
          required
          autoFocus
        />
      </div>

      <div>
        <label htmlFor="account-type" className="block text-sm font-medium text-text-secondary mb-1">
          Tipo de cuenta
        </label>
        <select
          id="account-type"
          value={type}
          onChange={(e) => setType(e.target.value as AccountType)}
          className="w-full"
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="account-currency" className="block text-sm font-medium text-text-secondary mb-1">
          Moneda nativa
        </label>
        <select
          id="account-currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="w-full"
        >
          {availableCurrencies.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {type === 'credit_card' && (
        <div>
          <label htmlFor="account-credit-limit" className="block text-sm font-medium text-text-secondary mb-1">
            Límite de crédito
          </label>
          <input
            id="account-credit-limit"
            type="number"
            step="0.01"
            value={creditLimit}
            onChange={(e) => setCreditLimit(e.target.value)}
            className="w-full"
          />
        </div>
      )}

      {error && <p className="text-sm text-expense font-medium">{error}</p>}

      <button
        type="submit"
        disabled={loading || !isOnline}
        className="w-full bg-accent text-[color:var(--on-accent)] py-3 rounded-control font-medium hover:opacity-90 transition disabled:opacity-50"
      >
        {!isOnline ? 'Sin conexión a internet' : loading ? 'Guardando...' : account ? 'Guardar cambios' : 'Crear cuenta'}
      </button>

      {account && (
        <button
          type="button"
          onClick={handleToggleActive}
          disabled={loading || !isOnline}
          className="w-full border border-border text-text-primary py-3 rounded-control font-medium hover:bg-surface-2 transition disabled:opacity-50"
        >
          {account.is_active ? 'Desactivar cuenta' : 'Reactivar cuenta'}
        </button>
      )}

      {account?.is_active === false && (
        <p className="text-xs text-text-muted text-center">
          Está desactivada — no aparece como opción para cargar movimientos nuevos, pero su historial se conserva.
        </p>
      )}
    </form>
  )
}