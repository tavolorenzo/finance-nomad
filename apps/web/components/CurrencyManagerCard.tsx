'use client'

import { useState, useTransition } from 'react'
import { Plus, Sparkles, Check, Trash2, X, Search, RefreshCw } from 'lucide-react'
import { updateActiveCurrencies } from '@/app/(protected)/settings/actions'
import { useOptionalLedger } from '@/lib/ledger/ledger-context'
import { useOnlineStatus } from '@/lib/hooks/use-online-status'
import { setCachedRate } from '@/lib/storage/fx-cache'
import {
  CURRENCY_CATALOG,
  searchCurrencies,
  getCurrencyInfo,
  type CurrencyCatalogItem
} from '@/lib/currency-catalog'
import type { ActiveCurrency } from '@/lib/types'

export function CurrencyManagerCard({
  initialCurrencies,
  displayCurrency
}: {
  initialCurrencies: ActiveCurrency[]
  displayCurrency: string
}) {
  const [currencies, setCurrencies] = useState<ActiveCurrency[]>(initialCurrencies)
  const [modalOpen, setModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingCode, setEditingCode] = useState<string | null>(null)
  const [editingRate, setEditingRate] = useState<string>('')
  const [isPending, startTransition] = useTransition()
  const ledger = useOptionalLedger()
  const isOnline = useOnlineStatus()

  function handleSaveCurrencies(updated: ActiveCurrency[]) {
    if (!isOnline) return
    setCurrencies(updated)
    startTransition(async () => {
      await updateActiveCurrencies(updated)
      // Guardar inmediatamente en caché local
      for (const c of updated) {
        if (c.code !== displayCurrency && c.rate_mode === 'manual' && c.custom_rate_against_global) {
          setCachedRate(displayCurrency, c.code, c.custom_rate_against_global, Date.now(), true)
        }
      }
      await ledger?.refresh().catch(() => {})
    })
  }

  function handleAddCurrency(item: CurrencyCatalogItem) {
    if (currencies.some((c) => c.code === item.code)) {
      setModalOpen(false)
      return
    }

    const newCurr: ActiveCurrency = {
      code: item.code,
      name: item.name,
      symbol: item.symbol,
      flag: item.flag,
      rate_mode: 'auto'
    }

    const updated = [...currencies, newCurr]
    handleSaveCurrencies(updated)
    setModalOpen(false)
    setSearchQuery('')
  }

  function handleRemoveCurrency(code: string) {
    if (code === displayCurrency) return
    const updated = currencies.filter((c) => c.code !== code)
    handleSaveCurrencies(updated)
  }

  function handleToggleMode(code: string) {
    const target = currencies.find((c) => c.code === code)
    if (!target) return

    if (target.rate_mode === 'auto') {
      // Iniciar edición manual
      setEditingCode(code)
      setEditingRate(target.custom_rate_against_global?.toString() ?? '')
    } else {
      // Restablecer a modo automático
      const updated = currencies.map((c) =>
        c.code === code
          ? { ...c, rate_mode: 'auto' as const, custom_rate_against_global: undefined }
          : c
      )
      handleSaveCurrencies(updated)
      setEditingCode(null)
    }
  }

  function handleConfirmRate(code: string) {
    const val = parseFloat(editingRate)
    if (isNaN(val) || val <= 0) return

    const updated = currencies.map((c) =>
      c.code === code
        ? { ...c, rate_mode: 'manual' as const, custom_rate_against_global: val }
        : c
    )

    handleSaveCurrencies(updated)
    setEditingCode(null)
  }

  return (
    <div className="bg-surface-1 border border-border rounded-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-text-secondary">Tus divisas y cotizaciones</p>
          <p className="text-xs text-text-muted mt-0.5">
            Gestioná qué monedas usás y definí cotizaciones directas contra tu moneda global ({displayCurrency}).
          </p>
        </div>
        <button
          type="button"
          disabled={!isOnline || isPending}
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-semibold bg-accent text-[color:var(--on-accent)] hover:opacity-90 transition disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Agregar divisa</span>
        </button>
      </div>

      <div className="space-y-2 divide-y divide-border/40">
        {currencies.map((c) => {
          const isGlobal = c.code === displayCurrency
          const isEditing = editingCode === c.code

          return (
            <div key={c.code} className="pt-2 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{c.flag ?? '🌐'}</span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-sm text-text-primary">{c.code}</span>
                    <span className="text-xs text-text-muted">({c.symbol})</span>
                    {isGlobal && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-accent/15 text-accent border border-accent/20">
                        Moneda global
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-text-secondary block">{c.name}</span>
                </div>
              </div>

              {!isGlobal && (
                <div className="flex items-center gap-2 text-xs">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 bg-surface-0 border border-border rounded-control p-1">
                      <span className="text-[11px] font-mono text-text-muted">1 {displayCurrency} =</span>
                      <input
                        type="number"
                        step="any"
                        value={editingRate}
                        onChange={(e) => setEditingRate(e.target.value)}
                        placeholder="Ej. 1280"
                        className="w-20 bg-surface-1 border border-border rounded-control px-1.5 py-0.5 font-mono text-xs text-text-primary focus:border-accent outline-none"
                        autoFocus
                      />
                      <span className="font-mono text-[11px] text-text-secondary">{c.code}</span>
                      <button
                        type="button"
                        onClick={() => handleConfirmRate(c.code)}
                        className="p-1 rounded-control bg-accent text-[color:var(--on-accent)] hover:opacity-90 transition"
                        title="Guardar cotización"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCode(null)}
                        className="p-1 rounded-control text-text-muted hover:text-text-primary hover:bg-surface-2 transition"
                        title="Cancelar"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-text-secondary">
                        {c.rate_mode === 'manual' && c.custom_rate_against_global
                          ? `1 ${displayCurrency} = ${c.custom_rate_against_global} ${c.code} (Manual)`
                          : 'Cotización en vivo (API)'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleMode(c.code)}
                        disabled={!isOnline || isPending}
                        className="text-xs text-accent hover:underline font-medium"
                      >
                        {c.rate_mode === 'manual' ? 'Usar oficial' : 'Ajustar manual'}
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleRemoveCurrency(c.code)}
                    disabled={!isOnline || isPending}
                    className="text-text-muted hover:text-expense p-1 transition"
                    title="Eliminar de tus divisas"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal de selección desde catálogo */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface-0 border border-border rounded-card max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-text-primary">Agregar divisa</h3>
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false)
                  setSearchQuery('')
                }}
                className="text-text-muted hover:text-text-primary p-1 rounded-control hover:bg-surface-1 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscá por nombre, código o país (ej. ARS, Real, Chile...)"
                className="w-full bg-surface-1 border border-border rounded-control pl-9 pr-3 py-2 text-xs text-text-primary focus:border-accent outline-none"
                autoFocus
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1 divide-y divide-border/40">
              {searchCurrencies(searchQuery).map((c) => {
                const isAlreadyActive = currencies.some((ac) => ac.code === c.code)
                return (
                  <button
                    key={c.code}
                    type="button"
                    disabled={isAlreadyActive}
                    onClick={() => handleAddCurrency(c)}
                    className="w-full text-left px-3 py-2 hover:bg-surface-1 rounded-control transition flex items-center justify-between text-xs disabled:opacity-40"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{c.flag}</span>
                      <div>
                        <span className="font-mono font-bold text-text-primary">{c.code}</span>
                        <span className="text-text-secondary ml-1.5">{c.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-text-muted">
                      <span>({c.symbol})</span>
                      {isAlreadyActive && <span className="text-[10px] text-accent font-sans font-semibold">Agregada</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
