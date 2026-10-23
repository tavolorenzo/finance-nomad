import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PersonActions } from './PersonActions'
import type { Person, MasterTransaction } from '@/lib/types'
import * as navigation from 'next/navigation'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn()
}))

vi.mock('./WhatsAppNotifyModal', () => ({
  WhatsAppNotifyModal: ({ isOpen }: { isOpen: boolean }) => (
    isOpen ? <div data-testid="whatsapp-modal">WhatsApp Modal</div> : null
  )
}))

vi.mock('./RegisterPersonPaymentModal', () => ({
  RegisterPersonPaymentModal: ({ isOpen }: { isOpen: boolean }) => (
    isOpen ? <div data-testid="payment-modal">Payment Modal</div> : null
  )
}))

describe('PersonActions', () => {
  const mockPerson: Person = {
    id: 'per-1',
    name: 'Gladys',
    phone: '+59899123456',
    is_active: true,
    created_at: new Date().toISOString()
  }

  const mockPending: MasterTransaction[] = [
    {
      id: 'tx-1',
      parent_transaction_id: null,
      date: '2026-10-24',
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
      person_id: 'per-1',
      installment_current: 1,
      installment_total: 1,
      status: 'COMPLETED',
      notes: 'Almuerzo compartido',
      settled_at: null,
      settled_amount: 0
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(navigation.useRouter).mockReturnValue({ refresh: vi.fn() } as any)
  })

  it('deshabilita botones de cobro y whatsapp si no hay saldo pendiente', () => {
    render(<PersonActions person={mockPerson} pending={[]} />)
    expect(screen.getByRole('button', { name: /notificar por whatsapp/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /registrar cobro/i })).toBeDisabled()
  })

  it('habilita botones y abre modal de WhatsApp', () => {
    render(<PersonActions person={mockPerson} pending={mockPending} />)
    const notifyBtn = screen.getByRole('button', { name: /notificar por whatsapp/i })
    expect(notifyBtn).not.toBeDisabled()

    fireEvent.click(notifyBtn)
    expect(screen.getByTestId('whatsapp-modal')).toBeInTheDocument()
  })

  it('abre modal de registro de cobro al hacer click en Registrar cobro', () => {
    render(<PersonActions person={mockPerson} pending={mockPending} />)
    const payBtn = screen.getByRole('button', { name: /registrar cobro/i })
    fireEvent.click(payBtn)
    expect(screen.getByTestId('payment-modal')).toBeInTheDocument()
  })
})
