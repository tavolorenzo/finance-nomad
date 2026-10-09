import { describe, it, expect } from 'vitest'
import {
  calculateRowDelta,
  applyBundleDelta,
  calculatePendingDelta,
  applyDeletionDelta,
  applyConfirmationDelta
} from './balance'
import { buildTransactionBundle, buildTransferBundle } from './builder'
import type { AccountBalance } from './types'

describe('calculateRowDelta', () => {
  it('returns negative value for COMPLETED OUTCOME', () => {
    const delta = calculateRowDelta({
      id: '1',
      parent_transaction_id: null,
      date: '2026-10-09',
      type: 'OUTCOME',
      amount_original: 50,
      currency_original: 'EUR',
      fee_amount: 0,
      exchange_rate: 1,
      rate_overridden: false,
      amount_account: 50,
      currency_account: 'EUR',
      institution_id: 'inst-1',
      account_id: 'acc-1',
      category_id: null,
      person_id: null,
      installment_current: 1,
      installment_total: 1,
      status: 'COMPLETED',
      notes: null,
      settled_at: null
    })
    expect(delta).toBe(-50)
  })

  it('returns positive value for COMPLETED INCOME', () => {
    const delta = calculateRowDelta({
      id: '1',
      parent_transaction_id: null,
      date: '2026-10-09',
      type: 'INCOME',
      amount_original: 120,
      currency_original: 'EUR',
      fee_amount: 0,
      exchange_rate: 1,
      rate_overridden: false,
      amount_account: 120,
      currency_account: 'EUR',
      institution_id: 'inst-1',
      account_id: 'acc-1',
      category_id: null,
      person_id: null,
      installment_current: 1,
      installment_total: 1,
      status: 'COMPLETED',
      notes: null,
      settled_at: null
    })
    expect(delta).toBe(120)
  })

  it('returns 0 for PENDING rows', () => {
    const delta = calculateRowDelta({
      id: '1',
      parent_transaction_id: null,
      date: '2026-11-09',
      type: 'OUTCOME',
      amount_original: 50,
      currency_original: 'EUR',
      fee_amount: 0,
      exchange_rate: 1,
      rate_overridden: false,
      amount_account: 50,
      currency_account: 'EUR',
      institution_id: 'inst-1',
      account_id: 'acc-1',
      category_id: null,
      person_id: null,
      installment_current: 2,
      installment_total: 3,
      status: 'PENDING',
      notes: null,
      settled_at: null
    })
    expect(delta).toBe(0)
  })
})

describe('applyBundleDelta', () => {
  const initialBalances: AccountBalance[] = [
    { accountId: 'acc-1', currency: 'EUR', balance: 1000 },
    { accountId: 'acc-2', currency: 'USD', balance: 500 }
  ]

  it('applies simple outcome to balance', () => {
    const bundle = buildTransactionBundle({
      type: 'OUTCOME',
      amountOriginal: 50,
      currencyOriginal: 'EUR',
      currencyAccount: 'EUR',
      date: '2026-10-09',
      institutionId: 'inst-1',
      accountId: 'acc-1',
      installmentTotal: 1,
      today: '2026-10-09'
    })

    const updated = applyBundleDelta(initialBalances, bundle)
    const acc1 = updated.find((b) => b.accountId === 'acc-1')
    expect(acc1?.balance).toBe(950)
  })

  it('only impacts cuota 1 on N-installment purchase', () => {
    const bundle = buildTransactionBundle({
      type: 'OUTCOME',
      amountOriginal: 300,
      currencyOriginal: 'EUR',
      currencyAccount: 'EUR',
      date: '2026-10-09',
      institutionId: 'inst-1',
      accountId: 'acc-1',
      installmentTotal: 3,
      today: '2026-10-09'
    })

    const updated = applyBundleDelta(initialBalances, bundle)
    const acc1 = updated.find((b) => b.accountId === 'acc-1')
    // Descuenta 100 EUR ahora, las otras 2 cuotas son PENDING
    expect(acc1?.balance).toBe(900)

    const pending = calculatePendingDelta(bundle, 'acc-1')
    expect(pending).toBe(200)
  })

  it('applies transfer debit and credit across both accounts', () => {
    const fromAccount = {
      id: 'acc-1',
      name: 'Account EUR',
      currency_native: 'EUR',
      institution_id: 'inst-1'
    }
    const toAccount = {
      id: 'acc-2',
      name: 'Account USD',
      currency_native: 'USD',
      institution_id: 'inst-2'
    }

    const bundle = buildTransferBundle({
      fromAccount,
      toAccount,
      amountOriginal: 100,
      currencyOriginal: 'EUR',
      feeAmount: 0,
      exchangeRate: 1.1,
      date: '2026-10-09'
    })

    const updated = applyBundleDelta(initialBalances, bundle)
    const acc1 = updated.find((b) => b.accountId === 'acc-1')
    const acc2 = updated.find((b) => b.accountId === 'acc-2')

    // acc1: 1000 - 100 = 900
    expect(acc1?.balance).toBe(900)
    // acc2: 500 + 110 = 610
    expect(acc2?.balance).toBe(610)
  })

  it('applies signed ADJUSTMENT delta correctly (increases or decreases balance)', () => {
    // Caso 1: Delta negativo (-150)
    const negBundle = buildTransactionBundle({
      type: 'ADJUSTMENT',
      amountOriginal: -150,
      currencyOriginal: 'EUR',
      currencyAccount: 'EUR',
      amountAccount: -150,
      date: '2026-10-09',
      institutionId: 'inst-1',
      accountId: 'acc-1',
      installmentTotal: 1,
      today: '2026-10-09'
    })

    const afterNeg = applyBundleDelta(initialBalances, negBundle)
    expect(afterNeg.find((b) => b.accountId === 'acc-1')?.balance).toBe(850)

    // Caso 2: Delta positivo (+200)
    const posBundle = buildTransactionBundle({
      type: 'ADJUSTMENT',
      amountOriginal: 200,
      currencyOriginal: 'USD',
      currencyAccount: 'USD',
      amountAccount: 200,
      date: '2026-10-09',
      institutionId: 'inst-2',
      accountId: 'acc-2',
      installmentTotal: 1,
      today: '2026-10-09'
    })

    const afterPos = applyBundleDelta(initialBalances, posBundle)
    expect(afterPos.find((b) => b.accountId === 'acc-2')?.balance).toBe(700)
  })
})

describe('applyDeletionDelta', () => {
  const initialBalances: AccountBalance[] = [
    { accountId: 'acc-1', currency: 'EUR', balance: 950 },
    { accountId: 'acc-2', currency: 'USD', balance: 610 }
  ]

  it('restores balance when deleting an OUTCOME', () => {
    const deletedRow = {
      id: 'tx-1',
      parent_transaction_id: null,
      date: '2026-10-09',
      type: 'OUTCOME' as const,
      amount_original: 50,
      currency_original: 'EUR',
      fee_amount: 0,
      exchange_rate: 1,
      rate_overridden: false,
      amount_account: 50,
      currency_account: 'EUR',
      institution_id: 'inst-1',
      account_id: 'acc-1',
      category_id: null,
      person_id: null,
      installment_current: 1,
      installment_total: 1,
      status: 'COMPLETED' as const,
      notes: null,
      settled_at: null
    }

    const updated = applyDeletionDelta(initialBalances, [deletedRow])
    const acc1 = updated.find((b) => b.accountId === 'acc-1')
    // 950 + 50 = 1000
    expect(acc1?.balance).toBe(1000)
  })

  it('deducts balance when deleting an INCOME', () => {
    const balances: AccountBalance[] = [
      { accountId: 'acc-1', currency: 'EUR', balance: 1100 }
    ]
    const deletedRow = {
      id: 'tx-2',
      parent_transaction_id: null,
      date: '2026-10-09',
      type: 'INCOME' as const,
      amount_original: 100,
      currency_original: 'EUR',
      fee_amount: 0,
      exchange_rate: 1,
      rate_overridden: false,
      amount_account: 100,
      currency_account: 'EUR',
      institution_id: 'inst-1',
      account_id: 'acc-1',
      category_id: null,
      person_id: null,
      installment_current: 1,
      installment_total: 1,
      status: 'COMPLETED' as const,
      notes: null,
      settled_at: null
    }

    const updated = applyDeletionDelta(balances, [deletedRow])
    const acc1 = updated.find((b) => b.accountId === 'acc-1')
    // 1100 - 100 = 1000
    expect(acc1?.balance).toBe(1000)
  })

  it('reverses both accounts when deleting a TRANSFER', () => {
    const sourceRow = {
      id: 'tx-src',
      parent_transaction_id: null,
      date: '2026-10-09',
      type: 'TRANSFER' as const,
      amount_original: 100,
      currency_original: 'EUR',
      fee_amount: 0,
      exchange_rate: 1.1,
      rate_overridden: false,
      amount_account: -100,
      currency_account: 'EUR',
      institution_id: 'inst-1',
      account_id: 'acc-1',
      category_id: null,
      person_id: null,
      installment_current: 1,
      installment_total: 1,
      status: 'COMPLETED' as const,
      notes: null,
      settled_at: null
    }
    const destRow = {
      id: 'tx-dest',
      parent_transaction_id: 'tx-src',
      date: '2026-10-09',
      type: 'TRANSFER' as const,
      amount_original: 100,
      currency_original: 'EUR',
      fee_amount: 0,
      exchange_rate: 1.1,
      rate_overridden: false,
      amount_account: 110,
      currency_account: 'USD',
      institution_id: 'inst-2',
      account_id: 'acc-2',
      category_id: null,
      person_id: null,
      installment_current: 1,
      installment_total: 1,
      status: 'COMPLETED' as const,
      notes: null,
      settled_at: null
    }

    const updated = applyDeletionDelta(initialBalances, [sourceRow, destRow])
    const acc1 = updated.find((b) => b.accountId === 'acc-1')
    const acc2 = updated.find((b) => b.accountId === 'acc-2')
    // acc1: 950 - (-100) = 1050
    expect(acc1?.balance).toBe(1050)
    // acc2: 610 - 110 = 500
    expect(acc2?.balance).toBe(500)
  })

  it('does not alter balance when deleting a PENDING row', () => {
    const pendingRow = {
      id: 'tx-p',
      parent_transaction_id: null,
      date: '2026-11-09',
      type: 'OUTCOME' as const,
      amount_original: 50,
      currency_original: 'EUR',
      fee_amount: 0,
      exchange_rate: 1,
      rate_overridden: false,
      amount_account: 50,
      currency_account: 'EUR',
      institution_id: 'inst-1',
      account_id: 'acc-1',
      category_id: null,
      person_id: null,
      installment_current: 2,
      installment_total: 3,
      status: 'PENDING' as const,
      notes: null,
      settled_at: null
    }

    const updated = applyDeletionDelta(initialBalances, [pendingRow])
    const acc1 = updated.find((b) => b.accountId === 'acc-1')
    expect(acc1?.balance).toBe(950)
  })
})

describe('applyConfirmationDelta', () => {
  it('applies delta when row transitions to COMPLETED', () => {
    const balances: AccountBalance[] = [
      { accountId: 'acc-1', currency: 'EUR', balance: 1000 }
    ]
    const pendingRow = {
      id: 'tx-p',
      parent_transaction_id: null,
      date: '2026-10-09',
      type: 'OUTCOME' as const,
      amount_original: 80,
      currency_original: 'EUR',
      fee_amount: 0,
      exchange_rate: 1,
      rate_overridden: false,
      amount_account: 80,
      currency_account: 'EUR',
      institution_id: 'inst-1',
      account_id: 'acc-1',
      category_id: null,
      person_id: null,
      installment_current: 1,
      installment_total: 1,
      status: 'PENDING' as const,
      notes: null,
      settled_at: null
    }

    const updated = applyConfirmationDelta(balances, pendingRow)
    const acc1 = updated.find((b) => b.accountId === 'acc-1')
    // 1000 - 80 = 920
    expect(acc1?.balance).toBe(920)
  })
})
