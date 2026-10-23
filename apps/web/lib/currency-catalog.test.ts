import { describe, it, expect } from 'vitest'
import { searchCurrencies, getCurrencyInfo, CURRENCY_CATALOG, DEFAULT_ACTIVE_CURRENCIES } from './currency-catalog'

describe('currency-catalog', () => {
  it('contains popular nomad currencies including ARS', () => {
    const codes = CURRENCY_CATALOG.map((c) => c.code)
    expect(codes).toContain('ARS')
    expect(codes).toContain('USD')
    expect(codes).toContain('EUR')
    expect(codes).toContain('UYU')
    expect(codes).toContain('BRL')
  })

  it('searches currencies by code and name', () => {
    const resArs = searchCurrencies('ars')
    expect(resArs.some((c) => c.code === 'ARS')).toBe(true)

    const resArg = searchCurrencies('argentino')
    expect(resArg.some((c) => c.code === 'ARS')).toBe(true)

    const resEuro = searchCurrencies('euro')
    expect(resEuro.some((c) => c.code === 'EUR')).toBe(true)
  })

  it('returns currency info by code', () => {
    const ars = getCurrencyInfo('ARS')
    expect(ars?.name).toBe('Peso argentino')
    expect(ars?.symbol).toBe('$')
    expect(ars?.flag).toBe('🇦🇷')

    const unknown = getCurrencyInfo('NONEXISTENT')
    expect(unknown).toBeUndefined()
  })

  it('provides default active currencies with ARS', () => {
    const codes = DEFAULT_ACTIVE_CURRENCIES.map((c) => c.code)
    expect(codes).toContain('ARS')
    expect(codes).toContain('EUR')
    expect(codes).toContain('USD')
  })
})
