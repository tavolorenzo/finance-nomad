'use client'

import { Trash2 } from 'lucide-react'
import { QuotaBadgeSelector } from './QuotaBadgeSelector'
import { suggestCategory } from '@/lib/parsers/card-statement-parser'
import { calculateAccountingPeriod, formatAccountingPeriodLabel } from '@/lib/ledger/builder'

export interface BulkRowItem {
  id: string
  date: string
  accountingPeriod: string
  description: string
  amount: string
  currency: string
  installmentCurrent: number
  installmentTotal: number
  categoryId: string | null
  personId: string | null
  isRefund?: boolean
}

interface BulkMovementRowProps {
  item: BulkRowItem
  index: number
  currentPeriod: string
  categories: { id: string; name: string }[]
  people: { id: string; name: string }[]
  availableCurrencies: string[]
  onChange: (id: string, field: keyof BulkRowItem, value: any) => void
  onDelete: (id: string) => void
  onAddRowAfter?: () => void
  onRequestCreateCategory?: (rowId: string) => void
}

export function BulkMovementRow({
  item,
  currentPeriod,
  categories,
  people,
  availableCurrencies,
  onChange,
  onDelete,
  onAddRowAfter,
  onRequestCreateCategory
}: BulkMovementRowProps) {
  const personalPerson = people.find((p) => p.name.trim().toLowerCase() === 'personal')
  const otherPeople = people.filter((p) => p.name.trim().toLowerCase() !== 'personal')
  const isAssignedToOther = Boolean(item.personId && item.personId !== personalPerson?.id)
  const assignedPersonName = otherPeople.find((p) => p.id === item.personId)?.name
  const parsedAmount = parseFloat(item.amount)
  const isRefundRow = Boolean(item.isRefund || (!isNaN(parsedAmount) && parsedAmount < 0))

  const prevMonthPeriod = calculateAccountingPeriod(currentPeriod, -1)
  const nextMonthPeriod = calculateAccountingPeriod(currentPeriod, 1)
  const periodOptions = Array.from(
    new Set([prevMonthPeriod, currentPeriod, nextMonthPeriod, item.accountingPeriod].filter(Boolean))
  )

  function handleDescriptionChange(val: string) {
    onChange(item.id, 'description', val)
    // Si todavía no tiene categoría asignada manualmente, intentamos auto-sugerir
    if (!item.categoryId && val.length >= 3) {
      const suggestion = suggestCategory(val, categories)
      if (suggestion.id) {
        onChange(item.id, 'categoryId', suggestion.id)
      }
    }
  }

  function handleAmountKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      onAddRowAfter?.()
    }
  }

  return (
    <tr
      className={`transition group border-b ${isRefundRow
          ? 'bg-pending/10 hover:bg-pending/15 border-pending/30'
          : 'hover:bg-surface-1/40 border-border/60'
        }`}
    >
      {/* 1. Fecha */}
      <td className="p-2 w-32">
        <input
          type="date"
          value={item.date}
          onChange={(e) => onChange(item.id, 'date', e.target.value)}
          className="w-full bg-surface-0 border border-border rounded-control px-2 py-1 text-xs font-mono text-text-primary focus:border-accent outline-none"
        />
      </td>

      {/* 2. Mes contable */}
      <td className="p-2 w-36">
        <select
          aria-label="Mes contable"
          value={item.accountingPeriod || currentPeriod}
          onChange={(e) => onChange(item.id, 'accountingPeriod', e.target.value)}
          className="w-full bg-surface-0 border border-border rounded-control px-2 py-1 text-xs font-medium text-text-primary focus:border-accent outline-none"
          title="Mes contable del estado de cuenta al que se asigna este movimiento"
        >
          {periodOptions.map((p) => (
            <option key={p} value={p}>
              {formatAccountingPeriodLabel(p)}
              {p === currentPeriod ? ' (Actual)' : p === nextMonthPeriod ? ' (Próx.)' : ''}
            </option>
          ))}
        </select>
      </td>

      {/* 3. Descripción */}
      <td className="p-2 min-w-[180px]">
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={item.description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder="Comercio / Detalle"
            className="w-full bg-surface-0 border border-border rounded-control px-2.5 py-1 text-xs text-text-primary focus:border-accent outline-none placeholder:text-text-muted/60"
          />
          {isRefundRow && (
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-pending/20 text-pending border border-pending/30 shrink-0"
              title="Monto negativo detectado: posible pago de tarjeta o reintegro (refund)"
            >
              Pago / Refund
            </span>
          )}
        </div>
      </td>

      {/* 3. Cuotas */}
      <td className="p-2 w-28 text-center">
        <QuotaBadgeSelector
          current={item.installmentCurrent}
          total={item.installmentTotal}
          onChange={(c, t) => {
            onChange(item.id, 'installmentCurrent', c)
            onChange(item.id, 'installmentTotal', t)
          }}
        />
      </td>

      {/* 4. Categoría */}
      <td className="p-2 w-44">
        <select
          value={item.categoryId || ''}
          onChange={(e) => {
            if (e.target.value === '__CREATE_CATEGORY__') {
              onRequestCreateCategory?.(item.id)
              return
            }
            onChange(item.id, 'categoryId', e.target.value || null)
          }}
          className="w-full bg-surface-0 border border-border rounded-control px-2 py-1 text-xs text-text-secondary focus:border-accent outline-none"
        >
          <option value="">Sin categoría</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          {onRequestCreateCategory && (
            <option value="__CREATE_CATEGORY__">+ Crear categoría...</option>
          )}
        </select>
      </td>

      {/* 5. Persona */}
      <td className="p-2 w-36">
        <select
          value={item.personId || personalPerson?.id || ''}
          onChange={(e) => {
            const val = e.target.value
            onChange(item.id, 'personId', val || personalPerson?.id || null)
          }}
          className={`w-full border rounded-control px-2 py-1 text-xs outline-none transition ${isAssignedToOther
              ? 'bg-accent/10 border-accent/40 text-accent font-semibold'
              : 'bg-surface-0 border border-border text-text-secondary focus:border-accent'
            }`}
          title={isAssignedToOther ? `Gasto asignado a ${assignedPersonName} (Split Pay)` : 'Gasto personal'}
        >
          <option value={personalPerson?.id || ''}>Personal</option>
          {otherPeople.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </td>

      {/* 6. Divisa */}
      <td className="p-2 w-24">
        <select
          value={item.currency}
          onChange={(e) => onChange(item.id, 'currency', e.target.value)}
          className="w-full bg-surface-0 border border-border rounded-control px-1.5 py-1 text-xs font-mono font-medium text-text-primary focus:border-accent outline-none"
        >
          {availableCurrencies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </td>

      {/* 7. Monto */}
      <td className="p-2 w-32">
        <input
          type="number"
          step="0.01"
          value={item.amount}
          onChange={(e) => {
            const val = e.target.value
            onChange(item.id, 'amount', val)
            const num = parseFloat(val)
            if (!isNaN(num)) {
              onChange(item.id, 'isRefund', num < 0 ? true : item.isRefund && num >= 0 ? item.isRefund : false)
            }
          }}
          onKeyDown={handleAmountKeyDown}
          placeholder="0.00"
          className={`w-full bg-surface-0 border rounded-control px-2 py-1 text-xs font-mono tabular-nums text-right focus:border-accent outline-none font-semibold ${isRefundRow
              ? 'border-pending/50 text-income'
              : 'border-border text-text-primary'
            }`}
        />
      </td>

      {/* 8. Acción Eliminar */}
      <td className="p-2 w-10 text-center">
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="text-text-muted hover:text-expense p-1 rounded-control hover:bg-surface-2 transition"
          title="Eliminar fila"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  )
}
