import { describe, it, expect, beforeEach } from 'vitest'
import {
  getCachedRate,
  setCachedRate,
  saveRatesMatrix,
  clearFxCache,
  FX_CACHE_TTL_MS
} from './fx-cache'

describe('fx-cache', () => {
  beforeEach(() => {
    clearFxCache()
  })

  it('retorna 1 si las monedas son idénticas sin consultar storage', () => {
    const res = getCachedRate('USD', 'USD')
    expect(res).toEqual({ rate: 1, isExpired: false, timestamp: expect.any(Number) })
  })

  it('retorna null si el par no está cacheado', () => {
    expect(getCachedRate('AUD', 'UYU')).toBeNull()
  })

  it('guarda una tasa y la recupera con isExpired = false si transcurrieron menos de 24 horas', () => {
    const now = Date.now()
    setCachedRate('USD', 'UYU', 42.5, now)

    const res = getCachedRate('USD', 'UYU', now + 1000)
    expect(res).not.toBeNull()
    expect(res?.rate).toBe(42.5)
    expect(res?.isExpired).toBe(false)
  })

  it('indica isExpired = true si transcurrieron más de 24 horas (pero devuelve la tasa)', () => {
    const now = Date.now()
    setCachedRate('EUR', 'USD', 1.08, now)

    // Consultar 25 horas después
    const later = now + FX_CACHE_TTL_MS + 3600 * 1000
    const res = getCachedRate('EUR', 'USD', later)

    expect(res).not.toBeNull()
    expect(res?.rate).toBe(1.08)
    expect(res?.isExpired).toBe(true)
  })

  it('calcula e infiere la tasa inversa automáticamente', () => {
    setCachedRate('USD', 'EUR', 0.92)

    const inv = getCachedRate('EUR', 'USD')
    expect(inv).not.toBeNull()
    expect(inv?.rate).toBeCloseTo(1 / 0.92, 4)
  })

  it('permite guardar una matriz completa de tasas del snapshot', () => {
    saveRatesMatrix({
      'USD_UYU': 42.5,
      'AUD_USD': 0.65,
      'EUR_USD': 1.08
    })

    expect(getCachedRate('USD', 'UYU')?.rate).toBe(42.5)
    expect(getCachedRate('AUD', 'USD')?.rate).toBe(0.65)
    expect(getCachedRate('EUR', 'USD')?.rate).toBe(1.08)
  })
})
