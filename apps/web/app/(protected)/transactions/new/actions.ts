'use server'

import { createClient } from '@/lib/supabase/server'
import { calculateAccountAmount, splitInstallments } from '@/lib/fx'
import { redirect } from 'next/navigation'

export interface NewTransactionInput {
  type: 'INCOME' | 'OUTCOME'
  amountOriginal: number
  currencyOriginal: string
  feeAmount: number
  exchangeRate: number
  rateOverridden: boolean
  currencyAccount: string
  date: string
  institutionId: string
  accountId: string
  categoryId: string | null
  personId: string | null
  installmentTotal: number
  notes: string | null
}

export async function createTransaction(input: NewTransactionInput) {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No hay sesión activa')

  const totalAccountAmount = calculateAccountAmount(
    input.amountOriginal,
    input.feeAmount,
    input.exchangeRate
  )

  const installmentTotal = Math.max(1, input.installmentTotal)
  const amounts =
    installmentTotal === 1
      ? [totalAccountAmount]
      : splitInstallments(totalAccountAmount, installmentTotal)

  const rows = amounts.map((amount, i) => {
    const installmentDate = new Date(input.date)
    installmentDate.setMonth(installmentDate.getMonth() + i)

    return {
      user_id: user.id,
      date: installmentDate.toISOString().slice(0, 10),
      type: input.type,
      amount_original: installmentTotal === 1 ? input.amountOriginal : amount,
      currency_original: input.currencyOriginal,
      fee_amount: i === 0 ? input.feeAmount : 0,
      exchange_rate: input.exchangeRate,
      rate_overridden: input.rateOverridden,
      amount_account: amount,
      currency_account: input.currencyAccount,
      institution_id: input.institutionId,
      account_id: input.accountId,
      category_id: input.categoryId,
      person_id: input.personId,
      installment_current: i + 1,
      installment_total: installmentTotal,
      status: 'COMPLETED' as const,
      notes: input.notes
    }
  })

  // Un solo INSERT con todas las filas -> una sola sentencia SQL, atómica.
  const { error } = await supabase.from('master_transactions').insert(rows)
  if (error) throw new Error(error.message)

  redirect('/dashboard')
}
