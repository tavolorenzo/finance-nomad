import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AccountsClient } from './AccountsClient'
import * as ledgerContext from '@/lib/ledger/ledger-context'
import type { Institution, Account } from '@/lib/types'
import type { AccountBalance } from '@/lib/ledger/types'

vi.mock('@/lib/ledger/ledger-context', () => ({
  useLedger: vi.fn()
}))

describe('AccountsClient', () => {
  const mockInstitutions: (Institution & { accounts: Account[] })[] = [
    {
      id: 'inst-1',
      name: 'Santander',
      is_active: true,
      accounts: [
        {
          id: 'acc-1',
          institution_id: 'inst-1',
          name: 'Caja de Ahorro',
          type: 'savings',
          currency_native: 'EUR',
          credit_limit: null,
          is_active: true
        }
      ]
    }
  ]

  const mockBalances: AccountBalance[] = [
    { accountId: 'acc-1', currency: 'EUR', balance: 1500 }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(ledgerContext.useLedger).mockReturnValue({
      balances: mockBalances,
      accounts: mockInstitutions[0].accounts
    } as any)
  })

  it('renderiza título y lista de instituciones con sus cuentas y saldos', () => {
    render(<AccountsClient institutions={mockInstitutions} initialBalances={mockBalances} />)
    expect(screen.getByText('Cuentas e Instituciones')).toBeInTheDocument()
    expect(screen.getByText('Santander')).toBeInTheDocument()
    expect(screen.getByText('Caja de Ahorro')).toBeInTheDocument()
    expect(screen.getByText(/1\.500|1500/)).toBeInTheDocument()
  })
})
