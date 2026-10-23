import { describe, it, expect } from 'vitest'
import { getRate, calculateAccountAmount, splitInstallments } from './fx'
import { convertToDisplayCurrency } from './networth'

describe('FX Engine & Networth', () => {
  it('returns 1 when converting the same currency', async () => {
    const rate = await getRate('2026-10-09', 'USD', 'USD')
    expect(rate).toBe(1)
  })

  it('calculates account amount correctly according to ledger rules', () => {
    // amount_account = (amount_original - fee_amount) * exchange_rate
    const res = calculateAccountAmount(100, 5, 40.5)
    expect(res).toBe(3847.5)
  })

  it('splits installments correctly without losing fractional cents', () => {
    const installments = splitInstallments(100, 3)
    expect(installments).toHaveLength(3)
    const sum = installments.reduce((a, b) => a + b, 0)
    expect(sum).toBe(100)
    expect(installments[0]).toBe(33.33)
    expect(installments[1]).toBe(33.33)
    expect(installments[2]).toBe(33.34)
  })

  it('converts balances in parallel and calculates display net worth', async () => {
    const balances = [
      { accountId: '1', currency: 'EUR', balance: 500 },
      { accountId: '2', currency: 'EUR', balance: 300 },
      { accountId: '3', currency: 'EUR', balance: 0 }
    ]
    const total = await convertToDisplayCurrency(balances, 'EUR', '2026-10-09')
    expect(total).toBe(800)
  })

  it('applies customRates when provided without querying external API', async () => {
    const balances = [
      { accountId: 'galicia', currency: 'ARS', balance: 128000 },
      { accountId: 'wise', currency: 'USD', balance: 500 }
    ]
    // 1 USD = 1280 ARS -> 1 ARS = 1/1280 USD = 0.00078125 USD -> 128000 ARS = 100 USD
    const customRates = {
      'ARS_USD': 1 / 1280
    }
    const total = await convertToDisplayCurrency(balances, 'USD', '2026-10-09', customRates)
    expect(total).toBe(600) // 500 USD + 100 USD
  })
})
