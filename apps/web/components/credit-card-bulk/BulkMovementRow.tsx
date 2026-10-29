'use client'

import { Trash2, Sparkles } from 'lucide-react'
import { QuotaBadgeSelector } from './QuotaBadgeSelector'
import { suggestCategory } from '@/lib/parsers/card-statement-parser'

export interface BulkRowItem {
  id: string
  date: string
  description: string
  amount: string
  currency: string
  installmentCurrent: number
  installmentTotal: number
  categoryId: string | null
  personId: string | null
}

interface BulkMovementRowProps {
  item: BulkRowItem
  index: number
  categories: { id: string; name: string }[]
  people: { id: string; name: string }[]
  availableCurrencies: string[]
  onChange: (id: string, field: keyof BulkRowItem, value: any) => void
  onDelete: (id: string) => void
  onAddRowAfter?: () => void
}

export function BulkMovementRow({
  item,
  index,
  categories,
  people,
  availableCurrencies,
  onChange,
  onDelete,
  onAddRowAfter
}: BulkMovementRowProps) {
  const personalPerson = people.find((p) => p.name.trim().toLowerCase() === 'personal')
  const otherPeople = people.filter((p) => p.name.trim().toLowerCase() !== 'personal')
  const isAssignedToOther = Boolean(item.personId && item.personId !== personalPerson?.id)
  const assignedPersonName = otherPeople.find((p) => p.id === item.personId)?.name

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
    <tr className="hover:bg-surface-1/40 transition group border-b border-border/60">
      {/* 1. Fecha */}
      <td className="p-2 w-32">
        <input
          type="date"
          value={item.date}
          onChange={(e) => onChange(item.id, 'date', e.target.value)}
          className="w-full bg-surface-0 border border-border rounded-control px-2 py-1 text-xs font-mono text-text-primary focus:border-accent outline-none"
        />
      </td>

      {/* 2. Descripción */}
      <td className="p-2 min-w-[180px]">
        <input
          type="text"
          value={item.description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          placeholder="Comercio / Detalle"
          className="w-full bg-surface-0 border border-border rounded-control px-2.5 py-1 text-xs text-text-primary focus:border-accent outline-none placeholder:text-text-muted/60"
        />
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
          onChange={(e) => onChange(item.id, 'categoryId', e.target.value || null)}
          className="w-full bg-surface-0 border border-border rounded-control px-2 py-1 text-xs text-text-secondary focus:border-accent outline-none"
        >
          <option value="">Sin categoría</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
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
          className={`w-full border rounded-control px-2 py-1 text-xs outline-none transition ${
            isAssignedToOther
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
          min="0"
          value={item.amount}
          onChange={(e) => onChange(item.id, 'amount', e.target.value)}
          onKeyDown={handleAmountKeyDown}
          placeholder="0.00"
          className="w-full bg-surface-0 border border-border rounded-control px-2 py-1 text-xs font-mono tabular-nums text-right text-text-primary focus:border-accent outline-none font-semibold"
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
