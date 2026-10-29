'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  CreditCard,
  Sparkles,
  Plus,
  Trash2,
  ArrowRight,
  CheckCircle2,
  Loader2,
  AlertCircle,
  HelpCircle
} from 'lucide-react'
import { BulkMovementRow, type BulkRowItem } from './BulkMovementRow'
import { SmartPasteModal } from './SmartPasteModal'
import { BulkImpactSummary } from './BulkImpactSummary'
import { saveBulkCardMovementsAction } from '@/app/(protected)/accounts/bulk-card-actions'
import type { Account, Category, Person } from '@/lib/types'

interface CreditCardBulkWizardProps {
  cardAccounts: (Account & { institutions?: { name: string } | null })[]
  initialCardId?: string
  categories: Category[]
  people: Person[]
  onComplete?: () => void
  onSkip?: () => void
  isPostOnboarding?: boolean
}

function createEmptyRow(
  defaultCurrency: string,
  defaultDate: string,
  defaultPersonId: string | null = null
): BulkRowItem {
  return {
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date: defaultDate,
    description: '',
    amount: '',
    currency: defaultCurrency,
    installmentCurrent: 1,
    installmentTotal: 1,
    categoryId: null,
    personId: defaultPersonId
  }
}

export function CreditCardBulkWizard({
  cardAccounts,
  initialCardId,
  categories,
  people,
  onComplete,
  onSkip,
  isPostOnboarding = false
}: CreditCardBulkWizardProps) {
  const router = useRouter()
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const personalPerson = useMemo(() => {
    return people.find((p) => p.name.trim().toLowerCase() === 'personal')
  }, [people])

  const defaultPersonId = personalPerson?.id ?? null

  const [selectedAccountId, setSelectedAccountId] = useState(
    initialCardId || cardAccounts[0]?.id || ''
  )

  const selectedCard = useMemo(() => {
    return cardAccounts.find((a) => a.id === selectedAccountId) || cardAccounts[0]
  }, [cardAccounts, selectedAccountId])

  const cardCurrency = selectedCard?.currency_native || 'ARS'
  const creditLimit = selectedCard?.credit_limit ?? null

  const availableCurrencies = useMemo(() => {
    return Array.from(
      new Set([
        cardCurrency,
        ...cardAccounts.map((a) => a.currency_native),
        'USD',
        'EUR',
        'ARS'
      ])
    ).filter(Boolean)
  }, [cardCurrency, cardAccounts])

  const [rows, setRows] = useState<BulkRowItem[]>(() => [
    createEmptyRow(cardCurrency, today, defaultPersonId)
  ])

  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Cálculos en vivo de impacto financiero y desglose de personas
  const {
    currentStatementTotal,
    futureCommitmentsTotal,
    personalTotal,
    sharedTotal,
    sharedCount,
    validRowsCount
  } = useMemo(() => {
    let currentTotal = 0
    let futureTotal = 0
    let pTotal = 0
    let sTotal = 0
    let sCount = 0
    let validCount = 0

    for (const r of rows) {
      const amt = parseFloat(r.amount)
      if (!isNaN(amt) && amt > 0 && r.description.trim().length > 0) {
        validCount++
        currentTotal += amt

        const isShared = Boolean(r.personId && r.personId !== defaultPersonId)
        if (isShared) {
          sTotal += amt
          sCount++
        } else {
          pTotal += amt
        }

        if (r.installmentTotal > r.installmentCurrent) {
          const remainingCount = r.installmentTotal - r.installmentCurrent
          futureTotal += amt * remainingCount
        }
      }
    }

    return {
      currentStatementTotal: Math.round(currentTotal * 100) / 100,
      futureCommitmentsTotal: Math.round(futureTotal * 100) / 100,
      personalTotal: Math.round(pTotal * 100) / 100,
      sharedTotal: Math.round(sTotal * 100) / 100,
      sharedCount: sCount,
      validRowsCount: validCount
    }
  }, [rows, defaultPersonId])

  function handleAddRow() {
    setRows((prev) => [...prev, createEmptyRow(cardCurrency, today, defaultPersonId)])
  }

  function handleDeleteRow(id: string) {
    setRows((prev) => {
      const filtered = prev.filter((r) => r.id !== id)
      return filtered.length > 0 ? filtered : [createEmptyRow(cardCurrency, today, defaultPersonId)]
    })
  }

  function handleChangeRow(id: string, field: keyof BulkRowItem, value: any) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    )
  }

  function handleApplyPasted(parsedItems: any[]) {
    if (parsedItems.length === 0) return
    const newRows: BulkRowItem[] = parsedItems.map((item) => ({
      id: item.id || `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: item.date || today,
      description: item.description || '',
      amount: item.amount ? String(item.amount) : '',
      currency: item.currency || cardCurrency,
      installmentCurrent: item.installmentCurrent || 1,
      installmentTotal: item.installmentTotal || 1,
      categoryId: item.categoryId || null,
      personId: item.personId !== undefined && item.personId !== null ? item.personId : defaultPersonId
    }))

    // Si la grilla sólo tenía una fila vacía, la reemplazamos; si no, añadimos
    const hasOnlyOneEmpty =
      rows.length === 1 && !rows[0].description.trim() && !rows[0].amount

    setRows(hasOnlyOneEmpty ? newRows : [...rows, ...newRows])
  }

  function handleClearAll() {
    if (confirm('¿Querés limpiar todas las filas cargadas?')) {
      setRows([createEmptyRow(cardCurrency, today, defaultPersonId)])
    }
  }

  async function handleSave() {
    const validMovements = rows
      .map((r) => ({
        date: r.date,
        description: r.description.trim(),
        amount: parseFloat(r.amount) || 0,
        currency: r.currency,
        installmentCurrent: r.installmentCurrent,
        installmentTotal: r.installmentTotal,
        categoryId: r.categoryId || null,
        personId: r.personId || null
      }))
      .filter((m) => m.amount > 0 && m.description.length > 0)

    if (validMovements.length === 0) {
      setError('Cargá al menos un consumo con descripción y monto mayor a cero.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await saveBulkCardMovementsAction({
        accountId: selectedAccountId,
        movements: validMovements
      })

      setSuccess(true)
      setTimeout(() => {
        if (onComplete) {
          onComplete()
        } else {
          router.push('/dashboard')
          router.refresh()
        }
      }, 1000)
    } catch (err: any) {
      console.error('Error guardando consumos:', err)
      setError(err?.message || 'Ocurrió un error al guardar los consumos.')
      setSubmitting(false)
    }
  }

  function handleSkipAction() {
    if (onSkip) {
      onSkip()
    } else {
      router.push('/dashboard')
    }
  }

  if (cardAccounts.length === 0) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center space-y-4 bg-surface-1 border border-border rounded-card">
        <CreditCard className="w-10 h-10 text-text-muted mx-auto" />
        <h2 className="text-lg font-bold text-text-primary">
          No tenés tarjetas de crédito configuradas
        </h2>
        <p className="text-xs text-text-secondary">
          Para utilizar el asistente de carga en bloque primero agregá una tarjeta de crédito en tus cuentas.
        </p>
        <button
          type="button"
          onClick={handleSkipAction}
          className="bg-accent text-[color:var(--on-accent)] px-5 py-2 rounded-control text-xs font-semibold"
        >
          Ir al Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header del Wizard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-control bg-accent/10 text-accent">
              <CreditCard className="w-4 h-4" />
            </span>
            <h1 className="font-display text-lg font-bold text-text-primary">
              Carga Rápida de Tarjeta de Crédito
            </h1>
            {isPostOnboarding && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent/15 text-accent font-medium">
                Paso Opcional
              </span>
            )}
          </div>
          <p className="text-xs text-text-secondary">
            Cargá los consumos del resumen actual y tus compras en cuotas para reflejar tu saldo y compromisos reales.
          </p>
        </div>

        {/* Selector de Tarjeta (si tiene múltiples) */}
        <div className="flex items-center gap-2">
          {cardAccounts.length > 1 ? (
            <div className="flex items-center gap-2">
              <label htmlFor="card-select" className="text-xs text-text-muted font-medium">
                Tarjeta:
              </label>
              <select
                id="card-select"
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="bg-surface-1 border border-border rounded-control px-2.5 py-1.5 text-xs font-semibold text-text-primary focus:border-accent outline-none"
              >
                {cardAccounts.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.institutions?.name ? `${card.institutions.name} - ` : ''}
                    {card.name} ({card.currency_native})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-control bg-surface-1 border border-border text-xs font-medium text-text-primary flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5 text-accent" />
              <span>
                {selectedCard?.institutions?.name ? `${selectedCard.institutions.name} · ` : ''}
                {selectedCard?.name} ({cardCurrency})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Toolbar Superior de Acciones de la Grilla */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddRow}
            className="flex items-center gap-1.5 bg-surface-1 hover:bg-surface-2 text-text-primary px-3 py-1.5 rounded-control text-xs font-medium border border-border transition shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-accent" />
            <span>Agregar fila</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPasteModalOpen(true)}
            className="flex items-center gap-1.5 bg-accent/10 hover:bg-accent/20 text-accent px-3 py-1.5 rounded-control text-xs font-semibold border border-accent/20 transition shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pegar Resumen Mágico</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {rows.length > 1 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-text-muted hover:text-expense text-xs px-2 py-1 rounded-control transition flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Limpiar todo</span>
            </button>
          )}
          <span className="text-xs text-text-muted">
            {rows.length} {rows.length === 1 ? 'fila' : 'filas'} ({validRowsCount}{' '}
            {validRowsCount === 1 ? 'válida' : 'válidas'})
          </span>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3 bg-expense/10 border border-expense/30 rounded-control text-xs text-expense flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grilla Spreadsheet-like */}
      <div className="bg-surface-0 border border-border rounded-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-surface-1/70 border-b border-border text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                <th className="p-2.5 w-32">Fecha</th>
                <th className="p-2.5 min-w-[180px]">Comercio / Detalle</th>
                <th className="p-2.5 w-28 text-center">Cuotas</th>
                <th className="p-2.5 w-44">Categoría</th>
                <th className="p-2.5 w-32">Persona</th>
                <th className="p-2.5 w-24">Divisa</th>
                <th className="p-2.5 w-32 text-right">Monto</th>
                <th className="p-2.5 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <BulkMovementRow
                  key={row.id}
                  item={row}
                  index={idx}
                  categories={categories}
                  people={people}
                  availableCurrencies={availableCurrencies}
                  onChange={handleChangeRow}
                  onDelete={handleDeleteRow}
                  onAddRowAfter={handleAddRow}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Tip inferior de teclado */}
        <div className="p-2.5 bg-surface-1/40 border-t border-border flex items-center justify-between text-[11px] text-text-muted">
          <p className="flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Presioná <strong>Tab</strong> para saltar entre campos y <strong>Enter</strong> en el monto para añadir otra fila.</span>
          </p>
          <button
            type="button"
            onClick={handleAddRow}
            className="text-accent hover:underline font-medium text-[11px]"
          >
            + Agregar otra fila
          </button>
        </div>
      </div>

      {/* Resumen de Impacto Financiero en Vivo */}
      <BulkImpactSummary
        currentStatementTotal={currentStatementTotal}
        futureCommitmentsTotal={futureCommitmentsTotal}
        personalTotal={personalTotal}
        sharedTotal={sharedTotal}
        sharedCount={sharedCount}
        creditLimit={creditLimit}
        currency={cardCurrency}
      />

      {/* Barra Inferior de Navegación */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <button
          type="button"
          disabled={submitting}
          onClick={handleSkipAction}
          className="text-xs font-medium text-text-secondary hover:text-text-primary px-3 py-2 rounded-control hover:bg-surface-1 transition"
        >
          {isPostOnboarding ? 'Omitir por ahora e ir al Dashboard' : 'Cancelar y volver'}
        </button>

        <button
          type="button"
          disabled={submitting || validRowsCount === 0}
          onClick={handleSave}
          className="flex items-center gap-2 bg-accent text-[color:var(--on-accent)] px-6 py-2.5 rounded-control text-xs font-semibold hover:opacity-90 transition disabled:opacity-50 shadow-sm"
        >
          {submitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Guardando en el ledger...</span>
            </>
          ) : success ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>¡Consumos guardados!</span>
            </>
          ) : (
            <>
              <span>Guardar consumos ({validRowsCount})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      {/* Modal de Pegado Mágico */}
      <SmartPasteModal
        isOpen={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        onApply={handleApplyPasted}
        defaultCurrency={cardCurrency}
        categories={categories}
        people={people}
      />
    </div>
  )
}
