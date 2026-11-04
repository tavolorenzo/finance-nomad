import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PeopleDirectoryClient, type PendingPersonRow } from './PeopleDirectoryClient'
import { PersonDetailClient } from './PersonDetailClient'
import type { MasterTransaction, Person } from '@/lib/types'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() })
}))

vi.mock('@/lib/ledger/ledger-context', () => ({
  useOptionalLedger: () => null
}))

describe('PeopleDirectoryClient & PersonDetailClient (Filtro Período Contable)', () => {
  const gladys: Person = {
    id: 'person-gladys',
    name: 'Gladys',
    phone: '+59899123456',
    is_active: true
  }

  const pendingRows: PendingPersonRow[] = [
    {
      id: 'tx-oct-no-period',
      person_id: 'person-gladys',
      amount_account: 1200,
      currency_account: 'UYU',
      settled_amount: 0,
      settled_at: null,
      accounting_period: null, // Sin período contable -> asume el mes del gasto (2026-10)
      date: '2026-10-18',
      installment_total: 1,
      type: 'OUTCOME'
    },
    {
      id: 'tx-nov-period',
      person_id: 'person-gladys',
      amount_account: 850,
      currency_account: 'UYU',
      settled_amount: 0,
      settled_at: null,
      accounting_period: '2026-11',
      date: '2026-10-29', // Compra post-cierre imputada a Noviembre
      installment_total: 1,
      type: 'OUTCOME'
    }
  ]

  it('separa el saldo de Octubre 2026 del de Noviembre 2026 al cambiar el filtro en /people', () => {
    render(
      <PeopleDirectoryClient
        initialPeople={[gladys]}
        initialPending={pendingRows}
        initialPeriod="2026-11"
        todayStr="2026-11-04"
      />
    )

    // En Noviembre 2026 muestra 850 como saldo del período y 1.200 en períodos anteriores (sin sumarlos juntos)
    expect(screen.getByText('Saldo Noviembre 2026')).toBeInTheDocument()
    expect(screen.getByText('Períodos anteriores')).toBeInTheDocument()

    // Cambiar a Octubre 2026
    const prevBtn = screen.getByRole('button', { name: /período anterior/i })
    fireEvent.click(prevBtn)

    expect(screen.getByText('Saldo Octubre 2026')).toBeInTheDocument()
    expect(screen.getByText('Próximos meses')).toBeInTheDocument()
  })

  it('filtra el detalle de /people/[id] por el período contable seleccionado', () => {
    const fullTxs: MasterTransaction[] = pendingRows.map((r) => ({
      ...r,
      parent_transaction_id: null,
      amount_original: r.amount_account,
      currency_original: r.currency_account,
      fee_amount: 0,
      exchange_rate: 1,
      rate_overridden: false,
      institution_id: 'inst-1',
      account_id: 'acc-1',
      category_id: null,
      installment_current: 1,
      status: 'COMPLETED',
      notes: r.id === 'tx-oct-no-period' ? 'Cena Octubre' : 'Supermercado Noviembre'
    }))

    render(
      <PersonDetailClient
        person={gladys}
        initialTransactions={fullTxs}
        whatsappTemplate={null}
        initialAccounts={[]}
        initialCategories={[]}
        initialPeriod="2026-10"
        todayStr="2026-11-04"
      />
    )

    expect(screen.getByText(/Saldo por cobrar \(Octubre 2026\)/i)).toBeInTheDocument()
    expect(screen.getByText('Pendiente en Octubre 2026')).toBeInTheDocument()
    expect(screen.getByText('Cuotas futuras')).toBeInTheDocument()
  })
})

