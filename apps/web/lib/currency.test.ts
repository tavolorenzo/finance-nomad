import { describe, it, expect } from 'vitest'
import { formatMoney } from './currency'

describe('formatMoney', () => {
  it('formats standard currencies with their symbols', () => {
    expect(formatMoney(1500, 'EUR')).toContain('€ 1.500,00')
    expect(formatMoney(1500, 'USD')).toContain('US$ 1.500,00')
    expect(formatMoney(1500, 'AUD')).toContain('A$ 1.500,00')
    expect(formatMoney(1500, 'UYU')).toContain('$UY 1.500,00')
  })

  it('formats ARS and other Latin American currencies', () => {
    expect(formatMoney(1500, 'ARS')).toContain('$ 1.500,00')
    expect(formatMoney(2500.5, 'BRL')).toContain('R$ 2.500,50')
  })

  it('supports custom symbols', () => {
    expect(formatMoney(100, 'CRD', 'C$')).toContain('C$ 100,00')
  })

  it('handles negative numbers', () => {
    expect(formatMoney(-50, 'ARS')).toContain('-$ 50,00')
  })
})
