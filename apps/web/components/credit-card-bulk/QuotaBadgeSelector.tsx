'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronDown, Check } from 'lucide-react'

interface QuotaBadgeSelectorProps {
  current: number
  total: number
  onChange: (current: number, total: number) => void
}

const PRESETS = [
  { label: '1 pago', current: 1, total: 1 },
  { label: '3 cuotas', current: 1, total: 3 },
  { label: '6 cuotas', current: 1, total: 6 },
  { label: '12 cuotas', current: 1, total: 12 },
  { label: '18 cuotas', current: 1, total: 18 }
]

export function QuotaBadgeSelector({ current, total, onChange }: QuotaBadgeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [customCurrent, setCustomCurrent] = useState(String(current))
  const [customTotal, setCustomTotal] = useState(String(total))
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setCustomCurrent(String(current))
    setCustomTotal(String(total))
  }, [current, total])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  function handleSelectPreset(c: number, t: number) {
    onChange(c, t)
    setIsOpen(false)
  }

  function handleCustomApply(e: React.FormEvent) {
    e.preventDefault()
    const c = Math.max(1, parseInt(customCurrent, 10) || 1)
    const t = Math.max(c, parseInt(customTotal, 10) || c)
    onChange(c, t)
    setIsOpen(false)
  }

  const isMulti = total > 1

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-control text-xs font-mono font-medium border transition ${
          isMulti
            ? 'bg-pending/10 text-pending border-pending/30 hover:bg-pending/20'
            : 'bg-surface-1 text-text-secondary border-border hover:bg-surface-2 hover:text-text-primary'
        }`}
        title="Configurar cuotas"
      >
        <Calendar className="w-3 h-3 opacity-70" />
        <span>{isMulti ? `${current}/${total}` : '1 pago'}</span>
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-30 w-56 bg-surface-0 border border-border rounded-card p-3 shadow-xl space-y-2.5">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
            Plan de cuotas
          </p>

          <div className="grid grid-cols-2 gap-1.5">
            {PRESETS.map((p) => {
              const selected = p.current === current && p.total === total
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handleSelectPreset(p.current, p.total)}
                  className={`text-xs px-2 py-1.5 rounded-control text-left flex items-center justify-between border transition ${
                    selected
                      ? 'bg-accent/10 text-accent border-accent/40 font-semibold'
                      : 'bg-surface-1 text-text-secondary border-border hover:bg-surface-2 hover:text-text-primary'
                  }`}
                >
                  <span>{p.label}</span>
                  {selected && <Check className="w-3 h-3" />}
                </button>
              )
            })}
          </div>

          <div className="pt-2 border-t border-border/60">
            <p className="text-[11px] text-text-secondary mb-1.5">
              O definí cuota actual y total:
            </p>
            <form onSubmit={handleCustomApply} className="flex items-center gap-1.5">
              <input
                type="number"
                min="1"
                max="99"
                value={customCurrent}
                onChange={(e) => setCustomCurrent(e.target.value)}
                placeholder="4"
                className="w-14 bg-surface-1 border border-border rounded-control px-2 py-1 text-xs font-mono text-center text-text-primary focus:border-accent outline-none"
              />
              <span className="text-xs text-text-muted">de</span>
              <input
                type="number"
                min="1"
                max="99"
                value={customTotal}
                onChange={(e) => setCustomTotal(e.target.value)}
                placeholder="12"
                className="w-14 bg-surface-1 border border-border rounded-control px-2 py-1 text-xs font-mono text-center text-text-primary focus:border-accent outline-none"
              />
              <button
                type="submit"
                className="flex-1 bg-surface-2 hover:bg-accent hover:text-[color:var(--on-accent)] text-text-primary px-2 py-1 rounded-control text-xs font-medium border border-border transition"
              >
                OK
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
