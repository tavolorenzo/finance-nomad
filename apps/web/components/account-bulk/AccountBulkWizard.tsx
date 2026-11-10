'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Sparkles,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Wallet,
  TrendingDown,
  TrendingUp,
  Scale
} from 'lucide-react'
import { SmartPasteModal } from '@/components/credit-card-bulk/SmartPasteModal'
import { CategoryModal } from '@/components/CategoryModal'
import { saveBulkCardMovementsAction } from '@/app/(protected)/accounts/bulk-card-actions'
import { suggestCategory, type ParsedCardMovement } from '@/lib/parsers/card-statement-parser'
import { calculateAccountingPeriod, formatAccountingPeriodLabel } from '@/lib/ledger/builder'
import { formatMoney } from '@/lib/currency'
import type { Account, Category, Person } from '@/lib/types'

export interface AccountBulkRowItem {
  id: string
  date: string
  accountingPeriod: string
  type: 'OUTCOME' | 'INCOME'
  description: string
  amount: string
  currency: string
  categoryId: string | null
  personId: string | null
}

interface AccountBulkWizardProps {
  account: Account & { institutions?: { name: string } | null }
  categories: Category[]
  people: Person[]
  onComplete?: () => void
  onSkip?: () => void
}

function createEmptyAccountRow(
  defaultCurrency: string,
  defaultDate: string,
  defaultPersonId: string | null = null,
  defaultAccountingPeriod?: string
): AccountBulkRowItem {
  return {
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date: defaultDate,
    accountingPeriod: defaultAccountingPeriod || defaultDate.slice(0, 7),
    type: 'OUTCOME',
    description: '',
    amount: '',
    currency: defaultCurrency,
    categoryId: null,
    personId: defaultPersonId
  }
}

export function AccountBulkWizard({
  account,
  categories,
  people,
  onComplete,
  onSkip
}: AccountBulkWizardProps) {
  const router = useRouter()
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const currentPeriod = useMemo(() => today.slice(0, 7), [today])

  const personalPerson = useMemo(() => {
    return people.find((p) => p.name.trim().toLowerCase() === 'personal')
  }, [people])
  const otherPeople = useMemo(() => {
    return people.filter((p) => p.name.trim().toLowerCase() !== 'personal')
  }, [people])

  const defaultPersonId = personalPerson?.id ?? null
  const accountCurrency = account.currency_native || 'ARS'

  const availableCurrencies = useMemo(() => {
    return Array.from(
      new Set([accountCurrency, 'UYU', 'USD', 'EUR', 'ARS', 'AUD', 'NZD'])
    ).filter(Boolean)
  }, [accountCurrency])

  const [rows, setRows] = useState<AccountBulkRowItem[]>(() => [
    createEmptyAccountRow(accountCurrency, today, defaultPersonId, currentPeriod)
  ])

  const [localCategories, setLocalCategories] = useState<Category[]>(categories)
  useEffect(() => {
    setLocalCategories(categories)
  }, [categories])

  const [creatingCategoryForRowId, setCreatingCategoryForRowId] = useState<string | null>(null)
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Resumen en vivo de importes: Gastos, Ingresos y Saldo Neto
  const summary = useMemo(() => {
    let totalExpense = 0
    let totalIncome = 0
    let validCount = 0
    let sharedTotal = 0
    let sharedCount = 0

    const expenseByCurr: Record<string, number> = {}
    const incomeByCurr: Record<string, number> = {}

    for (const r of rows) {
      const amt = parseFloat(r.amount)
      if (!isNaN(amt) && amt > 0 && r.description.trim().length > 0) {
        validCount++
        const rowCurr = r.currency || accountCurrency
        if (r.type === 'OUTCOME') {
          totalExpense += rowCurr === accountCurrency ? amt : 0
          expenseByCurr[rowCurr] = Math.round(((expenseByCurr[rowCurr] || 0) + amt) * 100) / 100
        } else {
          totalIncome += rowCurr === accountCurrency ? amt : 0
          incomeByCurr[rowCurr] = Math.round(((incomeByCurr[rowCurr] || 0) + amt) * 100) / 100
        }

        const isShared = Boolean(r.personId && r.personId !== defaultPersonId)
        if (isShared && r.type === 'OUTCOME') {
          sharedTotal += rowCurr === accountCurrency ? amt : 0
          sharedCount++
        }
      }
    }

    const netImpact = totalIncome - totalExpense

    return {
      totalExpense: Math.round(totalExpense * 100) / 100,
      totalIncome: Math.round(totalIncome * 100) / 100,
      netImpact: Math.round(netImpact * 100) / 100,
      validCount,
      sharedTotal: Math.round(sharedTotal * 100) / 100,
      sharedCount,
      expenseByCurr,
      incomeByCurr
    }
  }, [rows, defaultPersonId, accountCurrency])

  function handleAddRow() {
    setRows((prev) => [
      ...prev,
      createEmptyAccountRow(accountCurrency, today, defaultPersonId, currentPeriod)
    ])
  }

  function handleDeleteRow(id: string) {
    setRows((prev) => {
      const filtered = prev.filter((r) => r.id !== id)
      return filtered.length > 0
        ? filtered
        : [createEmptyAccountRow(accountCurrency, today, defaultPersonId, currentPeriod)]
    })
  }

  function handleChangeRow(id: string, field: keyof AccountBulkRowItem, value: any) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        const updated = { ...r, [field]: value }

        // Si se cambia la descripción y no tenía categoría, sugerir automáticamente
        if (field === 'description' && !r.categoryId && typeof value === 'string' && value.length >= 3) {
          const suggestion = suggestCategory(value, localCategories)
          if (suggestion.id) {
            updated.categoryId = suggestion.id
          }
        }

        return updated
      })
    )
  }

  function handleApplyPasted(parsedItems: ParsedCardMovement[]) {
    if (parsedItems.length === 0) return

    const newRows: AccountBulkRowItem[] = parsedItems.map((item) => {
      const rowType: 'OUTCOME' | 'INCOME' = item.type || (item.isRefund ? 'INCOME' : 'OUTCOME')
      return {
        id: item.id || `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date: item.date || today,
        accountingPeriod: currentPeriod,
        type: rowType,
        description: item.description || '',
        amount: item.amount ? String(Math.abs(item.amount)) : '',
        currency: item.currency || accountCurrency,
        categoryId: item.categoryId || null,
        personId:
          item.personId !== undefined && item.personId !== null
            ? item.personId
            : defaultPersonId
      }
    })

    const hasOnlyOneEmpty =
      rows.length === 1 && !rows[0].description.trim() && !rows[0].amount

    setRows(hasOnlyOneEmpty ? newRows : [...rows, ...newRows])
  }

  function handleClearAll() {
    if (confirm('¿Querés limpiar todas las filas cargadas?')) {
      setRows([createEmptyAccountRow(accountCurrency, today, defaultPersonId, currentPeriod)])
    }
  }

  async function handleSave() {
    const validMovements = rows
      .map((r) => {
        const rawAmt = parseFloat(r.amount) || 0
        return {
          date: r.date,
          accountingPeriod: r.accountingPeriod || currentPeriod,
          description: r.description.trim(),
          amount: Math.abs(rawAmt),
          currency: r.currency,
          installmentCurrent: 1,
          installmentTotal: 1,
          categoryId: r.categoryId || null,
          personId: r.personId || null,
          type: r.type,
          isRefund: r.type === 'INCOME'
        }
      })
      .filter((m) => m.amount > 0 && m.description.length > 0)

    if (validMovements.length === 0) {
      setError('Cargá al menos un movimiento con descripción y monto mayor a cero.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await saveBulkCardMovementsAction({
        accountId: account.id,
        movements: validMovements
      })

      setSuccess(true)
      setTimeout(() => {
        if (onComplete) {
          onComplete()
        } else {
          router.push(`/accounts/${account.id}`)
          router.refresh()
        }
      }, 800)
    } catch (err: any) {
      console.error('Error guardando movimientos de cuenta:', err)
      setError(err?.message || 'Ocurrió un error al guardar los movimientos.')
      setSubmitting(false)
    }
  }

  const prevMonthPeriod = calculateAccountingPeriod(currentPeriod, -1)
  const nextMonthPeriod = calculateAccountingPeriod(currentPeriod, 1)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="space-y-1">
          <Link
            href={`/accounts/${account.id}`}
            className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition mb-1"
          >
            <ArrowLeft size={13} />
            <span>Volver a {account.name}</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-control bg-accent/10 text-accent">
              <Wallet className="w-4 h-4" />
            </span>
            <h1 className="font-display text-lg font-bold text-text-primary">
              Carga Rápida de Cuenta · {account.name}
            </h1>
          </div>
          <p className="text-xs text-text-secondary">
            Pegá movimientos de tu extracto bancario o home banking, o cargalos en bloque en la grilla para actualizar tu saldo.
          </p>
        </div>

        {/* Acciones de Cabecera */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsPasteModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-control bg-accent text-[color:var(--on-accent)] text-xs font-semibold hover:opacity-90 transition shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pegado Mágico</span>
          </button>
          <button
            type="button"
            onClick={handleAddRow}
            className="flex items-center gap-1 px-3 py-2 rounded-control bg-surface-1 border border-border text-xs font-medium text-text-primary hover:bg-surface-2 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Fila</span>
          </button>
          {rows.length > 1 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="p-2 rounded-control text-text-muted hover:text-expense hover:bg-surface-1 border border-transparent hover:border-border transition"
              title="Limpiar grilla"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Live Impact Summary Card */}
      <div className="bg-surface-1 border border-border rounded-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-accent" />
            <span>Impacto Financiero del Bloque</span>
          </p>
          <span className="text-[11px] text-text-muted">
            {summary.validCount} {summary.validCount === 1 ? 'movimiento válido' : 'movimientos válidos'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-border/60">
          {/* Total Gastos */}
          <div className="p-2.5 rounded-control bg-surface-0 border border-border/80 space-y-1">
            <span className="text-[11px] text-text-muted font-medium flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-expense" /> Total Gastos
            </span>
            <p className="font-mono tabular-nums text-base font-bold amount text-expense">
              -{formatMoney(summary.totalExpense, accountCurrency)}
            </p>
          </div>

          {/* Total Ingresos */}
          <div className="p-2.5 rounded-control bg-surface-0 border border-border/80 space-y-1">
            <span className="text-[11px] text-text-muted font-medium flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-income" /> Total Ingresos
            </span>
            <p className="font-mono tabular-nums text-base font-bold amount text-income">
              +{formatMoney(summary.totalIncome, accountCurrency)}
            </p>
          </div>

          {/* Impacto Neto en la Cuenta */}
          <div className="p-2.5 rounded-control bg-surface-0 border border-border/80 space-y-1">
            <span className="text-[11px] text-text-muted font-medium flex items-center gap-1">
              <Scale className="w-3 h-3 text-accent" /> Saldo Neto Resultante
            </span>
            <p
              className={`font-mono tabular-nums text-base font-bold amount ${
                summary.netImpact > 0
                  ? 'text-income'
                  : summary.netImpact < 0
                  ? 'text-expense'
                  : 'text-text-primary'
              }`}
            >
              {summary.netImpact > 0 ? '+' : ''}
              {formatMoney(summary.netImpact, accountCurrency)}
            </p>
          </div>
        </div>

        {summary.sharedCount > 0 && (
          <div className="text-[11px] text-text-muted flex items-center gap-1 pt-1">
            <span>Incluye {summary.sharedCount} {summary.sharedCount === 1 ? 'gasto asignado' : 'gastos asignados'} a terceros por un total de</span>
            <span className="font-mono tabular-nums font-semibold text-text-primary">
              {formatMoney(summary.sharedTotal, accountCurrency)}
            </span>
          </div>
        )}
      </div>

      {/* Spreadsheet Table */}
      <div className="border border-border rounded-card bg-surface-0 overflow-hidden shadow-xs">
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-surface-1 border-b border-border sticky top-0 z-10 text-text-muted font-semibold select-none">
              <tr>
                <th className="p-2.5 w-32">Fecha</th>
                <th className="p-2.5 w-32">Período</th>
                <th className="p-2.5 w-28">Tipo</th>
                <th className="p-2.5 min-w-[200px]">Concepto / Detalle</th>
                <th className="p-2.5 w-40">Categoría</th>
                <th className="p-2.5 w-32">Persona</th>
                <th className="p-2.5 w-24">Divisa</th>
                <th className="p-2.5 w-32 text-right">Monto</th>
                <th className="p-2.5 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map((item, index) => {
                const isOutcome = item.type === 'OUTCOME'
                const periodOptions = Array.from(
                  new Set([
                    prevMonthPeriod,
                    currentPeriod,
                    nextMonthPeriod,
                    item.accountingPeriod
                  ].filter(Boolean))
                )

                return (
                  <tr
                    key={item.id}
                    className={`transition hover:bg-surface-1/40 ${
                      item.type === 'INCOME' ? 'bg-income/5' : ''
                    }`}
                  >
                    {/* Fecha */}
                    <td className="p-2">
                      <input
                        type="date"
                        aria-label="Fecha"
                        value={item.date}
                        onChange={(e) => handleChangeRow(item.id, 'date', e.target.value)}
                        className="w-full bg-surface-0 border border-border rounded-control px-2 py-1 text-xs font-mono text-text-primary focus:border-accent outline-none"
                      />
                    </td>

                    {/* Período Contable */}
                    <td className="p-2">
                      <select
                        aria-label="Período contable"
                        value={item.accountingPeriod || currentPeriod}
                        onChange={(e) =>
                          handleChangeRow(item.id, 'accountingPeriod', e.target.value)
                        }
                        className="w-full bg-surface-0 border border-border rounded-control px-2 py-1 text-xs font-medium text-text-primary focus:border-accent outline-none"
                      >
                        {periodOptions.map((period) => (
                          <option key={period} value={period}>
                            {formatAccountingPeriodLabel(period)}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Tipo: Gasto / Ingreso */}
                    <td className="p-2">
                      <select
                        aria-label="Tipo de movimiento"
                        value={item.type}
                        onChange={(e) =>
                          handleChangeRow(item.id, 'type', e.target.value as 'OUTCOME' | 'INCOME')
                        }
                        className={`w-full border rounded-control px-2 py-1 text-xs font-semibold outline-none transition ${
                          isOutcome
                            ? 'bg-surface-0 border-border text-expense focus:border-accent'
                            : 'bg-income/10 border-income/30 text-income focus:border-income'
                        }`}
                      >
                        <option value="OUTCOME">Gasto (-)</option>
                        <option value="INCOME">Ingreso (+)</option>
                      </select>
                    </td>

                    {/* Concepto / Comercio */}
                    <td className="p-2">
                      <input
                        type="text"
                        aria-label="Concepto"
                        value={item.description}
                        onChange={(e) => handleChangeRow(item.id, 'description', e.target.value)}
                        placeholder="Ej. Transferencia recibida, Coto..."
                        className="w-full bg-surface-0 border border-border rounded-control px-2.5 py-1 text-xs text-text-primary focus:border-accent outline-none font-medium"
                      />
                    </td>

                    {/* Categoría */}
                    <td className="p-2">
                      <select
                        aria-label="Categoría"
                        value={item.categoryId || ''}
                        onChange={(e) => {
                          if (e.target.value === '__NEW__') {
                            setCreatingCategoryForRowId(item.id)
                          } else {
                            handleChangeRow(item.id, 'categoryId', e.target.value || null)
                          }
                        }}
                        className="w-full bg-surface-0 border border-border rounded-control px-2 py-1 text-xs text-text-primary focus:border-accent outline-none"
                      >
                        <option value="">Sin categoría</option>
                        {localCategories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                        <option value="__NEW__">+ Nueva categoría...</option>
                      </select>
                    </td>

                    {/* Persona */}
                    <td className="p-2">
                      <select
                        aria-label="Persona"
                        value={item.personId || defaultPersonId || ''}
                        onChange={(e) =>
                          handleChangeRow(item.id, 'personId', e.target.value || defaultPersonId)
                        }
                        className="w-full bg-surface-0 border border-border rounded-control px-2 py-1 text-xs text-text-primary focus:border-accent outline-none"
                      >
                        <option value={defaultPersonId || ''}>Personal</option>
                        {otherPeople.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Divisa */}
                    <td className="p-2">
                      <select
                        aria-label="Divisa"
                        value={item.currency}
                        onChange={(e) => handleChangeRow(item.id, 'currency', e.target.value)}
                        className="w-full bg-surface-0 border border-border rounded-control px-2 py-1 text-xs font-mono font-medium text-text-primary focus:border-accent outline-none"
                      >
                        {availableCurrencies.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Monto */}
                    <td className="p-2">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        aria-label="Monto"
                        value={item.amount}
                        onChange={(e) => handleChangeRow(item.id, 'amount', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddRow()
                          }
                        }}
                        placeholder="0.00"
                        className={`w-full bg-surface-0 border border-border rounded-control px-2.5 py-1 text-xs font-mono tabular-nums text-right focus:border-accent outline-none font-semibold ${
                          isOutcome ? 'text-expense' : 'text-income'
                        }`}
                      />
                    </td>

                    {/* Eliminar fila */}
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        aria-label="Eliminar fila"
                        onClick={() => handleDeleteRow(item.id)}
                        className="p-1 text-text-muted hover:text-expense transition rounded hover:bg-surface-1"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Feedback de error o éxito */}
      {error && (
        <div className="p-3 bg-expense/10 border border-expense/30 rounded-control text-xs text-expense flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-income/10 border border-income/30 rounded-control text-xs text-income flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Movimientos guardados con éxito en {account.name}. Redirigiendo...</span>
        </div>
      )}

      {/* Botonera Inferior */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={handleAddRow}
          className="flex items-center gap-1.5 text-xs text-accent hover:underline font-medium"
        >
          <Plus size={14} />
          <span>Agregar otra fila</span>
        </button>

        <div className="flex items-center gap-3">
          <Link
            href={`/accounts/${account.id}`}
            className="px-4 py-2 rounded-control text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-1 transition"
          >
            Cancelar
          </Link>
          <button
            type="button"
            disabled={submitting || summary.validCount === 0 || success}
            onClick={handleSave}
            className="flex items-center gap-2 bg-accent text-[color:var(--on-accent)] px-6 py-2 rounded-control text-xs font-semibold hover:opacity-90 transition disabled:opacity-40 shadow-sm"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : success ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>¡Guardado!</span>
              </>
            ) : (
              <>
                <span>Guardar movimientos ({summary.validCount})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal de Pegado Mágico para Home Banking */}
      <SmartPasteModal
        isOpen={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        onApply={handleApplyPasted}
        defaultCurrency={accountCurrency}
        availableCurrencies={availableCurrencies}
        categories={localCategories}
        people={people}
        accountType={account.type}
      />

      {/* Modal de Creación Rápida de Categoría */}
      {creatingCategoryForRowId && (
        <CategoryModal
          isOpen={true}
          onClose={() => setCreatingCategoryForRowId(null)}
          onSuccess={(newCat) => {
            setLocalCategories((prev) => [...prev, newCat])
            handleChangeRow(creatingCategoryForRowId, 'categoryId', newCat.id)
            setCreatingCategoryForRowId(null)
          }}
        />
      )}
    </div>
  )
}
