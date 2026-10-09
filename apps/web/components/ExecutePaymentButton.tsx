'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { rethrowIfRedirect } from '@/lib/next/rethrow-redirect'
import { executeBudgetPayment } from '@/app/(protected)/budget/actions'
import { useOptionalLedger } from '@/lib/ledger/ledger-context'

export interface EstimateSummary {
  id: string
  name: string
  type: string
  estimated_amount: number
  currency: string
  preferred_account_id: string | null
  category_id: string | null
}

export function ExecutePaymentButton({
  estimateId,
  estimate,
  disabled
}: {
  estimateId: string
  estimate?: EstimateSummary
  disabled: boolean
}) {
  const router = useRouter()
  const ledger = useOptionalLedger()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      if (ledger && estimate && estimate.preferred_account_id) {
        const targetAccount = ledger.accounts.find((a) => a.id === estimate.preferred_account_id)
        if (!targetAccount) {
          throw new Error('Cuenta preferida no encontrada en tus cuentas activas.')
        }
        await ledger.addTransaction({
          type: estimate.type === 'INCOME_ESTIMATE' ? 'INCOME' : 'OUTCOME',
          amountOriginal: estimate.estimated_amount,
          currencyOriginal: estimate.currency,
          feeAmount: 0,
          exchangeRate: 1,
          rateOverridden: false,
          amountAccount: estimate.estimated_amount,
          currencyAccount: targetAccount.currency_native,
          date: new Date().toISOString().slice(0, 10),
          institutionId: targetAccount.institution_id,
          accountId: targetAccount.id,
          categoryId: estimate.category_id,
          personId: null,
          installmentTotal: 1,
          notes: estimate.name
        })
      } else {
        await executeBudgetPayment(estimateId)
        await ledger?.refresh().catch(() => {})
      }
      router.refresh()
    } catch (err) {
      rethrowIfRedirect(err)
      setError(err instanceof Error ? err.message : 'No se pudo ejecutar el pago')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={disabled || loading}
        className="text-xs bg-accent text-[color:var(--on-accent)] px-3 py-1.5 rounded-control font-medium disabled:opacity-40"
      >
        {loading ? 'Ejecutando...' : disabled ? 'Ya ejecutado' : 'Ejecutar pago'}
      </button>
      {error && <p className="text-xs text-expense mt-1">{error}</p>}
    </div>
  )
}