'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, ArrowRightLeft } from 'lucide-react'
import {
  createTransaction,
  createTransferTransaction,
  fetchExchangeRate
} from '@/app/(protected)/transactions/new/actions'
import { rethrowIfRedirect } from '@/lib/next/rethrow-redirect'
import type { Account, Category, Person } from '@/lib/types'

const CURRENCIES = ['AUD', 'EUR', 'USD', 'UYU', 'NZD']
const INSTALLMENT_OPTIONS = [1, 3, 4, 6, 12]

export function TransactionForm({
  accounts,
  categories,
  people,
  defaultDate
}: {
  accounts: (Account & { institutions: { id: string; name: string } })[]
  categories: Category[]
  people: Person[]
  defaultDate: string
}) {
  const [type, setType] = useState<'OUTCOME' | 'INCOME' | 'TRANSFER'>('OUTCOME')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [toAccountId, setToAccountId] = useState(
    accounts.find((a) => a.id !== accounts[0]?.id)?.id ?? accounts[1]?.id ?? ''
  )
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('UYU')
  const [fee, setFee] = useState('0')
  const [rate, setRate] = useState<number>(1)
  const [rateOverridden, setRateOverridden] = useState(false)
  const [date, setDate] = useState(defaultDate)
  const [categoryId, setCategoryId] = useState<string | null>(categories[0]?.id ?? null)
  const [personId, setPersonId] = useState<string | null>(
    people.find((p) => p.name === 'Personal')?.id ?? null
  )
  const [installments, setInstallments] = useState(1)
  const [notes, setNotes] = useState('')
  const [rateError, setRateError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const isTransfer = type === 'TRANSFER'
  const account = accounts.find((a) => a.id === accountId)
  const toAccount = accounts.find((a) => a.id === toAccountId)

  // Para transferencias, la moneda destino es la moneda de la cuenta receptora.
  // Para gastos/ingresos, es la moneda nativa de la cuenta seleccionada.
  const targetCurrency = isTransfer
    ? toAccount?.currency_native ?? currency
    : account?.currency_native ?? currency

  // Al cambiar a transferencia o al cambiar de cuenta origen, sincronizamos la moneda
  useEffect(() => {
    if (account?.currency_native && !isTransfer) {
      setCurrency(account.currency_native)
    }
  }, [accountId, account?.currency_native, isTransfer])

  // Tipo de cambio automático
  useEffect(() => {
    if (rateOverridden) return
    if (currency === targetCurrency) {
      setRate(1)
      setRateError(null)
      return
    }
    fetchExchangeRate(currency, targetCurrency, date)
      .then((r) => {
        setRate(r)
        setRateError(null)
      })
      .catch(() => setRateError('No pudimos obtener el tipo de cambio. Ingresalo a mano.'))
  }, [date, currency, targetCurrency, rateOverridden])

  const amountNum = parseFloat(amount) || 0
  const feeNum = parseFloat(fee) || 0
  const converted = Math.max(0, amountNum - feeNum) * rate

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (amountNum <= 0) return
    setSaving(true)
    try {
      if (isTransfer) {
        if (!toAccountId || accountId === toAccountId) {
          alert('Seleccioná una cuenta de destino diferente a la de origen.')
          setSaving(false)
          return
        }

        await createTransferTransaction({
          fromAccountId: accountId,
          toAccountId,
          amountOriginal: amountNum,
          currencyOriginal: currency,
          feeAmount: feeNum,
          exchangeRate: rate,
          rateOverridden,
          date,
          notes: notes.trim() || null
        })
      } else {
        await createTransaction({
          type,
          amountOriginal: amountNum,
          currencyOriginal: currency,
          feeAmount: feeNum,
          exchangeRate: rate,
          rateOverridden,
          currencyAccount: targetCurrency,
          date,
          institutionId: account?.institution_id ?? '',
          accountId,
          categoryId,
          personId,
          installmentTotal: installments,
          notes: notes.trim() || null
        })
      }
    } catch (err) {
      rethrowIfRedirect(err)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
      {/* Selector de Tipo (Gasto | Ingreso | Transferencia) */}
      <div className="grid grid-cols-3 gap-1 bg-surface-0 rounded-control p-1">
        <button
          type="button"
          onClick={() => setType('OUTCOME')}
          className={`py-2 rounded-md text-xs sm:text-sm font-medium transition ${
            type === 'OUTCOME' ? 'bg-expense text-white shadow-xs' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Gasto
        </button>
        <button
          type="button"
          onClick={() => setType('INCOME')}
          className={`py-2 rounded-md text-xs sm:text-sm font-medium transition ${
            type === 'INCOME' ? 'bg-income text-white shadow-xs' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Ingreso
        </button>
        <button
          type="button"
          onClick={() => {
            setType('TRANSFER')
            if (accountId === toAccountId) {
              const other = accounts.find((a) => a.id !== accountId)
              if (other) setToAccountId(other.id)
            }
          }}
          className={`py-2 rounded-md text-xs sm:text-sm font-medium transition flex items-center justify-center gap-1.5 ${
            type === 'TRANSFER' ? 'bg-accent text-white shadow-xs' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <ArrowRightLeft size={14} />
          <span>Transferencia</span>
        </button>
      </div>

      {/* Cuentas: Origen y Destino */}
      {!isTransfer ? (
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Producto / Cuenta</label>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full text-sm">
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.institutions.name} · {a.name} ({a.currency_native})
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="space-y-2.5 bg-surface-2/40 border border-border/80 rounded-control p-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Cuenta origen (sale dinero)</label>
            <select
              value={accountId}
              onChange={(e) => {
                const nextFrom = e.target.value
                setAccountId(nextFrom)
                if (nextFrom === toAccountId) {
                  const alt = accounts.find((a) => a.id !== nextFrom)
                  if (alt) setToAccountId(alt.id)
                }
              }}
              className="w-full text-sm"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.institutions.name} · {a.name} ({a.currency_native})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-center py-0.5 text-text-muted">
            <ArrowRight size={16} className="rotate-90 sm:rotate-0" />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Cuenta destino (entra dinero)</label>
            <select
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              className="w-full text-sm"
            >
              {accounts
                .filter((a) => a.id !== accountId)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.institutions.name} · {a.name} ({a.currency_native})
                    {a.type === 'credit_card' ? ' · Tarjeta de crédito' : ''}
                  </option>
                ))}
            </select>
          </div>
        </div>
      )}

      {/* Monto y Moneda */}
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">
          {isTransfer ? 'Monto a transferir' : 'Monto original'}
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 font-mono text-base"
            placeholder="0.00"
            required
          />
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-24 text-sm font-mono">
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Comisión / Fee */}
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Fee / comisión (opcional)</label>
        <input
          type="number"
          step="0.01"
          value={fee}
          onChange={(e) => setFee(e.target.value)}
          className="w-full text-sm font-mono"
        />
      </div>

      {/* Tipo de cambio (si monedas difieren) */}
      {(currency !== targetCurrency || rateOverridden) && (
        <div className="flex justify-between items-center bg-surface-0 border border-border/70 rounded-control p-3">
          <div>
            <p className="text-xs text-text-muted font-medium">Tipo de cambio</p>
            <p className="text-sm font-mono mt-0.5">
              1 {currency} = {rate.toFixed(4)} {targetCurrency}
            </p>
            {rateError && <p className="text-xs text-expense mt-1">{rateError}</p>}
          </div>
          <input
            type="number"
            step="0.0001"
            value={rate}
            onChange={(e) => {
              setRate(parseFloat(e.target.value) || 0)
              setRateOverridden(true)
            }}
            className="w-24 text-right font-mono text-sm"
          />
        </div>
      )}

      {/* Previsualización del Monto Final Converted */}
      <div className="flex justify-between items-baseline p-2.5 bg-surface-2/40 rounded-control border border-border/60">
        <span className="text-xs text-text-secondary font-medium">
          {isTransfer ? 'Monto neto a acreditar en destino' : 'Monto final convertido'}
        </span>
        <span className="font-mono text-lg sm:text-xl font-semibold text-text-primary">
          {converted.toFixed(2)} {targetCurrency}
        </span>
      </div>

      {/* Campos de Gasto / Ingreso: Categoría */}
      {!isTransfer && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Fecha</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full text-xs" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Categoría</label>
            <select
              value={categoryId ?? ''}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full text-xs"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Si es transferencia: solo fecha */}
      {isTransfer && (
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Fecha</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full text-xs" />
        </div>
      )}

      {/* Descripción / Notas */}
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Descripción / Notas</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={
            isTransfer
              ? toAccount?.type === 'credit_card'
                ? 'Ej. Pago mensual de tarjeta Visa'
                : 'Ej. Fondeo de cuenta Wise, retiro de efectivo...'
              : 'Ej. Supermercado, cena con Gladys...'
          }
          className="w-full text-xs"
        />
      </div>

      {/* Campos exclusivos de Gasto / Ingreso: Persona y Cuotas */}
      {!isTransfer && (
        <>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Persona asignada</label>
            <div className="flex gap-2 flex-wrap">
              {people.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPersonId(p.id)}
                  className={`text-xs px-3 py-1.5 rounded-full transition ${
                    personId === p.id
                      ? 'bg-accent text-surface-0 font-medium'
                      : 'border border-border text-text-secondary hover:border-text-secondary'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Cuotas</label>
            <select
              value={installments}
              onChange={(e) => setInstallments(parseInt(e.target.value))}
              className="w-full text-xs"
            >
              {INSTALLMENT_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n === 1 ? 'Contado (1 pago)' : `${n} cuotas`}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      <button
        type="submit"
        disabled={saving || amountNum <= 0}
        className="w-full bg-accent text-[color:var(--on-accent)] py-3 rounded-control font-medium hover:opacity-90 transition disabled:opacity-50 text-sm"
      >
        {saving
          ? 'Guardando...'
          : isTransfer
          ? toAccount?.type === 'credit_card'
            ? 'Registrar pago de tarjeta'
            : 'Transferir entre cuentas'
          : 'Guardar transacción'}
      </button>
    </form>
  )
}
