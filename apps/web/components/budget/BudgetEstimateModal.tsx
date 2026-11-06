'use client'

import { useState, useEffect } from 'react'
import { X, WifiOff, Plus } from 'lucide-react'
import { useOnlineStatus } from '@/lib/hooks/use-online-status'
import { rethrowIfRedirect } from '@/lib/next/rethrow-redirect'
import {
  createBudgetEstimate,
  updateBudgetEstimate
} from '@/app/(protected)/budget/actions'
import { CategoryModal } from '@/components/CategoryModal'
import type {
  Account,
  BudgetEstimate,
  BudgetEstimateType,
  Category
} from '@/lib/types'

interface BudgetEstimateModalProps {
  isOpen: boolean
  onClose: () => void
  estimateToEdit?: BudgetEstimate | null
  defaultType?: BudgetEstimateType
  categories: Category[]
  accounts: (Account & { institutions?: { name: string } | null })[]
  currencies: string[]
  displayCurrency: string
  onSuccess?: () => void
}

export function BudgetEstimateModal({
  isOpen,
  onClose,
  estimateToEdit,
  defaultType = 'EXPENSE_ESTIMATE',
  categories: initialCategories,
  accounts,
  currencies,
  displayCurrency,
  onSuccess
}: BudgetEstimateModalProps) {
  const isOnline = useOnlineStatus()
  const isEditing = Boolean(estimateToEdit)

  const [localCategories, setLocalCategories] = useState<Category[]>(initialCategories)
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)

  const [type, setType] = useState<BudgetEstimateType>(
    estimateToEdit?.type ?? defaultType
  )
  const [name, setName] = useState(estimateToEdit?.name ?? '')
  const [estimatedAmount, setEstimatedAmount] = useState(
    estimateToEdit ? String(estimateToEdit.estimated_amount) : ''
  )
  const [currency, setCurrency] = useState(
    estimateToEdit?.currency ?? displayCurrency
  )
  const [categoryId, setCategoryId] = useState(
    estimateToEdit?.category_id ?? initialCategories[0]?.id ?? ''
  )
  const [dueDay, setDueDay] = useState(
    estimateToEdit?.due_day ? String(estimateToEdit.due_day) : '10'
  )
  const [preferredAccountId, setPreferredAccountId] = useState(
    estimateToEdit?.preferred_account_id ?? ''
  )
  const [isActive, setIsActive] = useState(estimateToEdit?.is_active ?? true)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLocalCategories(initialCategories)
  }, [initialCategories])

  useEffect(() => {
    if (!isOpen) return
    setType(estimateToEdit?.type ?? defaultType)
    setName(estimateToEdit?.name ?? '')
    setEstimatedAmount(
      estimateToEdit ? String(estimateToEdit.estimated_amount) : ''
    )
    setCurrency(estimateToEdit?.currency ?? displayCurrency)
    setCategoryId(
      estimateToEdit?.category_id ?? initialCategories[0]?.id ?? ''
    )
    setDueDay(estimateToEdit?.due_day ? String(estimateToEdit.due_day) : '10')
    setPreferredAccountId(estimateToEdit?.preferred_account_id ?? '')
    setIsActive(estimateToEdit?.is_active ?? true)
    setError(null)
  }, [isOpen, estimateToEdit, defaultType, displayCurrency, initialCategories])

  if (!isOpen) return null

  const availableCurrencies = Array.from(
    new Set([displayCurrency, ...currencies, 'USD', 'EUR', 'UYU', 'ARS', 'AUD', 'NZD'])
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isOnline) {
      setError('Estás sin conexión. Conectate a internet para guardar estimaciones de presupuesto.')
      return
    }
    if (!name.trim()) {
      setError('Ingresá un nombre para la estimación (ej. Alquiler, Internet, Sueldo).')
      return
    }
    const parsedAmount = Number(estimatedAmount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Ingresá un monto estimado mayor a 0.')
      return
    }
    if (!categoryId) {
      setError('Seleccioná una categoría para medir el avance del mes.')
      return
    }
    const parsedDueDay = dueDay.trim() ? Number(dueDay) : null
    if (
      parsedDueDay !== null &&
      (!Number.isInteger(parsedDueDay) || parsedDueDay < 1 || parsedDueDay > 31)
    ) {
      setError('El día del mes debe ser un número entre 1 y 31.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const payload = {
        name: name.trim(),
        type,
        estimatedAmount: parsedAmount,
        currency,
        categoryId,
        dueDay: parsedDueDay,
        preferredAccountId: preferredAccountId || null,
        isActive
      }

      if (isEditing && estimateToEdit) {
        await updateBudgetEstimate(estimateToEdit.id, payload)
      } else {
        await createBudgetEstimate(payload)
      }

      onSuccess?.()
      onClose()
    } catch (err) {
      rethrowIfRedirect(err)
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al guardar la estimación.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="relative w-full max-w-lg bg-surface-1 border border-border rounded-card shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h2 className="font-display text-base font-semibold text-text-primary">
                {isEditing ? 'Editar estimación de presupuesto' : 'Nueva estimación mensual'}
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                {isEditing
                  ? 'Actualizá el importe, vencimiento o cuenta preferida'
                  : 'Definí tus gastos fijos recurrentes o ingresos proyectados'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar modal"
              className="text-text-muted hover:text-text-primary transition p-1 rounded-control"
            >
              <X size={18} />
            </button>
          </div>

          {!isOnline && (
            <div className="flex items-center gap-2 px-5 py-2.5 bg-pending/10 border-b border-pending/20 text-pending text-xs">
              <WifiOff size={14} />
              <span>Estás sin conexión. Conectate a internet para guardar cambios en tu presupuesto.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
            {/* Selector de Tipo */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Tipo de estimación
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-surface-0 border border-border rounded-control">
                <button
                  type="button"
                  onClick={() => setType('EXPENSE_ESTIMATE')}
                  className={`py-2 px-3 rounded-control text-xs font-semibold transition ${
                    type === 'EXPENSE_ESTIMATE'
                      ? 'bg-expense/15 text-expense border border-expense/30'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Gasto fijo recurrente
                </button>
                <button
                  type="button"
                  onClick={() => setType('INCOME_ESTIMATE')}
                  className={`py-2 px-3 rounded-control text-xs font-semibold transition ${
                    type === 'INCOME_ESTIMATE'
                      ? 'bg-income/15 text-income border border-income/30'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Ingreso proyectado
                </button>
              </div>
            </div>

            {/* Nombre */}
            <div>
              <label
                htmlFor="budget-estimate-name"
                className="block text-xs font-medium text-text-secondary mb-1"
              >
                Nombre / Concepto
              </label>
              <input
                id="budget-estimate-name"
                type="text"
                placeholder={
                  type === 'EXPENSE_ESTIMATE'
                    ? 'Ej. Alquiler, Fibra óptica, Gimnasio...'
                    : 'Ej. Sueldo mensual, Retainer cliente...'
                }
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-surface-0 border border-border rounded-control px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>

            {/* Monto y Moneda */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label
                  htmlFor="budget-estimate-amount"
                  className="block text-xs font-medium text-text-secondary mb-1"
                >
                  Monto mensual estimado
                </label>
                <input
                  id="budget-estimate-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={estimatedAmount}
                  onChange={(e) => setEstimatedAmount(e.target.value)}
                  className="w-full bg-surface-0 border border-border rounded-control px-3 py-2 text-sm font-mono tabular-nums text-text-primary focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label
                  htmlFor="budget-estimate-currency"
                  className="block text-xs font-medium text-text-secondary mb-1"
                >
                  Moneda
                </label>
                <select
                  id="budget-estimate-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-surface-0 border border-border rounded-control px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:border-accent"
                >
                  {availableCurrencies.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Categoría y Día de Vencimiento */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="budget-estimate-category"
                    className="block text-xs font-medium text-text-secondary"
                  >
                    Categoría vinculada
                  </label>
                  <button
                    type="button"
                    onClick={() => setCategoryModalOpen(true)}
                    className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
                  >
                    <Plus size={12} />
                    <span>Crear categoría</span>
                  </button>
                </div>
                <select
                  id="budget-estimate-category"
                  value={categoryId}
                  onChange={(e) => {
                    if (e.target.value === '__new__') {
                      setCategoryModalOpen(true)
                      return
                    }
                    setCategoryId(e.target.value)
                  }}
                  className="w-full bg-surface-0 border border-border rounded-control px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value="" disabled>
                    Seleccioná una categoría...
                  </option>
                  {localCategories
                    .filter((c) => c.is_active !== false || c.id === categoryId)
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  <option value="__new__">+ Crear categoría...</option>
                </select>
                <p className="text-[11px] text-text-muted mt-1">
                  Los movimientos reales de esta categoría sumarán al progreso del mes.
                </p>
              </div>

              <div>
                <label
                  htmlFor="budget-estimate-dueday"
                  className="block text-xs font-medium text-text-secondary mb-1"
                >
                  {type === 'EXPENSE_ESTIMATE' ? 'Día de vencimiento' : 'Día de cobro'}
                </label>
                <input
                  id="budget-estimate-dueday"
                  type="number"
                  min={1}
                  max={31}
                  placeholder="1 - 31"
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  className="w-full bg-surface-0 border border-border rounded-control px-3 py-2 text-sm font-mono tabular-nums text-text-primary focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            {/* Cuenta preferida para ejecución 1-Tap */}
            <div>
              <label
                htmlFor="budget-estimate-account"
                className="block text-xs font-medium text-text-secondary mb-1"
              >
                Cuenta preferida para ejecución en 1 toque (opcional)
              </label>
              <select
                id="budget-estimate-account"
                value={preferredAccountId}
                onChange={(e) => setPreferredAccountId(e.target.value)}
                className="w-full bg-surface-0 border border-border rounded-control px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              >
                <option value="">Preguntar cuenta al ejecutar</option>
                {accounts
                  .filter((a) => a.is_active !== false)
                  .map((acc) => {
                    const inst = acc.institutions?.name ? ` · ${acc.institutions.name}` : ''
                    return (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.currency_native}){inst}
                      </option>
                    )
                  })}
              </select>
            </div>

            {isEditing && (
              <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
                <div>
                  <p className="text-xs font-medium text-text-primary">Estimación activa</p>
                  <p className="text-[11px] text-text-muted">
                    Desactivala si ya no corre este gasto o ingreso mensual.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 accent-[color:var(--accent)]"
                />
              </div>
            )}

            {error && (
              <div className="p-3 rounded-control bg-expense/10 border border-expense/30 text-xs text-expense">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-control text-xs font-medium text-text-secondary hover:text-text-primary transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !isOnline}
                className="px-4 py-2 rounded-control text-xs font-semibold bg-accent text-[color:var(--on-accent)] hover:opacity-95 transition disabled:opacity-40"
              >
                {isSubmitting
                  ? 'Guardando...'
                  : isEditing
                    ? 'Guardar cambios'
                    : 'Crear estimación'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <CategoryModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        onSuccess={(created) => {
          setLocalCategories((prev) => [...prev, created])
          setCategoryId(created.id)
          setCategoryModalOpen(false)
        }}
      />
    </>
  )
}
