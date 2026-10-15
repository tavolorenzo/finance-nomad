'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  X,
  Check,
  AlertCircle,
  ArrowDownLeft,
  DollarSign,
  TrendingUp,
  Receipt
} from 'lucide-react'
import { fetchExchangeRate } from '@/app/(protected)/transactions/new/actions'
import { registerPersonPaymentAction } from '@/app/(protected)/people/actions'
import { formatMoney } from '@/lib/currency'
import { allocateSettlement } from '@/lib/ledger/settlement'
import { useOptionalLedger } from '@/lib/ledger/ledger-context'
import type { Account, Category, MasterTransaction, Person } from '@/lib/types'

interface RegisterPersonPaymentModalProps {
  person: Person
  pendingTransactions: MasterTransaction[]
  accounts: (Account & { institutions?: { name: string } })[]
  categories?: Category[]
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function RegisterPersonPaymentModal({
  person,
  pendingTransactions,
  accounts,
  categories = [],
  isOpen,
  onClose,
  onSuccess
}: RegisterPersonPaymentModalProps) {
  const router = useRouter()
  const ledger = useOptionalLedger()

  // Monedas disponibles en las deudas pendientes
  const availableCurrencies = useMemo(() => {
    const set = new Set<string>()
    for (const t of pendingTransactions) {
      if (t.currency_account) set.add(t.currency_account)
    }
    return Array.from(set)
  }, [pendingTransactions])

  const defaultCurrency = availableCurrencies[0] ?? 'UYU'
  const [selectedCurrency, setSelectedCurrency] = useState(defaultCurrency)

  // Filtrar deudas de la moneda seleccionada
  const debtsInCurrency = useMemo(() => {
    return pendingTransactions.filter((t) => t.currency_account === selectedCurrency)
  }, [pendingTransactions, selectedCurrency])

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [date, setDate] = useState(today)

  // Cuentas válidas para recibir dinero (no tarjetas de crédito)
  const depositAccounts = useMemo(() => {
    const list = accounts.length > 0 ? accounts : ledger?.accounts ?? []
    return list.filter((a) => a.is_active !== false && a.type !== 'credit_card')
  }, [accounts, ledger?.accounts])

  const [destinationAccountId, setDestinationAccountId] = useState(
    depositAccounts[0]?.id ?? ''
  )

  // Mantener cuenta seleccionada sincronizada si cambia depositAccounts
  useEffect(() => {
    if (!destinationAccountId && depositAccounts.length > 0) {
      setDestinationAccountId(depositAccounts[0].id)
    }
  }, [depositAccounts, destinationAccountId])

  const selectedDestinationAccount = useMemo(() => {
    return depositAccounts.find((a) => a.id === destinationAccountId)
  }, [depositAccounts, destinationAccountId])

  const accountCurrency = selectedDestinationAccount?.currency_native ?? selectedCurrency

  // Deuda actual (<= hoy) y futura (> hoy)
  const baseAllocation = useMemo(() => {
    try {
      return allocateSettlement(debtsInCurrency, 0, today, date)
    } catch {
      return null
    }
  }, [debtsInCurrency, today, date])

  const initialAmount = baseAllocation?.currentDebt && baseAllocation.currentDebt > 0
    ? baseAllocation.currentDebt
    : baseAllocation?.totalDebt ?? 0

  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [rate, setRate] = useState(1)
  const [rateError, setRateError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Inicializar importe y notas al abrir el modal
  useEffect(() => {
    if (isOpen) {
      setAmount(initialAmount > 0 ? initialAmount.toFixed(2) : '')
      setDate(new Date().toISOString().slice(0, 10))
      setNotes(`Cobro a ${person.name}`)
      setError(null)
      setSuccess(false)
    }
  }, [isOpen, initialAmount, person.name])

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  // Tipo de cambio si la moneda del cobro difiere de la cuenta de destino
  useEffect(() => {
    if (!isOpen) return
    if (selectedCurrency === accountCurrency) {
      setRate(1)
      setRateError(null)
      return
    }
    fetchExchangeRate(selectedCurrency, accountCurrency, date)
      .then((r) => {
        setRate(r)
        setRateError(null)
      })
      .catch(() => {
        setRateError('No pudimos obtener la cotización automática. Podés verificar el monto a acreditar.')
      })
  }, [isOpen, selectedCurrency, accountCurrency, date])

  const amountNum = parseFloat(amount) || 0

  // Diagnóstico del cálculo y de los 3 casos
  const allocation = useMemo(() => {
    if (amountNum <= 0) return null
    try {
      return allocateSettlement(debtsInCurrency, amountNum, today, date)
    } catch (err: any) {
      return { error: err.message || 'Importe inválido' }
    }
  }, [debtsInCurrency, amountNum, today, date])

  const isExceeded = Boolean(
    baseAllocation && amountNum > baseAllocation.totalDebt + 0.009
  )

  const creditedAmount = selectedCurrency === accountCurrency
    ? amountNum
    : Math.round(amountNum * rate * 100) / 100

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedDestinationAccount) {
      setError('Seleccioná una cuenta en la que acreditar el pago.')
      return
    }
    if (amountNum <= 0) {
      setError('El monto a cobrar debe ser mayor a cero.')
      return
    }
    if (isExceeded) {
      setError(
        `El importe no puede superar la deuda total pendiente (${formatMoney(baseAllocation?.totalDebt ?? 0, selectedCurrency)}). Si recibiste un excedente o adelanto extraordinario, podés registrarlo desde la sección de Ingresos.`
      )
      return
    }

    setSaving(true)
    setError(null)

    try {
      // 1. Buscar o resolver categoría "Cobros a terceros"
      const categoryList = categories.length > 0 ? categories : ledger?.categories ?? []
      const defaultCategory = categoryList.find(
        (c) => c.name.toLowerCase() === 'cobros a terceros'
      )

      if (ledger) {
        // Enfoque Local-First (0ms)
        await ledger.addPersonSettlement({
          personId: person.id,
          personName: person.name,
          destinationAccount: {
            id: selectedDestinationAccount.id,
            name: selectedDestinationAccount.name,
            currency_native: selectedDestinationAccount.currency_native,
            institution_id: selectedDestinationAccount.institution_id,
            type: selectedDestinationAccount.type
          },
          amountOriginal: amountNum,
          currencyOriginal: selectedCurrency,
          amountAccount: creditedAmount,
          currencyAccount: accountCurrency,
          exchangeRate: rate,
          rateOverridden: false,
          date,
          categoryId: defaultCategory?.id ?? null,
          notes: notes.trim() || `Cobro a ${person.name}`,
          today,
          pendingTransactions: debtsInCurrency
        })
      } else {
        // Fallback Server Action si el ledger aún no está montado
        await registerPersonPaymentAction({
          personId: person.id,
          personName: person.name,
          destinationAccountId: selectedDestinationAccount.id,
          amountOriginal: amountNum,
          currencyOriginal: selectedCurrency,
          exchangeRate: rate,
          date,
          notes: notes.trim() || `Cobro a ${person.name}`
        })
      }

      setSuccess(true)
      setTimeout(() => {
        onClose()
        setSuccess(false)
        onSuccess?.()
        router.refresh()
      }, 700)
    } catch (err: any) {
      setError(err?.message || 'No se pudo registrar el cobro. Intentá de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Registrar cobro a ${person.name}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        onClick={() => !saving && onClose()}
      />

      {/* Modal Content */}
      <div className="relative w-full md:max-w-[480px] bg-surface-1 border-t md:border border-border rounded-t-card md:rounded-card p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-accent/15 text-accent flex items-center justify-center font-semibold text-xs">
              <DollarSign size={16} />
            </span>
            <div>
              <h2 className="font-display text-base font-semibold text-text-primary">
                Registrar cobro
              </h2>
              <p className="text-xs text-text-muted">
                {person.name} · {selectedCurrency}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar"
            className="text-text-muted hover:text-text-primary p-1.5 rounded-control hover:bg-surface-2 transition"
          >
            <X size={17} />
          </button>
        </div>

        {error && (
          <div className="bg-expense/10 border border-expense/30 text-expense text-xs p-3 rounded-control flex items-start gap-2">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-income/10 border border-income/30 text-income text-xs p-3 rounded-control flex items-center gap-2 font-medium">
            <Check size={16} />
            <span>Cobro registrado exitosamente en el ledger</span>
          </div>
        )}

        {/* Resumen de deuda actual vs futura */}
        {baseAllocation && (
          <div className="bg-surface-0 border border-border rounded-control p-3.5 space-y-2">
            <div className="flex justify-between items-baseline">
              <div>
                <span className="text-xs text-text-secondary font-medium block">
                  Saldo actual a cobrar
                </span>
                <span className="text-[11px] text-text-muted">
                  Consumos vencidos y devengados hasta hoy
                </span>
              </div>
              <span className="font-mono text-base font-semibold text-pending">
                {formatMoney(baseAllocation.currentDebt, selectedCurrency)}
              </span>
            </div>

            {baseAllocation.futureDebt > 0 && (
              <div className="pt-2 border-t border-border/60 flex justify-between items-baseline text-xs">
                <span className="text-text-muted">
                  Cuotas comprometidas futuras
                </span>
                <span className="font-mono text-text-secondary">
                  {formatMoney(baseAllocation.futureDebt, selectedCurrency)}
                </span>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selector de divisa si hay varias */}
          {availableCurrencies.length > 1 && (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Moneda de la deuda a cobrar
              </label>
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="w-full text-xs"
              >
                {availableCurrencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Cuenta receptora (de dónde ingresa el dinero) */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Acreditar en (cuenta destino)
            </label>
            {depositAccounts.length === 0 ? (
              <div className="text-xs text-expense p-2.5 bg-expense/10 rounded-control flex items-center gap-1.5">
                <AlertCircle size={14} />
                <span>No tenés cuentas bancarias o de efectivo activas para recibir el pago.</span>
              </div>
            ) : (
              <select
                value={destinationAccountId}
                onChange={(e) => setDestinationAccountId(e.target.value)}
                className="w-full text-xs"
                required
              >
                {depositAccounts.map((a) => {
                  const instName = (a as any).institutions?.name
                  return (
                    <option key={a.id} value={a.id}>
                      {instName ? `${instName} · ` : ''}
                      {a.name} ({a.currency_native})
                    </option>
                  )
                })}
              </select>
            )}
          </div>

          {/* Importe a cobrar */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-medium text-text-secondary">
                Importe a cobrar
              </label>
              <div className="flex gap-2">
                {baseAllocation && baseAllocation.currentDebt > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmount(baseAllocation.currentDebt.toFixed(2))}
                    className="text-[11px] text-accent hover:underline font-medium"
                  >
                    Saldo actual ({formatMoney(baseAllocation.currentDebt, selectedCurrency)})
                  </button>
                )}
                {baseAllocation && baseAllocation.futureDebt > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmount(baseAllocation.totalDebt.toFixed(2))}
                    className="text-[11px] text-text-muted hover:text-text-primary hover:underline"
                  >
                    Total global
                  </button>
                )}
              </div>
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
                {selectedCurrency}
              </span>
            </div>
          </div>

          {/* Diagnóstico en vivo de los 3 casos (Badges & Desglose) */}
          {allocation && !('error' in allocation) && (
            <div className="space-y-2">
              {allocation.caseType === 'A' && (
                <div className="p-3 bg-income/10 border border-income/30 rounded-control flex items-start gap-2.5">
                  <Check size={16} className="text-income flex-shrink-0 mt-0.5" />
                  <div className="text-xs space-y-0.5">
                    <p className="font-semibold text-income">
                      Caso A: Pago total del saldo actual
                    </p>
                    <p className="text-text-secondary">
                      Se cancelan al 100% todos los movimientos vencidos y devengados del mes actual ({allocation.fullySettledIds.length} ítems).
                    </p>
                  </div>
                </div>
              )}

              {allocation.caseType === 'B' && (
                <div className="p-3 bg-pending/10 border border-pending/30 rounded-control flex items-start gap-2.5">
                  <AlertCircle size={16} className="text-pending flex-shrink-0 mt-0.5" />
                  <div className="text-xs space-y-0.5">
                    <p className="font-semibold text-pending">
                      Caso B: Pago parcial del saldo actual
                    </p>
                    <p className="text-text-secondary">
                      Restarán por cobrar{' '}
                      <span className="font-mono font-medium text-pending">
                        {formatMoney(allocation.remainingDebtAfter, selectedCurrency)}
                      </span>
                      . Se imputa por orden cronológico: {allocation.fullySettledIds.length} cancelado(s) y 1 parcial.
                    </p>
                  </div>
                </div>
              )}

              {allocation.caseType === 'C' && (
                <div className="p-3 bg-accent/10 border border-accent/30 rounded-control flex items-start gap-2.5">
                  <ArrowDownLeft size={16} className="text-accent flex-shrink-0 mt-0.5" />
                  <div className="text-xs space-y-0.5">
                    <p className="font-semibold text-accent">
                      Caso C: Pago con adelanto a cuotas futuras
                    </p>
                    <p className="text-text-secondary">
                      Cancela el saldo actual y amortiza{' '}
                      <span className="font-mono font-medium text-accent">
                        {formatMoney(allocation.excessToFuture, selectedCurrency)}
                      </span>{' '}
                      de compromisos diferidos futuros.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {isExceeded && (
            <div className="p-3 bg-expense/10 border border-expense/30 rounded-control flex items-start gap-2 text-xs text-expense">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              <p>
                El importe supera la deuda total acumulada ({formatMoney(baseAllocation?.totalDebt ?? 0, selectedCurrency)}). Si recibiste un adelanto extraordinario o saldo a favor, registralo como un Ingreso estándar.
              </p>
            </div>
          )}

          {/* Conversión FX si monedas difieren */}
          {selectedCurrency !== accountCurrency && (
            <div className="bg-surface-0 border border-border rounded-control p-3 text-xs space-y-2">
              <div className="flex justify-between items-center text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <TrendingUp size={13} className="text-accent" />
                  <span>Cotización aplicada</span>
                </span>
                <span className="font-mono font-medium">
                  1 {selectedCurrency} = {rate.toFixed(4)} {accountCurrency}
                </span>
              </div>
              {amountNum > 0 && (
                <div className="flex justify-between items-baseline pt-2 border-t border-border/60">
                  <span className="text-text-secondary font-medium">
                    Se acreditará en tu {selectedDestinationAccount?.name}
                  </span>
                  <span className="font-mono text-sm font-semibold text-income">
                    +{formatMoney(creditedAmount, accountCurrency)}
                  </span>
                </div>
              )}
              {rateError && <p className="text-[11px] text-expense">{rateError}</p>}
            </div>
          )}

          {/* Fecha */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Fecha del cobro
            </label>
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
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Descripción / Notas
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={`Cobro a ${person.name}`}
              className="w-full text-xs"
            />
          </div>

          {/* Botones de acción */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-2.5 rounded-control text-xs font-medium border border-border text-text-secondary hover:bg-surface-2 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={
                saving ||
                amountNum <= 0 ||
                isExceeded ||
                depositAccounts.length === 0
              }
              className="flex-1 py-2.5 rounded-control text-xs font-medium bg-accent text-[color:var(--on-accent)] hover:opacity-90 transition disabled:opacity-40"
            >
              {saving ? 'Registrando...' : 'Registrar cobro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
