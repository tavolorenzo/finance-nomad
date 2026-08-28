'use client'

import { useState, useTransition } from 'react'
import { updateDisplayCurrency } from '@/app/(protected)/settings/actions'

const CURRENCIES = ['AUD', 'EUR', 'USD', 'UYU', 'NZD']

export function CurrencySelector({ current }: { current: string }) {
  const [value, setValue] = useState(current)
  const [isPending, startTransition] = useTransition()

  function handleChange(next: string) {
    setValue(next)
    startTransition(() => updateDisplayCurrency(next))
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {CURRENCIES.map((c) => (
        <button
          key={c}
          onClick={() => handleChange(c)}
          disabled={isPending}
          className={`text-sm px-3 py-1.5 rounded-full ${
            value === c ? 'bg-accent/15 text-accent' : 'border border-border text-text-secondary'
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  )
}
