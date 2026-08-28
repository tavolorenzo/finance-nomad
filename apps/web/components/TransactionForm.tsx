'use client'

import { useEffect, useState } from 'react'
import { getRate } from '@/lib/fx'
import { createTransaction } from '@/app/(protected)/transactions/new/actions'
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
  const [type, setType] = useState<'OUTCOME' | 'INCOME'>('OUTCOME')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
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

  const account = accounts.find((a) => a.id === accountId)
  const accountCurrency = account?.currency_native ?? currency

  useEffect(() => {
    if (rateOverridden) return
    getRate(date, currency, accountCurrency)
      .then((r) => {
        setRate(r)
        setRateError(null)
      })
      .catch(() => setRateError('No pudimos obtener el tipo de cambio. Ingresalo a mano.'))
  }, [date, currency, accountCurrency, rateOverridden])

  const amountNum = parseFloat(amount) || 0
  const feeNum = parseFloat(fee) || 0
  const converted = (amountNum - feeNum) * rate

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (amountNum <= 0) return
    setSaving(true)
    await createTransaction({
      type,
      amountOriginal: amountNum,
      currencyOriginal: currency,
      feeAmount: feeNum,
      exchangeRate: rate,
      rateOverridden,
      currencyAccount: accountCurrency,
      date,
      institutionId: account?.institution_id ?? '',
      accountId,
      categoryId,
      personId,
      installmentTotal: installments,
      notes: notes.trim() || null
    })
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-3">
      <div className="grid grid-cols-2 gap-1 bg-surface-0 rounded-control p-1">
        <button type="button" onClick={() => setType('OUTCOME')}
          className={`py-2 rounded-md text-sm font-medium ${type === 'OUTCOME' ? 'bg-expense text-white' : 'text-text-secondary'}`}>
          Gasto
        </button>
        <button type="button" onClick={() => setType('INCOME')}
          className={`py-2 rounded-md text-sm font-medium ${type === 'INCOME' ? 'bg-income text-white' : 'text-text-secondary'}`}>
          Ingreso
        </button>
      </div>

      <label className="block text-xs text-text-muted">Producto</label>
      <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full">
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>{a.institutions.name} · {a.name}</option>
        ))}
      </select>

      <label className="block text-xs text-text-muted">Monto original</label>
      <div className="flex gap-2">
        <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="flex-1" required />
        <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-20">
          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <label className="block text-xs text-text-muted">Fee / comisión (opcional)</label>
      <input type="number" step="0.01" value={fee} onChange={(e) => setFee(e.target.value)} className="w-full" />

      <div className="flex justify-between items-center bg-surface-0 rounded-control p-3">
        <div>
          <p className="text-xs text-text-muted">Tipo de cambio</p>
          <p className="text-sm">1 {currency} = {rate.toFixed(4)} {accountCurrency}</p>
          {rateError && <p className="text-xs text-expense mt-1">{rateError}</p>}
        </div>
        <input
          type="number" step="0.0001" value={rate}
          onChange={(e) => { setRate(parseFloat(e.target.value) || 0); setRateOverridden(true) }}
          className="w-24 text-right"
        />
      </div>

      <div className="flex justify-between items-baseline">
        <span className="text-sm text-text-secondary">Monto final convertido</span>
        <span className="font-mono amount text-xl">{converted.toFixed(2)} {accountCurrency}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-text-muted">Fecha</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full" />
        </div>
        <div>
          <label className="block text-xs text-text-muted">Categoría</label>
          <select value={categoryId ?? ''} onChange={(e) => setCategoryId(e.target.value)} className="w-full">
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <label className="block text-xs text-text-muted">Descripción</label>
      <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
        placeholder="Ej. Supermercado, cena con Gladys..." className="w-full" />

      <label className="block text-xs text-text-muted">Persona</label>
      <div className="flex gap-2 flex-wrap">
        {people.map((p) => (
          <button key={p.id} type="button" onClick={() => setPersonId(p.id)}
            className={`text-xs px-3 py-1.5 rounded-full ${personId === p.id ? 'bg-accent/15 text-accent' : 'border border-border text-text-secondary'}`}>
            {p.name}
          </button>
        ))}
      </div>

      <label className="block text-xs text-text-muted">Cuotas</label>
      <select value={installments} onChange={(e) => setInstallments(parseInt(e.target.value))} className="w-full">
        {INSTALLMENT_OPTIONS.map((n) => (
          <option key={n} value={n}>{n === 1 ? 'Contado (1 pago)' : `${n} cuotas`}</option>
        ))}
      </select>

      <button type="submit" disabled={saving} className="w-full bg-accent text-[color:var(--on-accent)] py-3 rounded-control font-medium disabled:opacity-50">
        {saving ? 'Guardando...' : 'Guardar transacción'}
      </button>
    </form>
  )
}
