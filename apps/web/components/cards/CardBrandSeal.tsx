'use client'

import type { CardBrand } from '@/lib/credit-cards/analytics'

export function CardBrandSeal({
  brand,
  size = 'md'
}: {
  brand: CardBrand | null
  size?: 'sm' | 'md'
}) {
  const isSmall = size === 'sm'

  if (brand === 'VISA') {
    return (
      <div
        aria-label="Sello VISA"
        title="VISA"
        className={`inline-flex items-center justify-center rounded-control border border-accent/30 bg-accent/10 select-none ${
          isSmall ? 'px-2 py-0.5' : 'px-2.5 py-1'
        }`}
      >
        <span
          className={`font-display font-black italic tracking-wider text-accent leading-none ${
            isSmall ? 'text-xs' : 'text-sm'
          }`}
        >
          VISA
        </span>
      </div>
    )
  }

  if (brand === 'MASTERCARD') {
    return (
      <div
        aria-label="Sello Mastercard"
        title="Mastercard"
        className={`inline-flex items-center gap-1.5 rounded-control border border-border bg-surface-2 select-none ${
          isSmall ? 'px-2 py-0.5' : 'px-2.5 py-1'
        }`}
      >
        <svg
          width={isSmall ? 22 : 26}
          height={isSmall ? 14 : 16}
          viewBox="0 0 28 18"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="10" cy="9" r="7" fill="var(--expense)" fillOpacity="0.85" />
          <circle cx="18" cy="9" r="7" fill="var(--pending)" fillOpacity="0.85" />
        </svg>
        <span
          className={`font-display font-bold tracking-tight text-text-primary leading-none ${
            isSmall ? 'text-[10px]' : 'text-[11px]'
          }`}
        >
          Mastercard
        </span>
      </div>
    )
  }

  if (brand === 'MAESTRO') {
    return (
      <div
        aria-label="Sello Maestro"
        title="Maestro"
        className={`inline-flex items-center gap-1.5 rounded-control border border-border bg-surface-2 select-none ${
          isSmall ? 'px-2 py-0.5' : 'px-2.5 py-1'
        }`}
      >
        <svg
          width={isSmall ? 22 : 26}
          height={isSmall ? 14 : 16}
          viewBox="0 0 28 18"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="10" cy="9" r="7" fill="var(--expense)" fillOpacity="0.85" />
          <circle cx="18" cy="9" r="7" fill="var(--accent)" fillOpacity="0.85" />
        </svg>
        <span
          className={`font-display font-bold tracking-tight text-text-primary leading-none ${
            isSmall ? 'text-[10px]' : 'text-[11px]'
          }`}
        >
          Maestro
        </span>
      </div>
    )
  }

  if (brand === 'AMEX') {
    return (
      <div
        aria-label="Sello American Express"
        title="American Express"
        className={`inline-flex items-center justify-center rounded-control border border-accent/40 bg-accent/15 select-none ${
          isSmall ? 'px-2 py-0.5' : 'px-2.5 py-1'
        }`}
      >
        <span
          className={`font-display font-extrabold uppercase tracking-tighter text-accent leading-none ${
            isSmall ? 'text-[10px]' : 'text-xs'
          }`}
        >
          AMEX
        </span>
      </div>
    )
  }

  return (
    <div
      aria-label="Tarjeta de crédito"
      className={`inline-flex items-center justify-center rounded-control border border-border bg-surface-2 text-text-muted select-none ${
        isSmall ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'
      } font-medium`}
    >
      CRÉDITO
    </div>
  )
}

export function CardChipSvg() {
  return (
    <svg
      width="30"
      height="22"
      viewBox="0 0 30 22"
      fill="none"
      aria-hidden="true"
      className="shrink-0 opacity-85"
    >
      <rect
        x="0.75"
        y="0.75"
        width="28.5"
        height="20.5"
        rx="3.5"
        fill="var(--surface-2)"
        stroke="var(--pending)"
        strokeOpacity="0.65"
        strokeWidth="1.2"
      />
      <path
        d="M10 1V21M20 1V21M1 8H10M20 8H29M1 14H10M20 14H29"
        stroke="var(--pending)"
        strokeOpacity="0.5"
        strokeWidth="1"
      />
    </svg>
  )
}
