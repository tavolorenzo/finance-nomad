'use client'

import { useState, useMemo, useEffect } from 'react'
import { Sparkles, X, Check, FileText, AlertCircle, Trash2, Users } from 'lucide-react'
import { parseCreditCardStatement, type ParsedCardMovement } from '@/lib/parsers/card-statement-parser'
import { formatMoney } from '@/lib/currency'

interface SmartPasteModalProps {
  isOpen: boolean
  onClose: () => void
  onApply: (items: ParsedCardMovement[]) => void
  defaultCurrency: string
  categories: { id: string; name: string }[]
  people: { id: string; name: string }[]
}

const EXAMPLE_TEXT = `12/10/2026 COTO SUC 123 $ 14.500,00
15/10/2026 FRAVEGA S.A. C.04/12 $ 42.000,00
18/10/2026 UBER PENDING $ 3.420,00
20/10/2026 NETFLIX USD 10.99`

export function SmartPasteModal({
  isOpen,
  onClose,
  onApply,
  defaultCurrency,
  categories,
  people
}: SmartPasteModalProps) {
  const [rawText, setRawText] = useState('')

  const personalPerson = people.find((p) => p.name.trim().toLowerCase() === 'personal')
  const otherPeople = people.filter((p) => p.name.trim().toLowerCase() !== 'personal')
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(personalPerson?.id || null)

  useEffect(() => {
    if (!isOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  const parsedItems = useMemo(() => {
    if (!rawText.trim()) return []
    return parseCreditCardStatement(rawText, {
      defaultCurrency,
      defaultPersonId: selectedPersonId,
      categories,
      people
    })
  }, [rawText, defaultCurrency, selectedPersonId, categories, people])

  if (!isOpen) return null

  function handleApply() {
    if (parsedItems.length === 0) return
    onApply(parsedItems)
    setRawText('')
    onClose()
  }

  function handlePasteExample() {
    setRawText(EXAMPLE_TEXT)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-surface-0 border border-border rounded-card max-w-2xl w-full p-5 space-y-4 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-control bg-accent/10 text-accent">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-text-primary">
                Pegado Mágico de Resumen
              </h3>
              <p className="text-xs text-text-secondary">
                Pegá líneas de tu homebanking, resumen bancario o emails de compra.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text-primary p-1.5 rounded-control hover:bg-surface-1 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selector de Persona de Asignación */}
        {people.length > 0 && (
          <div className="flex items-center justify-between bg-surface-1/70 border border-border px-3 py-2 rounded-control text-xs">
            <span className="text-text-secondary flex items-center gap-1.5 font-medium">
              <Users className="w-3.5 h-3.5 text-accent" />
              <span>Asignar consumos a:</span>
            </span>
            <select
              value={selectedPersonId || personalPerson?.id || ''}
              onChange={(e) => setSelectedPersonId(e.target.value || personalPerson?.id || null)}
              className="bg-surface-0 border border-border rounded-control px-2.5 py-1 text-xs text-text-primary focus:border-accent outline-none font-medium"
            >
              <option value={personalPerson?.id || ''}>Personal (por defecto)</option>
              {otherPeople.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Text Area */}
        <div className="space-y-1.5 flex-1 flex flex-col min-h-[140px]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-secondary font-medium">Texto del resumen:</span>
            {!rawText && (
              <button
                type="button"
                onClick={handlePasteExample}
                className="text-accent hover:underline text-xs flex items-center gap-1"
              >
                <span>Cargar ejemplo</span>
              </button>
            )}
            {rawText && (
              <button
                type="button"
                onClick={() => setRawText('')}
                className="text-text-muted hover:text-expense text-xs flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Limpiar</span>
              </button>
            )}
          </div>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`Pegá acá el texto copiado de tu banco, por ejemplo:\n${EXAMPLE_TEXT}`}
            className="w-full h-32 bg-surface-1 border border-border rounded-control p-3 text-xs font-mono text-text-primary focus:border-accent outline-none resize-none leading-relaxed"
            autoFocus
          />
        </div>

        {/* Live Preview List */}
        <div className="border border-border rounded-control p-3 bg-surface-1/40 flex flex-col max-h-52 overflow-hidden">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/50 text-xs font-medium">
            <div className="flex items-center gap-1.5 text-text-primary">
              <FileText className="w-3.5 h-3.5 text-accent" />
              <span>
                Movimientos detectados: <strong>{parsedItems.length}</strong>
              </span>
            </div>
            {parsedItems.length > 0 && (
              <span className="text-xs text-text-muted">Revisá la vista previa antes de cargar</span>
            )}
          </div>

          <div className="overflow-y-auto space-y-1.5 pr-1 divide-y divide-border/30">
            {parsedItems.length === 0 ? (
              <p className="text-xs text-text-muted py-4 text-center italic">
                {rawText.trim()
                  ? 'No pudimos reconocer consumos válidos. Verificá que cada línea tenga fecha, comercio y monto.'
                  : 'Pegá texto arriba para ver el desglose en tiempo real.'}
              </p>
            ) : (
              parsedItems.map((item, idx) => {
                const catObj = categories.find((c) => c.id === item.categoryId)
                return (
                  <div
                    key={item.id || idx}
                    className="pt-1.5 flex items-center justify-between text-xs gap-3"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-text-muted text-[11px] shrink-0">
                        {item.date}
                      </span>
                      <span className="font-medium text-text-primary truncate">
                        {item.description}
                      </span>
                      {item.installmentTotal > 1 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-pending/10 text-pending shrink-0 border border-pending/20">
                          {item.installmentCurrent}/{item.installmentTotal}
                        </span>
                      )}
                      {catObj && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-surface-2 text-text-secondary shrink-0">
                          {catObj.name}
                        </span>
                      )}
                      {item.personId && item.personId !== personalPerson?.id && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-accent/15 text-accent font-medium shrink-0 border border-accent/20">
                          {people.find((p) => p.id === item.personId)?.name || 'Asignado'}
                        </span>
                      )}
                    </div>
                    <span className="font-mono tabular-nums font-semibold text-expense shrink-0">
                      {formatMoney(item.amount, item.currency)}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-control text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-1 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={parsedItems.length === 0}
            onClick={handleApply}
            className="flex items-center gap-2 bg-accent text-[color:var(--on-accent)] px-5 py-2 rounded-control text-xs font-semibold hover:opacity-90 transition disabled:opacity-40 shadow-sm"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Volcar a la grilla ({parsedItems.length})</span>
          </button>
        </div>
      </div>
    </div>
  )
}
