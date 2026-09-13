'use client'

import { useState, useEffect } from 'react'
import { CreditCard, X, Check, ArrowDownLeft, AlertCircle } from 'lucide-react'
import { createTransferTransaction, fetchExchangeRate } from '@/app/(protected)/transactions/new/actions'
import { formatMoney } from '@/lib/currency'
import type { Account } from '@/lib/types'

interface RegisterCardPaymentModalProps {
  cardAccount: {
    id: string
    name: string
    currency_native: string
  }
  currentBalance: number
  fundingAccounts: (Account & { institutions?: { name: string } })[]
}

export function RegisterCardPaymentModal({
  cardAccount,
  currentBalance,
  fundingAccounts
}: RegisterCardPaymentModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const availableFunding = fundingAccounts.filter((a) => a.id !== cardAccount.id && a.is_active)
  const [sourceAccountId, setSourceAccountId] = useState(availableFunding[0]?.id ?? '')

  // Deuda actual si el saldo es negativo (en tarjetas, balance < 0 significa deuda acumulada)
  const currentDebt = currentBalance < 0 ? Math.abs(currentBalance) : 0
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState(`Pago de tarjeta ${cardAccount.name}`)
  const [rate, setRate] = useState(1)
  const [rateError, setRateError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const selectedSource = availableFunding.find((a) => a.id === sourceAccountId)
  const sourceCurrency = selectedSource?.currency_native ?? cardAccount.currency_native
  const cardCurrency = cardAccount.currency_native

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  // Tipo de cambio si la cuenta pagadora tiene moneda distinta a la tarjeta
  useEffect(() => {
    if (!isOpen) return
    if (sourceCurrency === cardCurrency) {
      setRate(1)
      setRateError(null)
      return
    }
    fetchExchangeRate(sourceCurrency, cardCurrency, date)
      .then((r) => {
        setRate(r)
        setRateError(null)
      })
      .catch(() => setRateError('No pudimos obtener la cotización. Podés ingresar el monto manualmente.'))
  }, [isOpen, sourceCurrency, cardCurrency, date])

  function handleOpen() {
    setAmount(currentDebt > 0 ? currentDebt.toFixed(2) : '')
    setDate(new Date().toISOString().slice(0, 10))
    setNotes(`Pago de tarjeta ${cardAccount.name}`)
    setError(null)
    setSuccess(false)
    setIsOpen(true)
  }

  const amountNum = parseFloat(amount) || 0
  const sourceDebit = sourceCurrency === cardCurrency ? amountNum : (rate > 0 ? amountNum / rate : 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!sourceAccountId) {
      setError('Seleccioná una cuenta de origen para pagar.')
      return
    }
    if (amountNum <= 0) {
      setError('El monto a pagar debe ser mayor a cero.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      await createTransferTransaction({
        fromAccountId: sourceAccountId,
        toAccountId: cardAccount.id,
        amountOriginal: amountNum,
        currencyOriginal: cardCurrency,
        amountFrom: Math.round(sourceDebit * 100) / 100,
        amountTo: amountNum,
        feeAmount: 0,
        exchangeRate: rate,
        rateOverridden: false,
        date,
        notes: notes.trim() || `Pago de tarjeta ${cardAccount.name}`,
        shouldRedirect: false
      })

      setSuccess(true)
      setTimeout(() => {
        setIsOpen(false)
        setSuccess(false)
      }, 700)
    } catch (err: any) {
      setError(err?.message || 'No se pudo registrar el pago. Intentá de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 bg-accent text-[color:var(--on-accent)] text-xs font-medium px-3.5 py-2 rounded-control hover:opacity-90 transition shadow-sm"
      >
        <CreditCard size={14} />
        <span>Registrar pago</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Registrar pago de tarjeta"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={() => !saving && setIsOpen(false)} />

          {/* Modal Content */}
          <div className="relative w-full md:max-w-[450px] bg-surface-1 border-t md:border border-border rounded-t-card md:rounded-card p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div>
                <h2 className="font-display text-base font-semibold text-text-primary flex items-center gap-2">
                  <CreditCard size={17} className="text-accent" />
                  <span>Registrar pago de tarjeta</span>
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  {cardAccount.name} · {cardCurrency}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={saving}
                aria-label="Cerrar"
                className="text-text-muted hover:text-text-primary p-1 rounded-md hover:bg-surface-2 transition"
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="bg-expense/10 border border-expense/30 text-expense text-xs p-3 rounded-control">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-income/10 border border-income/30 text-income text-xs p-3 rounded-control flex items-center gap-2 font-medium">
                <Check size={16} />
                <span>Pago registrado exitosamente</span>
              </div>
            )}

            {/* Estado de Deuda de la Tarjeta */}
            <div className="bg-surface-2/60 border border-border/80 rounded-control p-3 flex justify-between items-center">
              <div>
                <span className="text-xs text-text-secondary font-medium block">Deuda actual a pagar</span>
                <span className="text-[11px] text-text-muted">
                  {currentDebt > 0 ? 'Saldo consumido en el ciclo' : 'Al día / sin saldo deudor'}
                </span>
              </div>
              <span className={`font-mono text-base font-semibold ${currentDebt > 0 ? 'text-expense' : 'text-income'}`}>
                {formatMoney(currentDebt, cardCurrency)}
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Cuenta de origen (de dónde sale el dinero) */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Pagar desde (cuenta origen)
                </label>
                {availableFunding.length === 0 ? (
                  <div className="text-xs text-expense p-2 bg-expense/10 rounded-control flex items-center gap-1.5">
                    <AlertCircle size={14} />
                    <span>No tenés otras cuentas activas disponibles para pagar.</span>
                  </div>
                ) : (
                  <select
                    value={sourceAccountId}
                    onChange={(e) => setSourceAccountId(e.target.value)}
                    className="w-full text-xs"
                    required
                  >
                    {availableFunding.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.institutions?.name} · {a.name} ({a.currency_native})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Monto a pagar */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-medium text-text-secondary">Monto a pagar</label>
                  {currentDebt > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmount(currentDebt.toFixed(2))}
                      className="text-[11px] text-accent hover:underline font-medium"
                    >
                      Pagar total ({formatMoney(currentDebt, cardCurrency)})
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    autoFocus
                    className="w-full font-mono text-base pr-16"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-medium text-text-muted">
                    {cardCurrency}
                  </span>
                </div>
              </div>

              {/* Tasa FX si monedas difieren */}
              {sourceCurrency !== cardCurrency && (
                <div className="bg-surface-0 border border-border/80 rounded-control p-3 text-xs space-y-1.5">
                  <div className="flex justify-between text-text-secondary">
                    <span>Cotización aplicada</span>
                    <span className="font-mono font-medium">
                      1 {sourceCurrency} = {rate.toFixed(4)} {cardCurrency}
                    </span>
                  </div>
                  {amountNum > 0 && (
                    <div className="flex justify-between items-baseline pt-1.5 border-t border-border/60">
                      <span className="text-text-secondary font-medium">
                        Se debitará de tu {selectedSource?.name}
                      </span>
                      <span className="font-mono text-sm font-semibold text-expense">
                        -{formatMoney(sourceDebit, sourceCurrency)}
                      </span>
                    </div>
                  )}
                  {rateError && <p className="text-[11px] text-expense">{rateError}</p>}
                </div>
              )}

              {/* Fecha */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Fecha del pago</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs"
                  required
                />
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Descripción / Comprobante</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={`Pago de tarjeta ${cardAccount.name}`}
                  className="w-full text-xs"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-control text-xs font-medium border border-border text-text-secondary hover:bg-surface-2 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || amountNum <= 0 || availableFunding.length === 0}
                  className="flex-1 py-2.5 rounded-control text-xs font-medium bg-accent text-[color:var(--on-accent)] hover:opacity-90 transition disabled:opacity-50"
                >
                  {saving ? 'Procesando pago...' : 'Registrar pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
