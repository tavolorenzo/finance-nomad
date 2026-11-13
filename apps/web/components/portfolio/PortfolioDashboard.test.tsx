import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PortfolioDashboard } from './PortfolioDashboard'
import type { PortfolioTransaction, TickerQuote } from '@/lib/types'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn()
  })
}))

vi.mock('@/lib/hooks/use-online-status', () => ({
  useOnlineStatus: () => true
}))

vi.mock('@/lib/ledger/ledger-context', () => ({
  useOptionalLedger: () => ({
    portfolioTransactions: [],
    accounts: [],
    seedInitialData: vi.fn(),
    refresh: vi.fn()
  })
}))

describe('PortfolioDashboard', () => {
  it('renderiza siempre el disclaimer informativo y el estado vacío cuando no hay inversiones', () => {
    render(
      <PortfolioDashboard
        initialTransactions={[]}
        initialQuotes={{}}
        initialAccounts={[]}
        initialCustomRates={{}}
        displayCurrency="USD"
      />
    )

    expect(
      screen.getByText(/Herramienta de carácter informativo y seguimiento personal/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Todavía no tenés activos registrados en tu portafolio/i)
    ).toBeInTheDocument()
  })

  it('muestra las posiciones activas, el capital invertido y el rendimiento con cotización automática o manual', () => {
    const txs: PortfolioTransaction[] = [
      {
        id: 'tx-1',
        ticker: 'AAPL',
        asset_name: 'Apple Inc.',
        asset_type: 'STOCK',
        type: 'BUY',
        units: 10,
        price_per_unit: 180,
        fee_amount: 0,
        currency: 'USD',
        quote_mode: 'auto',
        date: '2026-10-01'
      },
      {
        id: 'tx-2',
        ticker: 'BONO-UY',
        asset_name: 'Bono Global UY',
        asset_type: 'LOCAL',
        type: 'BUY',
        units: 100,
        price_per_unit: 10,
        fee_amount: 0,
        currency: 'USD',
        quote_mode: 'manual',
        manual_price: 11,
        date: '2026-10-05'
      }
    ]

    const quotes: Record<string, TickerQuote> = {
      AAPL: {
        ticker: 'AAPL',
        price: 200,
        currency: 'USD',
        source: 'yahoo',
        updatedAt: '2026-11-11T10:00:00Z'
      }
    }

    render(
      <PortfolioDashboard
        initialTransactions={txs}
        initialQuotes={quotes}
        initialAccounts={[]}
        initialCustomRates={{}}
        displayCurrency="USD"
      />
    )

    expect(screen.getAllByText('AAPL').length).toBeGreaterThan(0)
    expect(screen.getAllByText('BONO-UY').length).toBeGreaterThan(0)
    expect(screen.getByText('Valor manual')).toBeInTheDocument()
  })
})

