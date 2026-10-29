import { describe, it, expect } from 'vitest'
import {
  calculateInstallmentDate,
  buildTransactionBundle,
  buildTransferBundle
} from './builder'

describe('calculateInstallmentDate', () => {
  it('calculates next month safely without skew', () => {
    expect(calculateInstallmentDate('2026-01-15', 0)).toBe('2026-01-15')
    expect(calculateInstallmentDate('2026-01-15', 1)).toBe('2026-02-15')
    expect(calculateInstallmentDate('2026-01-15', 12)).toBe('2027-01-15')
  })

  it('clamps to end of month for shorter months', () => {
    expect(calculateInstallmentDate('2026-01-31', 1)).toBe('2026-02-28')
    expect(calculateInstallmentDate('2026-03-31', 1)).toBe('2026-04-30')
  })
})

describe('buildTransactionBundle', () => {
  it('creates single installment outcome correctly', () => {
    const bundle = buildTransactionBundle({
      type: 'OUTCOME',
      amountOriginal: 100,
      currencyOriginal: 'EUR',
      currencyAccount: 'EUR',
      date: '2026-10-09',
      institutionId: 'inst-1',
      accountId: 'acc-1',
      installmentTotal: 1,
      today: '2026-10-09'
    })

    expect(bundle.type).toBe('TRANSACTION')
    expect(bundle.rows).toHaveLength(1)
    const row = bundle.rows[0]
    expect(row.id).toBe(bundle.id)
    expect(row.parent_transaction_id).toBeNull()
    expect(row.status).toBe('COMPLETED')
    expect(row.installment_current).toBe(1)
    expect(row.installment_total).toBe(1)
    expect(row.amount_account).toBe(100)
  })

  it('creates future single installment as PENDING', () => {
    const bundle = buildTransactionBundle({
      type: 'OUTCOME',
      amountOriginal: 50,
      currencyOriginal: 'USD',
      currencyAccount: 'USD',
      date: '2026-10-15',
      institutionId: 'inst-1',
      accountId: 'acc-1',
      today: '2026-10-09'
    })

    expect(bundle.rows[0].status).toBe('PENDING')
  })

  it('creates N-installment bundle with 1 COMPLETED parent and N-1 PENDING children', () => {
    const bundle = buildTransactionBundle({
      type: 'OUTCOME',
      amountOriginal: 300,
      currencyOriginal: 'UYU',
      currencyAccount: 'UYU',
      date: '2026-10-09',
      institutionId: 'inst-1',
      accountId: 'acc-1',
      installmentTotal: 3,
      today: '2026-10-09'
    })

    expect(bundle.rows).toHaveLength(3)

    // Cuota 1
    const parent = bundle.rows[0]
    expect(parent.installment_current).toBe(1)
    expect(parent.installment_total).toBe(3)
    expect(parent.status).toBe('COMPLETED')
    expect(parent.amount_account).toBe(100)
    expect(parent.parent_transaction_id).toBeNull()

    // Cuota 2
    const child1 = bundle.rows[1]
    expect(child1.installment_current).toBe(2)
    expect(child1.installment_total).toBe(3)
    expect(child1.status).toBe('PENDING')
    expect(child1.amount_account).toBe(100)
    expect(child1.parent_transaction_id).toBe(parent.id)
    expect(child1.date).toBe('2026-11-09')

    // Cuota 3
    const child2 = bundle.rows[2]
    expect(child2.installment_current).toBe(3)
    expect(child2.installment_total).toBe(3)
    expect(child2.status).toBe('PENDING')
    expect(child2.amount_account).toBe(100)
    expect(child2.parent_transaction_id).toBe(parent.id)
    expect(child2.date).toBe('2026-12-09')
  })

  it('genera cuotas restantes cuando arranca en cuota intermedia (ej. 4 de 6)', () => {
    const bundle = buildTransactionBundle({
      type: 'OUTCOME',
      amountOriginal: 42000,
      currencyOriginal: 'ARS',
      currencyAccount: 'ARS',
      date: '2026-10-15',
      institutionId: 'inst-1',
      accountId: 'acc-1',
      installmentCurrent: 4,
      installmentTotal: 6,
      today: '2026-10-15'
    })

    // Debe generar 3 filas: cuota 4 (actual), cuota 5 (futura), cuota 6 (futura)
    expect(bundle.rows).toHaveLength(3)

    const parent = bundle.rows[0]
    expect(parent.installment_current).toBe(4)
    expect(parent.installment_total).toBe(6)
    expect(parent.amount_original).toBe(42000)
    expect(parent.status).toBe('COMPLETED')
    expect(parent.date).toBe('2026-10-15')

    const child1 = bundle.rows[1]
    expect(child1.installment_current).toBe(5)
    expect(child1.installment_total).toBe(6)
    expect(child1.amount_original).toBe(42000)
    expect(child1.status).toBe('PENDING')
    expect(child1.date).toBe('2026-11-15')

    const child2 = bundle.rows[2]
    expect(child2.installment_current).toBe(6)
    expect(child2.installment_total).toBe(6)
    expect(child2.amount_original).toBe(42000)
    expect(child2.status).toBe('PENDING')
    expect(child2.date).toBe('2026-12-15')
  })

  it('adjusts installment remainder on the last installment', () => {
    const bundle = buildTransactionBundle({
      type: 'OUTCOME',
      amountOriginal: 100,
      currencyOriginal: 'EUR',
      currencyAccount: 'EUR',
      date: '2026-10-09',
      institutionId: 'inst-1',
      accountId: 'acc-1',
      installmentTotal: 3,
      today: '2026-10-09'
    })

    // 100 / 3 = 33.33 + 33.33 + 33.34
    expect(bundle.rows[0].amount_account).toBe(33.33)
    expect(bundle.rows[1].amount_account).toBe(33.33)
    expect(bundle.rows[2].amount_account).toBe(33.34)
    const sum = bundle.rows.reduce((acc, r) => acc + r.amount_account, 0)
    expect(Math.round(sum * 100) / 100).toBe(100)
  })

  it('creates single ADJUSTMENT bundle with signed delta', () => {
    const bundle = buildTransactionBundle({
      type: 'ADJUSTMENT',
      amountOriginal: -150.25,
      currencyOriginal: 'USD',
      currencyAccount: 'USD',
      amountAccount: -150.25,
      date: '2026-10-09',
      institutionId: 'inst-1',
      accountId: 'acc-1',
      notes: 'Ajuste express de saldo',
      today: '2026-10-09'
    })

    expect(bundle.type).toBe('ADJUSTMENT')
    expect(bundle.rows).toHaveLength(1)
    const row = bundle.rows[0]
    expect(row.type).toBe('ADJUSTMENT')
    expect(row.amount_account).toBe(-150.25)
    expect(row.amount_original).toBe(-150.25)
    expect(row.status).toBe('COMPLETED')
  })
})

describe('buildTransferBundle', () => {
  const fromAccount = {
    id: 'acc-from',
    name: 'Everyday EUR',
    currency_native: 'EUR',
    institution_id: 'inst-1'
  }
  const toAccount = {
    id: 'acc-to',
    name: 'Wise USD',
    currency_native: 'USD',
    institution_id: 'inst-2'
  }

  it('builds atomic transfer with 2 linked rows', () => {
    const bundle = buildTransferBundle({
      fromAccount,
      toAccount,
      amountOriginal: 100,
      currencyOriginal: 'EUR',
      feeAmount: 2,
      exchangeRate: 1.1,
      date: '2026-10-09'
    })

    expect(bundle.type).toBe('TRANSFER')
    expect(bundle.rows).toHaveLength(2)

    const [source, dest] = bundle.rows

    // Origen: débito = 100 + fee 2 = 102 EUR (negativo)
    expect(source.account_id).toBe('acc-from')
    expect(source.amount_account).toBe(-102)
    expect(source.currency_account).toBe('EUR')
    expect(source.parent_transaction_id).toBeNull()
    expect(source.status).toBe('COMPLETED')

    // Destino: crédito = (100 - fee 2) * 1.1 = 98 * 1.1 = 107.8 USD (positivo)
    expect(dest.account_id).toBe('acc-to')
    expect(dest.amount_account).toBe(107.8)
    expect(dest.currency_account).toBe('USD')
    expect(dest.parent_transaction_id).toBe(source.id)
    expect(dest.status).toBe('COMPLETED')
  })

  it('throws error if source and destination accounts are the same', () => {
    expect(() =>
      buildTransferBundle({
        fromAccount,
        toAccount: fromAccount,
        amountOriginal: 50,
        currencyOriginal: 'EUR',
        date: '2026-10-09'
      })
    ).toThrow('La cuenta de origen y destino deben ser distintas.')
  })
})
