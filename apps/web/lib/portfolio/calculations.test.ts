import { describe, it, expect } from 'vitest'
import { computePortfolioSummary, normalizeTicker } from './calculations'
import type { PortfolioTransaction, TickerQuote } from '@/lib/types'

const identityConvert = (amount: number, from: string, to: string) => {
  if (from.toUpperCase() === to.toUpperCase()) return amount
  // 1 USD = 0.9 EUR
  if (from.toUpperCase() === 'USD' && to.toUpperCase() === 'EUR') return amount * 0.9
  if (from.toUpperCase() === 'EUR' && to.toUpperCase() === 'USD') return amount / 0.9
  return amount
}

describe('portfolio calculations', () => {
  it('normalizes tickers consistently', () => {
    expect(normalizeTicker(' aapl ')).toBe('AAPL')
    expect(normalizeTicker('btc-usd')).toBe('BTC-USD')
  })

  it('computes Weighted Average Cost (PPC) across multiple BUY operations and unrealized P&L', () => {
    const transactions: PortfolioTransaction[] = [
      {
        id: '1',
        ticker: 'AAPL',
        asset_name: 'Apple Inc.',
        asset_type: 'STOCK',
        type: 'BUY',
        units: 10,
        price_per_unit: 150,
        fee_amount: 0,
        currency: 'USD',
        quote_mode: 'auto',
        date: '2026-01-10'
      },
      {
        id: '2',
        ticker: 'AAPL',
        asset_name: 'Apple Inc.',
        asset_type: 'STOCK',
        type: 'BUY',
        units: 10,
        price_per_unit: 200,
        fee_amount: 10,
        currency: 'USD',
        quote_mode: 'auto',
        date: '2026-02-15'
      }
    ]

    const quotes: Record<string, TickerQuote> = {
      AAPL: {
        ticker: 'AAPL',
        price: 220,
        currency: 'USD',
        changePercent: 1.5,
        source: 'yahoo',
        updatedAt: '2026-11-10T10:00:00Z'
      }
    }

    const summary = computePortfolioSummary({
      transactions,
      quotes,
      displayCurrency: 'USD',
      convert: identityConvert
    })

    expect(summary.positions).toHaveLength(1)
    const aapl = summary.positions[0]
    // Costo total = 1500 + (2000 + 10) = 3510. Unidades = 20. PPC = 175.5
    expect(aapl.units).toBe(20)
    expect(aapl.investedCapital).toBe(3510)
    expect(aapl.averageCost).toBe(175.5)
    // Valor mercado = 20 * 220 = 4400
    expect(aapl.marketValue).toBe(4400)
    expect(aapl.unrealizedPnL).toBe(890)
    expect(aapl.unrealizedPnLPct).toBeCloseTo(25.36, 1)
  })

  it('handles partial SELL keeping averageCost constant and computing realized P&L', () => {
    const transactions: PortfolioTransaction[] = [
      {
        id: '1',
        ticker: 'TSLA',
        asset_name: 'Tesla',
        asset_type: 'STOCK',
        type: 'BUY',
        units: 10,
        price_per_unit: 200,
        fee_amount: 0,
        currency: 'USD',
        quote_mode: 'auto',
        date: '2026-01-01'
      },
      {
        id: '2',
        ticker: 'TSLA',
        asset_name: 'Tesla',
        asset_type: 'STOCK',
        type: 'SELL',
        units: 4,
        price_per_unit: 250,
        fee_amount: 5,
        currency: 'USD',
        quote_mode: 'auto',
        date: '2026-03-01'
      }
    ]

    const summary = computePortfolioSummary({
      transactions,
      quotes: {
        TSLA: {
          ticker: 'TSLA',
          price: 260,
          currency: 'USD',
          source: 'yahoo',
          updatedAt: '2026-11-10T10:00:00Z'
        }
      },
      displayCurrency: 'USD',
      convert: identityConvert
    })

    const tsla = summary.positions[0]
    expect(tsla.units).toBe(6)
    expect(tsla.averageCost).toBe(200)
    expect(tsla.investedCapital).toBe(1200)
    // Venta de 4 unidades a 250 - 5 fee = 995 neto; costo de las 4 = 800 -> ganancia realizada = 195
    expect(tsla.realizedPnL).toBe(195)
    expect(summary.totalRealizedPnLInDisplay).toBe(195)
  })

  it('supports manual quote mode for local instruments and converts to displayCurrency', () => {
    const transactions: PortfolioTransaction[] = [
      {
        id: '1',
        ticker: 'BONO-UY-2030',
        asset_name: 'Bono Global Uruguay 2030',
        asset_type: 'LOCAL',
        type: 'BUY',
        units: 1000,
        price_per_unit: 1.02,
        fee_amount: 0,
        currency: 'USD',
        quote_mode: 'manual',
        manual_price: 1.08,
        date: '2026-05-01'
      }
    ]

    const summary = computePortfolioSummary({
      transactions,
      quotes: {},
      displayCurrency: 'EUR',
      convert: identityConvert
    })

    expect(summary.positions).toHaveLength(1)
    const bond = summary.positions[0]
    expect(bond.quoteSource).toBe('manual')
    expect(bond.currentPrice).toBe(1.08)
    expect(bond.marketValue).toBe(1080) // USD
    expect(bond.marketValueInDisplay).toBe(972) // 1080 * 0.9 EUR
  })
})

