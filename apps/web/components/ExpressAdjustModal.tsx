'use client'

import { useState, useEffect } from 'react'
import { SlidersHorizontal, X, ArrowUpRight, ArrowDownLeft, Check } from 'lucide-react'
import { createBalanceAdjustment } from '@/app/(protected)/accounts/actions'
import { formatMoney } from '@/lib/currency'

interface ExpressAdjustModalProps {
  account: {
    id: string
    name: string
    currency_native: string
  }
  currentBalance: number
}

export function ExpressAdjustModal({ account, currentBalance }: ExpressAdjustModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [targetBalance, setTargetBalance] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('Ajuste express de saldo')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  const targetNum = parseFloat(targetBalance)
  const isValidTarget = !isNaN(targetNum)
  const delta = isValidTarget ? Math.round((targetNum - currentBalance) * 100) / 100 : 0
  const isZeroDelta = isValidTarget && delta === 0

  function handleOpen() {
    setTargetBalance('')
    setDate(new Date().toISOString().slice(0, 10))
    setNotes('Ajuste express de saldo')
    setError(null)
    setSuccess(false)
    setIsOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValidTarget) {
      setError('Ingresá un monto válido.')
      return
    }
    if (delta === 0) {
      setError('El saldo real ingresado es igual al saldo actual en el sistema.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      await createBalanceAdjustment({
        accountId: account.id,
        targetBalance: targetNum,
        date,
        notes
      })
      setSuccess(true)
      setTimeout(() => {
        setIsOpen(false)
        setSuccess(false)
      }, 700)
    } catch (err: any) {
      setError(err?.message || 'No se pudo guardar el ajuste. Intentá de nuevo.')
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
        <SlidersHorizontal size={14} />
        <span>Ajuste express</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Ajuste express de saldo"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={() => !saving && setIsOpen(false)} />

          {/* Modal Container */}
          <div className="relative w-full md:max-w-[440px] bg-surface-1 border-t md:border border-border rounded-t-card md:rounded-card p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div>
                <h2 className="font-display text-base font-semibold text-text-primary">Ajuste express de saldo</h2>
                <p className="text-xs text-text-muted mt-0.5">{account.name} · {account.currency_native}</p>
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
                <span>Ajuste creado exitosamente</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Saldo actual */}
              <div className="bg-surface-2/60 border border-border/80 rounded-control p-3 flex justify-between items-center">
                <span className="text-xs text-text-secondary font-medium">Saldo actual en sistema</span>
                <span className="font-mono text-sm font-semibold text-text-primary">
                  {formatMoney(currentBalance, account.currency_native)}
                </span>
              </div>

              {/* Saldo real en banco */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Saldo real en el banco / extracto
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={targetBalance}
                    onChange={(e) => setTargetBalance(e.target.value)}
                    required
                    autoFocus
                    className="w-full font-mono text-base pr-16"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-medium text-text-muted">
                    {account.currency_native}
                  </span>
                </div>
                <p className="text-[11px] text-text-muted mt-1">
                  Ingresá el saldo exacto que ves en tu app bancaria.
                </p>
              </div>

              {/* Diferencia calculada */}
              {isValidTarget && (
                <div className="bg-surface-0 border border-border/80 rounded-control p-3 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-text-secondary font-medium">Diferencia calculada</span>
                    {isZeroDelta ? (
                      <span className="text-text-muted">Sin variación</span>
                    ) : delta > 0 ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-income font-mono">
                        <ArrowDownLeft size={14} /> +{formatMoney(delta, account.currency_native)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold text-expense font-mono">
                        <ArrowUpRight size={14} /> -{formatMoney(Math.abs(delta), account.currency_native)}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-text-muted">
                    {isZeroDelta
                      ? 'Los saldos ya coinciden, no es necesario registrar un ajuste.'
                      : delta > 0
                      ? 'Se registrará un ajuste positivo para incrementar el saldo.'
                      : 'Se registrará un ajuste negativo para reducir el saldo.'}
                  </p>
                </div>
              )}

              {/* Fecha */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Fecha del ajuste</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs"
                />
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Motivo / Descripción</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej. Ajuste de fin de mes, propinas..."
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
                  disabled={saving || !isValidTarget || isZeroDelta}
                  className="flex-1 py-2.5 rounded-control text-xs font-medium bg-accent text-[color:var(--on-accent)] hover:opacity-90 transition disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar ajuste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
