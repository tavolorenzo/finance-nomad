'use client'

import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface PaginationControlProps {
  currentPage: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  itemLabel?: string
  className?: string
}

export function PaginationControl({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  itemLabel = 'movimientos',
  className = ''
}: PaginationControlProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  if (totalItems <= pageSize) {
    return null
  }

  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 text-xs text-text-secondary border-t border-border ${className}`}
      aria-label="Paginación de resultados"
    >
      <div className="text-text-muted">
        Mostrando <span className="font-mono tabular-nums font-semibold text-text-primary">{startItem}</span> a{' '}
        <span className="font-mono tabular-nums font-semibold text-text-primary">{endItem}</span> de{' '}
        <span className="font-mono tabular-nums font-semibold text-text-primary">{totalItems}</span> {itemLabel}
      </div>

      <div className="flex items-center gap-1.5 self-center sm:self-auto">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Página anterior"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-control border border-border bg-surface-1 text-text-secondary hover:text-text-primary hover:bg-surface-2 transition disabled:opacity-40 disabled:pointer-events-none"
        >
          <ChevronLeft size={14} />
          <span>Anterior</span>
        </button>

        {/* Números de página */}
        <div className="flex items-center gap-1 px-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
            const isNear = Math.abs(page - currentPage) <= 1
            const isFirst = page === 1
            const isLast = page === totalPages

            if (!isNear && !isFirst && !isLast) {
              if (page === currentPage - 2 || page === currentPage + 2) {
                return (
                  <span key={page} className="px-1 text-text-muted" aria-hidden="true">
                    …
                  </span>
                )
              }
              return null
            }

            const isActive = page === currentPage
            return (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={`Página ${page}`}
                className={`min-w-[28px] h-7 px-1.5 rounded-control font-mono tabular-nums font-medium transition text-xs flex items-center justify-center ${
                  isActive
                    ? 'bg-accent text-[color:var(--on-accent)] font-bold shadow-xs'
                    : 'border border-border bg-surface-1 text-text-secondary hover:text-text-primary hover:bg-surface-2'
                }`}
              >
                {page}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Página siguiente"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-control border border-border bg-surface-1 text-text-secondary hover:text-text-primary hover:bg-surface-2 transition disabled:opacity-40 disabled:pointer-events-none"
        >
          <span>Siguiente</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

