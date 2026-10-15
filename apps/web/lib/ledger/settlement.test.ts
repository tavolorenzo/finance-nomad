import { describe, it, expect } from 'vitest'
import { allocateSettlement, buildPersonSettlementBundle } from './settlement'
import { applyBundleDelta } from './balance'
import type { MasterTransaction } from '../types'
import type { AccountBalance, BuildPersonSettlementInput } from './types'

describe('allocateSettlement (FIFO Amortization)', () => {
  const pendingDebts: MasterTransaction[] = [
    {
      id: 'tx-1',
      parent_transaction_id: null,
      date: '2026-05-15',
      type: 'OUTCOME',
      amount_original: 300,
      currency_original: 'UYU',
      fee_amount: 0,
      exchange_rate: 1,
      rate_overridden: false,
      amount_account: 300,
      currency_account: 'UYU',
      institution_id: 'inst-1',
      account_id: 'acc-card',
      category_id: null,
      person_id: 'person-gladys',
      installment_current: 1,
      installment_total: 1,
      status: 'COMPLETED',
      notes: 'Cena Mayo',
      settled_at: null,
      settled_amount: 0
    },
    {
      id: 'tx-2',
      parent_transaction_id: null,
      date: '2026-06-10',
      type: 'OUTCOME',
      amount_original: 500,
      currency_original: 'UYU',
      fee_amount: 0,
      exchange_rate: 1,
      rate_overridden: false,
      amount_account: 500,
      currency_account: 'UYU',
      institution_id: 'inst-1',
      account_id: 'acc-card',
      category_id: null,
      person_id: 'person-gladys',
      installment_current: 1,
      installment_total: 2,
      status: 'COMPLETED',
      notes: 'Supermercado Cuota 1/2',
      settled_at: null,
      settled_amount: 0
    },
    {
      id: 'tx-3',
      parent_transaction_id: null,
      date: '2026-07-10',
      type: 'OUTCOME',
      amount_original: 500,
      currency_original: 'UYU',
      fee_amount: 0,
      exchange_rate: 1,
      rate_overridden: false,
      amount_account: 500,
      currency_account: 'UYU',
      institution_id: 'inst-1',
      account_id: 'acc-card',
      category_id: null,
      person_id: 'person-gladys',
      installment_current: 2,
      installment_total: 2,
      status: 'PENDING',
      notes: 'Supermercado Cuota 2/2',
      settled_at: null,
      settled_amount: 0
    }
  ]

  const today = '2026-06-15'

  it('Caso A: cancela exactamente el saldo actual (date <= today)', () => {
    // tx-1 (300) + tx-2 (500) = 800
    const result = allocateSettlement(pendingDebts, 800, today, '2026-06-15')

    expect(result.caseType).toBe('A')
    expect(result.currentDebt).toBe(800)
    expect(result.futureDebt).toBe(500)
    expect(result.totalDebt).toBe(1300)
    expect(result.remainingDebtAfter).toBe(500)
    expect(result.excessToFuture).toBe(0)
    expect(result.fullySettledIds).toEqual(['tx-1', 'tx-2'])
    expect(result.partiallySettledId).toBeNull()

    const tx1 = result.updatedTransactions.find((t) => t.id === 'tx-1')!
    expect(tx1.settled_amount).toBe(300)
    expect(tx1.settled_at).toBe('2026-06-15')

    const tx2 = result.updatedTransactions.find((t) => t.id === 'tx-2')!
    expect(tx2.settled_amount).toBe(500)
    expect(tx2.settled_at).toBe('2026-06-15')

    // tx-3 no debería estar en updatedTransactions porque no fue tocada
    expect(result.updatedTransactions.find((t) => t.id === 'tx-3')).toBeUndefined()
  })

  it('Caso B: pago parcial menor al saldo actual amortiza por FIFO', () => {
    // Pagamos 500 de los 800 actuales.
    // tx-1 (300) queda saldada al 100%.
    // tx-2 (500) amortiza 200 y le quedan 300 pendientes.
    const result = allocateSettlement(pendingDebts, 500, today, '2026-06-15')

    expect(result.caseType).toBe('B')
    expect(result.currentDebt).toBe(800)
    expect(result.remainingDebtAfter).toBe(800) // 1300 - 500 = 800
    expect(result.fullySettledIds).toEqual(['tx-1'])
    expect(result.partiallySettledId).toBe('tx-2')

    const tx1 = result.updatedTransactions.find((t) => t.id === 'tx-1')!
    expect(tx1.settled_amount).toBe(300)
    expect(tx1.settled_at).toBe('2026-06-15')

    const tx2 = result.updatedTransactions.find((t) => t.id === 'tx-2')!
    expect(tx2.settled_amount).toBe(200)
    expect(tx2.settled_at).toBeNull() // Parcial sigue pendiente
  })

  it('Caso C: pago mayor cancela el saldo actual y amortiza cuotas futuras', () => {
    // Pagamos 1000 de los 800 actuales.
    // tx-1 (300) saldada 100%.
    // tx-2 (500) saldada 100%.
    // tx-3 (500 futura) recibe 200 de adelanto y le quedan 300 pendientes.
    const result = allocateSettlement(pendingDebts, 1000, today, '2026-06-15')

    expect(result.caseType).toBe('C')
    expect(result.excessToFuture).toBe(200)
    expect(result.remainingDebtAfter).toBe(300)
    expect(result.fullySettledIds).toEqual(['tx-1', 'tx-2'])
    expect(result.partiallySettledId).toBe('tx-3')

    const tx3 = result.updatedTransactions.find((t) => t.id === 'tx-3')!
    expect(tx3.settled_amount).toBe(200)
    expect(tx3.settled_at).toBeNull()
  })

  it('rechaza importes que superan la deuda total acumulada', () => {
    // totalDebt = 1300
    expect(() => allocateSettlement(pendingDebts, 1500, today, '2026-06-15')).toThrow(
      /supera la deuda total acumulada/
    )
  })
})

describe('buildPersonSettlementBundle & applyBundleDelta', () => {
  const pendingDebts: MasterTransaction[] = [
    {
      id: 'tx-1',
      parent_transaction_id: null,
      date: '2026-06-10',
      type: 'OUTCOME',
      amount_original: 500,
      currency_original: 'UYU',
      fee_amount: 0,
      exchange_rate: 1,
      rate_overridden: false,
      amount_account: 500,
      currency_account: 'UYU',
      institution_id: 'inst-1',
      account_id: 'acc-card',
      category_id: null,
      person_id: 'person-gladys',
      installment_current: 1,
      installment_total: 1,
      status: 'COMPLETED',
      notes: 'Gasto Gladys',
      settled_at: null,
      settled_amount: 0
    }
  ]

  const input: BuildPersonSettlementInput = {
    personId: 'person-gladys',
    personName: 'Gladys',
    destinationAccount: {
      id: 'acc-cash',
      name: 'Itaú Efectivo',
      currency_native: 'UYU',
      institution_id: 'inst-1',
      type: 'cash'
    },
    amountOriginal: 500,
    currencyOriginal: 'UYU',
    currencyAccount: 'UYU',
    date: '2026-06-15',
    notes: 'Pago de Gladys',
    pendingTransactions: pendingDebts,
    today: '2026-06-15'
  }

  it('construye bundle atómico con fila INCOME y filas amortizadas', () => {
    const { bundle, allocationResult } = buildPersonSettlementBundle(input)

    expect(bundle.type).toBe('SETTLEMENT')
    expect(bundle.rows.length).toBe(2)

    const incomeRow = bundle.rows.find((r) => r.type === 'INCOME')!
    expect(incomeRow.amount_account).toBe(500)
    expect(incomeRow.account_id).toBe('acc-cash')
    expect(incomeRow.person_id).toBe('person-gladys')
    expect(incomeRow.status).toBe('COMPLETED')

    expect(allocationResult.fullySettledIds).toEqual(['tx-1'])
  })

  it('applyBundleDelta solo incrementa el saldo de la cuenta receptora sin alterar la tarjeta', () => {
    const { bundle } = buildPersonSettlementBundle(input)

    const initialBalances: AccountBalance[] = [
      { accountId: 'acc-card', currency: 'UYU', balance: -500 },
      { accountId: 'acc-cash', currency: 'UYU', balance: 100 }
    ]

    const updatedBalances = applyBundleDelta(initialBalances, bundle)

    // La cuenta efectivo sube de 100 a 600
    const cash = updatedBalances.find((b) => b.accountId === 'acc-cash')!
    expect(cash.balance).toBe(600)

    // La tarjeta permanece en -500 intacta (porque la tarjeta aún no se pagó al banco)
    const card = updatedBalances.find((b) => b.accountId === 'acc-card')!
    expect(card.balance).toBe(-500)
  })
})
