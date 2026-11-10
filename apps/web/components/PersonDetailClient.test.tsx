import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PersonDetailClient } from './PersonDetailClient'
import type { Person, MasterTransaction } from '@/lib/types'

vi.mock('@/components/PersonActions', () => ({
  PersonActions: () => <div data-testid="mock-person-actions">PersonActions Mock</div>
}))

const mockPerson: Person = {
  id: 'person-1',
  user_id: 'user-1',
  name: 'Lucía Gómez',
  phone: '+59899123456',
  is_active: true,
  created_at: '2026-01-01',
  updated_at: '2026-01-01'
}

describe('PersonDetailClient', () => {
  it('renderiza la ficha de la persona y mensaje vacío si no tiene movimientos', () => {
    render(
      <PersonDetailClient
        person={mockPerson}
        initialTransactions={[]}
        whatsappTemplate={null}
        initialAccounts={[]}
        initialCategories={[]}
        initialPeriod="2026-11"
        todayStr="2026-11-10"
      />
    )

    expect(screen.getByText('Lucía Gómez')).toBeInTheDocument()
    expect(screen.getByText('+59899123456')).toBeInTheDocument()
    expect(screen.getByText(/no hay movimientos asignados a lucía gómez todavía/i)).toBeInTheDocument()
  })

  it('pagína el historial cobrado a 10 movimientos por página', () => {
    const settledTransactions: MasterTransaction[] = Array.from({ length: 15 }, (_, i) => ({
      id: `tx-settled-${i + 1}`,
      user_id: 'user-1',
      parent_transaction_id: null,
      date: '2026-10-15',
      type: 'OUTCOME',
      amount_original: 500,
      currency_original: 'UYU',
      fee_amount: 0,
      exchange_rate: 1,
      rate_overridden: false,
      amount_account: 500,
      currency_account: 'UYU',
      institution_id: 'inst-1',
      account_id: 'acc-1',
      category_id: null,
      person_id: 'person-1',
      accounting_period: '2026-10',
      installment_current: 1,
      installment_total: 1,
      status: 'COMPLETED',
      notes: `Almuerzo compartido ${i + 1}`,
      settled_at: '2026-10-20',
      settled_amount: 500
    }))

    render(
      <PersonDetailClient
        person={mockPerson}
        initialTransactions={settledTransactions}
        whatsappTemplate={null}
        initialAccounts={[]}
        initialCategories={[]}
        initialPeriod="2026-11"
        todayStr="2026-11-10"
      />
    )

    expect(screen.getByText('Historial cobrado')).toBeInTheDocument()
    // En la página 1 deben estar del 1 al 10
    expect(screen.getByText('Almuerzo compartido 1')).toBeInTheDocument()
    expect(screen.getByText('Almuerzo compartido 10')).toBeInTheDocument()
    expect(screen.queryByText('Almuerzo compartido 11')).not.toBeInTheDocument()

    // Control de paginación
    expect(screen.getByLabelText('Paginación de resultados')).toBeInTheDocument()

    // Navegar a página 2
    const nextBtn = screen.getByLabelText('Página siguiente')
    fireEvent.click(nextBtn)

    expect(screen.getByText('Almuerzo compartido 11')).toBeInTheDocument()
    expect(screen.getByText('Almuerzo compartido 15')).toBeInTheDocument()
    expect(screen.queryByText('Almuerzo compartido 1')).not.toBeInTheDocument()
  })
})

