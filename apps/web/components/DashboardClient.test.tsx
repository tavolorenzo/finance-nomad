import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DashboardClient } from './DashboardClient'
import * as ledgerContext from '@/lib/ledger/ledger-context'
import type { Account, MasterTransaction } from '@/lib/types'
import type { AccountBalance } from '@/lib/ledger/types'

vi.mock('@/lib/ledger/ledger-context', () => ({
  useLedger: vi.fn()
}))

vi.mock('./OnboardingTour', () => ({
  OnboardingTour: () => null
}))

vi.mock('./ExpressAdjustModal', () => ({
  ExpressAdjustModal: () => <button>Ajuste Mock</button>
}))

vi.mock('./RegisterCardPaymentModal', () => ({
  RegisterCardPaymentModal: () => <button>Pagar Tarjeta Mock</button>
}))

describe('DashboardClient', () => {
  const mockAccount: Account & { institutions: { name: string } } = {
    id: 'acc-1',
    institution_id: 'inst-1',
    name: 'Cuenta Principal',
    type: 'checking',
    currency_native: 'EUR',
    credit_limit: null,
    is_active: true,
    institutions: { name: 'Santander' }
  }

  const mockBalances: AccountBalance[] = [
    { accountId: 'acc-1', currency: 'EUR', balance: 3500 }
  ]

  const mockTx: MasterTransaction = {
    id: 'tx-1',
    parent_transaction_id: null,
    date: '2026-10-24',
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
    notes: 'Supermercado',
    settled_at: null,
    settled_amount: 0
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    localStorage.setItem('finance_nomad_tour_completed', 'true')
    vi.mocked(ledgerContext.useLedger).mockReturnValue({
      balances: mockBalances,
      accounts: [mockAccount],
      recentTransactions: [mockTx],
      isInitialized: true,
      seedInitialData: vi.fn(),
      fxRates: {}
    } as any)
  })

  it('renderiza resumen de patrimonio neto, cuentas y movimientos recientes', () => {
    render(
      <DashboardClient
        initialAccounts={[mockAccount]}
        initialBalances={mockBalances}
        initialTransactions={[mockTx]}
        initialEstimates={[]}
        displayCurrency="EUR"
        initialNetWorth={3500}
        initialRealSpent={50}
        monthStart="2026-10-01"
        monthEnd="2026-10-31"
      />
    )

    expect(screen.getByText('Patrimonio neto')).toBeInTheDocument()
    expect(screen.getByText('Análisis de Datos & Flujo')).toBeInTheDocument()
    expect(screen.getByText(/Cuenta Principal/)).toBeInTheDocument()
    expect(screen.getByText('Supermercado')).toBeInTheDocument()
  })
})
