'use client'

import { useState, useMemo, useEffect } from 'react'
import { Sparkles, X, Check, FileText, AlertCircle, Trash2, Users, Coins } from 'lucide-react'
import { parseCreditCardStatement, type ParsedCardMovement } from '@/lib/parsers/card-statement-parser'
import { formatMoney } from '@/lib/currency'

interface SmartPasteModalProps {
  isOpen: boolean
  onClose: () => void
  onApply: (items: ParsedCardMovement[]) => void
  defaultCurrency: string
  availableCurrencies?: string[]
  categories: { id: string; name: string }[]
  people: { id: string; name: string }[]
}

const EXAMPLE_TEXT = `12/10/2026 COTO SUC 123 $ 14.500,00
10/11/25 5029 NICO RENT A CAR 12/12 USD 137,38
27/08/26 5045 SUPERMERCADOS EL DOR 2/ 3 UYU 1263,87
20/10/26 5029 REINTEGRO PROMO -2.500,00`

export function SmartPasteModal({
  isOpen,
  onClose,
  onApply,
  defaultCurrency,
  availableCurrencies,
  categories,
  people
}: SmartPasteModalProps) {
  const [rawText, setRawText] = useState('')
  const [currencyOverride, setCurrencyOverride] = useState<string>('')

  const currencyOptions = useMemo(() => {
    const base = availableCurrencies && availableCurrencies.length > 0
      ? availableCurrencies
      : [defaultCurrency, 'UYU', 'USD', 'EUR', 'ARS', 'AUD', 'NZD']
    return Array.from(new Set([defaultCurrency, ...base])).filter(Boolean)
  }, [availableCurrencies, defaultCurrency])

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
      defaultCurrency: currencyOverride || defaultCurrency,
      forceCurrency: currencyOverride || null,
      defaultPersonId: selectedPersonId,
      categories,
      people
    })
  }, [rawText, defaultCurrency, currencyOverride, selectedPersonId, categories, people])

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

        {/* Selectores de Moneda y Persona de Asignación en dos filas */}
        <div className="flex flex-col gap-2 bg-surface-1/70 border border-border p-3 rounded-control text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label
              htmlFor="smart-paste-currency"
              className="text-text-secondary flex items-center gap-1.5 font-medium shrink-0"
            >
              <Coins className="w-3.5 h-3.5 text-accent shrink-0" />
              <span>Moneda a importar:</span>
            </label>
            <select
              id="smart-paste-currency"
              value={currencyOverride}
              onChange={(e) => setCurrencyOverride(e.target.value)}
              className="h-9 sm:w-72 bg-surface-0 border border-border rounded-control px-2.5 text-xs text-text-primary focus:border-accent outline-none font-medium"
            >
              <option value="">Automática ({defaultCurrency} por defecto)</option>
              {currencyOptions.map((c) => (
                <option key={c} value={c}>
                  Asignar {c} a todas las filas
                </option>
              ))}
            </select>
          </div>

          {people.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-border/60">
              <label
                htmlFor="smart-paste-person"
                className="text-text-secondary flex items-center gap-1.5 font-medium shrink-0"
              >
                <Users className="w-3.5 h-3.5 text-accent shrink-0" />
                <span>Persona a asignar:</span>
              </label>
              <select
                id="smart-paste-person"
                value={selectedPersonId || personalPerson?.id || ''}
                onChange={(e) => setSelectedPersonId(e.target.value || personalPerson?.id || null)}
                className="h-9 sm:w-72 bg-surface-0 border border-border rounded-control px-2.5 text-xs text-text-primary focus:border-accent outline-none font-medium"
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
        </div>

        {/* Leyenda de recordatorio de verificación */}
        <div className="flex items-start gap-2 bg-pending/10 border border-pending/30 rounded-control px-3 py-2 text-xs text-pending">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="leading-snug">
            <strong>Recordá verificar las filas antes de confirmar:</strong> el detector automático puede cometer errores al interpretar fechas, números de tarjeta, cuotas, monedas o montos.
          </p>
        </div>

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
                    className={`pt-1.5 flex items-center justify-between text-xs gap-3 ${
                      item.isRefund
                        ? 'bg-pending/10 px-2 py-1.5 rounded-control border border-pending/30'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-text-muted text-[11px] shrink-0">
                        {item.date}
                      </span>
                      <span className="font-medium text-text-primary truncate">
                        {item.description}
                      </span>
                      {item.isRefund && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-pending/20 text-pending shrink-0 border border-pending/30">
                          Pago / Refund
                        </span>
                      )}
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
                    <span
                      className={`font-mono tabular-nums font-semibold amount shrink-0 ${
                        item.isRefund ? 'text-income' : 'text-expense'
                      }`}
                    >
                      {item.isRefund ? '-' : ''}
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
