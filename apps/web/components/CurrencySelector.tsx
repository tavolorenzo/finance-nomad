'use client'

import { useState, useTransition } from 'react'
import { updateDisplayCurrency } from '@/app/(protected)/settings/actions'
import { useOptionalLedger } from '@/lib/ledger/ledger-context'
import { useOnlineStatus } from '@/lib/hooks/use-online-status'

const CURRENCIES = ['AUD', 'EUR', 'USD', 'UYU', 'NZD']

export function CurrencySelector({ current }: { current: string }) {
  const [value, setValue] = useState(current)
  const [isPending, startTransition] = useTransition()
  const ledger = useOptionalLedger()
  const isOnline = useOnlineStatus()

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
      {CURRENCIES.map((c) => (
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
