'use client'

import { useState, useTransition } from 'react'
import { updateDisplayCurrency } from '@/app/(protected)/settings/actions'
import { useOptionalLedger } from '@/lib/ledger/ledger-context'
import { useOnlineStatus } from '@/lib/hooks/use-online-status'

const BASE_CURRENCIES = ['AUD', 'EUR', 'USD', 'UYU', 'NZD', 'ARS']

export function CurrencySelector({ current, options }: { current: string; options?: string[] }) {
  const [value, setValue] = useState(current)
  const [isPending, startTransition] = useTransition()
  const ledger = useOptionalLedger()
  const isOnline = useOnlineStatus()

  const currencyList = Array.from(
    new Set([
      ...(options ?? ledger?.settings?.active_currencies?.map((c) => c.code) ?? BASE_CURRENCIES),
      current,
      ...BASE_CURRENCIES
    ])
  ).filter(Boolean)

  function handleChange(next: string) {
    if (!isOnline) return
    setValue(next)
    startTransition(async () => {
      await updateDisplayCurrency(next)
      await ledger?.refresh().catch(() => {})
    })
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {currencyList.map((c) => (
        <button
          key={c}
          onClick={() => handleChange(c)}
          disabled={isPending || !isOnline}
          title={!isOnline ? 'Conectate a internet para cambiar la divisa' : undefined}
          className={`text-sm px-3 py-1.5 rounded-full ${
            value === c ? 'bg-accent/15 text-accent' : 'border border-border text-text-secondary'
          } disabled:opacity-50`}
        >
          {c}
        </button>
      ))}
    </div>
  )
}
