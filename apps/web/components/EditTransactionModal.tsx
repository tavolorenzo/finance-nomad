'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, Tag, WifiOff, Layers } from 'lucide-react'
import { formatMoney } from '@/lib/currency'
import * as ledgerContextModule from '@/lib/ledger/ledger-context'
import { useOnlineStatus } from '@/lib/hooks/use-online-status'
import { CategoryModal } from '@/components/CategoryModal'
import { updateTransaction as updateTransactionAction } from '@/app/(protected)/transactions/new/actions'
import type { Category, MasterTransaction, Person } from '@/lib/types'
import type { UpdateTransactionInput } from '@/lib/ledger/types'

export interface EditTransactionModalProps {
  transaction: MasterTransaction | null
  onClose: () => void
  categories?: Category[]
  people?: Person[]
  onSaved?: (input: UpdateTransactionInput) => void
}

const TYPE_LABELS: Record<MasterTransaction['type'], string> = {
  OUTCOME: 'Gasto',
  INCOME: 'Ingreso',
  TRANSFER: 'Transferencia',
  ADJUSTMENT: 'Ajuste'
}

export function EditTransactionModal({
  transaction,
  onClose,
  categories: propCategories,
  people: propPeople,
  onSaved
}: EditTransactionModalProps) {
  const ledger =
    typeof ledgerContextModule.useOptionalLedger === 'function'
      ? ledgerContextModule.useOptionalLedger()
      : null
  const isOnline = useOnlineStatus()

  const baseCategories = useMemo(
    () => propCategories ?? ledger?.categories ?? [],
    [propCategories, ledger?.categories]
  )
  const basePeople = useMemo(
    () => propPeople ?? ledger?.people ?? [],
    [propPeople, ledger?.people]
  )

  const [extraCategories, setExtraCategories] = useState<Category[]>([])
  const allCategories = useMemo(() => {
    const map = new Map<string, Category>()
    for (const c of baseCategories) {
      if (c.is_active !== false) map.set(c.id, c)
    }
    for (const c of extraCategories) {
      map.set(c.id, c)
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [baseCategories, extraCategories])

  const activePeople = useMemo(
    () => basePeople.filter((p) => p.is_active !== false),
    [basePeople]
  )

  const [notes, setNotes] = useState('')
  const [date, setDate] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [personId, setPersonId] = useState<string>('')
  const [amountOriginal, setAmountOriginal] = useState<string>('')
  const [amountAccount, setAmountAccount] = useState<string>('')
  const [propagateToInstallments, setPropagateToInstallments] = useState(true)
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!transaction) return
    setNotes(transaction.notes ?? '')
    setDate(transaction.date)
    setCategoryId(transaction.category_id ?? '')
    setPersonId(transaction.person_id ?? '')
    setAmountOriginal(String(Math.abs(Number(transaction.amount_original ?? transaction.amount_account) || 0)))
    setAmountAccount(String(Math.abs(Number(transaction.amount_account) || 0)))
    setPropagateToInstallments(true)
    setError(null)
  }, [transaction])

  if (!transaction) return null

  const supportsCategory = transaction.type === 'OUTCOME' || transaction.type === 'INCOME'
  const supportsPerson = transaction.type === 'OUTCOME' && !transaction.settled_at
  const isInstallmentPlan = (transaction.installment_total ?? 1) > 1
  const canEditAmount = transaction.type !== 'TRANSFER' && !isInstallmentPlan
  const isMultiCurrency =
    transaction.currency_original &&
    transaction.currency_account &&
    transaction.currency_original !== transaction.currency_account

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!transaction) return

    if (!isOnline) {
      setError('Se requiere conexión a internet para guardar cambios en el movimiento.')
      return
    }

    const parsedOrig = Number(amountOriginal)
    const parsedAcc = isMultiCurrency ? Number(amountAccount) : parsedOrig

    if (canEditAmount && (isNaN(parsedOrig) || parsedOrig <= 0 || isNaN(parsedAcc) || parsedAcc <= 0)) {
      setError('Ingresá un monto mayor a cero.')
      return
    }

    setSaving(true)
    setError(null)

    const payload: UpdateTransactionInput = {
      transactionId: transaction.id,
      notes: notes.trim() || null,
      date,
      ...(supportsCategory ? { categoryId: categoryId || null } : {}),
      ...(supportsPerson ? { personId: personId || null } : {}),
      ...(canEditAmount
        ? {
            amountOriginal: parsedOrig,
            currencyOriginal: transaction.currency_original,
            amountAccount: parsedAcc
          }
        : {}),
      ...(isInstallmentPlan ? { propagateToInstallments } : {})
    }

    try {
      if (ledger) {
        await ledger.updateTransaction(payload)
      } else {
        await updateTransactionAction(payload)
      }
      onSaved?.(payload)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el movimiento.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-transaction-title"
      >
        <div className="bg-surface-1 border border-border rounded-card max-w-md w-full p-5 space-y-4 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  id="edit-transaction-title"
                  className="font-display text-base font-bold text-text-primary"
                >
                  {supportsCategory && !transaction.category_id
                    ? 'Asignar categoría y editar'
                    : 'Editar movimiento'}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-2 text-text-secondary font-medium">
                  {TYPE_LABELS[transaction.type]}
                </span>
                {isInstallmentPlan && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-pending/15 text-pending font-medium">
                    Cuota {transaction.installment_current} de {transaction.installment_total}
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Actualizá la categoría, descripción o datos del registro
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar modal"
              className="text-text-muted hover:text-text-primary transition p-1"
            >
              <X size={18} />
            </button>
          </div>

          {!isOnline && (
            <div className="flex items-center gap-2 p-2.5 rounded-control bg-pending/10 border border-pending/30 text-xs text-pending">
              <WifiOff size={14} className="shrink-0" />
              <span>Estás sin conexión. Conectate para guardar cambios sobre movimientos.</span>
            </div>
          )}

          {error && (
            <div className="p-2.5 rounded-control bg-expense/10 border border-expense/30 text-xs text-expense">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {supportsCategory && (
              <div>
                <label
                  htmlFor="edit-tx-category"
                  className="block text-xs font-medium text-text-secondary mb-1"
                >
                  Categoría
                </label>
                <div className="relative">
                  <select
                    id="edit-tx-category"
                    value={categoryId}
                    onChange={(e) => {
                      if (e.target.value === '__CREATE_CATEGORY__') {
                        setIsCreatingCategory(true)
                        return
                      }
                      setCategoryId(e.target.value)
                    }}
                    className="w-full text-sm"
                  >
                    <option value="">Sin categoría</option>
                    {allCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                    <option value="__CREATE_CATEGORY__">+ Crear categoría...</option>
                  </select>
                </div>
                {!categoryId && (
                  <p className="text-[11px] text-pending mt-1 flex items-center gap-1">
                    <Tag size={11} />
                    <span>Este movimiento aún no tiene categoría asignada.</span>
                  </p>
                )}
              </div>
            )}

            <div>
              <label
                htmlFor="edit-tx-notes"
                className="block text-xs font-medium text-text-secondary mb-1"
              >
                Descripción / Nota
              </label>
              <input
                id="edit-tx-notes"
                type="text"
                placeholder="Ej. Supermercado, Cena, Sueldo..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="edit-tx-date"
                  className="block text-xs font-medium text-text-secondary mb-1"
                >
                  Fecha
                </label>
                <input
                  id="edit-tx-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs"
                  required
                />
              </div>

              {supportsPerson && (
                <div>
                  <label
                    htmlFor="edit-tx-person"
                    className="block text-xs font-medium text-text-secondary mb-1"
                  >
                    Persona asignada
                  </label>
                  <select
                    id="edit-tx-person"
                    value={personId}
                    onChange={(e) => setPersonId(e.target.value)}
                    className="w-full text-xs"
                  >
                    <option value="">Personal</option>
                    {activePeople.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {canEditAmount ? (
              <div className={isMultiCurrency ? 'grid grid-cols-2 gap-3' : ''}>
                <div>
                  <label
                    htmlFor="edit-tx-amount-original"
                    className="block text-xs font-medium text-text-secondary mb-1"
                  >
                    Monto ({transaction.currency_original})
                  </label>
                  <input
                    id="edit-tx-amount-original"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amountOriginal}
                    onChange={(e) => setAmountOriginal(e.target.value)}
                    className="w-full font-mono tabular-nums amount text-sm"
                    required
                  />
                </div>
                {isMultiCurrency && (
                  <div>
                    <label
                      htmlFor="edit-tx-amount-account"
                      className="block text-xs font-medium text-text-secondary mb-1"
                    >
                      En cuenta ({transaction.currency_account})
                    </label>
                    <input
                      id="edit-tx-amount-account"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={amountAccount}
                      onChange={(e) => setAmountAccount(e.target.value)}
                      className="w-full font-mono tabular-nums amount text-sm"
                      required
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="p-2.5 rounded-control bg-surface-2/60 border border-border-subtle flex items-center justify-between text-xs">
                <span className="text-text-muted">Importe registrado</span>
                <span className="font-mono tabular-nums amount font-semibold text-text-primary">
                  {formatMoney(Math.abs(transaction.amount_account), transaction.currency_account)}
                </span>
              </div>
            )}

            {isInstallmentPlan && (
              <label className="flex items-start gap-2.5 p-2.5 rounded-control bg-surface-2/50 border border-border-subtle cursor-pointer">
                <input
                  type="checkbox"
                  checked={propagateToInstallments}
                  onChange={(e) => setPropagateToInstallments(e.target.checked)}
                  className="mt-0.5 accent-[color:var(--accent)]"
                />
                <span className="text-xs text-text-secondary leading-snug">
                  <span className="font-medium text-text-primary inline-flex items-center gap-1">
                    <Layers size={12} className="text-accent" />
                    Aplicar a todas las cuotas del plan
                  </span>
                  <span className="block text-[11px] text-text-muted mt-0.5">
                    Actualiza la categoría, nota y persona en las {transaction.installment_total}{' '}
                    cuotas de esta compra.
                  </span>
                </span>
              </label>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-control text-xs font-medium border border-border text-text-secondary hover:text-text-primary transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || !isOnline}
                className="px-4 py-2 rounded-control text-xs font-semibold bg-accent text-[color:var(--on-accent)] hover:opacity-90 transition disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <CategoryModal
        isOpen={isCreatingCategory}
        onClose={() => setIsCreatingCategory(false)}
        onSuccess={(newCat) => {
          setExtraCategories((prev) => [...prev, newCat])
          setCategoryId(newCat.id)
          setIsCreatingCategory(false)
        }}
      />
    </>
  )
}
