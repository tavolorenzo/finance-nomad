import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LoanForm } from './LoanForm'
import * as onlineHook from '@/lib/hooks/use-online-status'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn()
  })
}))

vi.mock('@/lib/hooks/use-online-status', () => ({
  useOnlineStatus: vi.fn()
}))

vi.mock('@/app/(protected)/loans/actions', () => ({
  createLoanAction: vi.fn().mockResolvedValue({ success: true, loanId: 'loan-new-123' })
}))

describe('LoanForm', () => {
  const mockInstitutions = [{ id: 'inst-1', name: 'Banco Itaú', is_active: true }]
  const mockPeople = [{ id: 'person-1', name: 'Diego', phone: null, is_active: true }]
  const mockAccounts = [
    { id: 'acc-1', name: 'Caja Ahorro', currency_native: 'USD', institution_id: 'inst-1', type: 'savings' as const, credit_limit: null, is_active: true }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(onlineHook.useOnlineStatus).mockReturnValue(true)
  })

  it('renderiza todos los campos del formulario y el cuadro de simulación en vivo', () => {
    render(
      <LoanForm
        institutions={mockInstitutions}
        people={mockPeople}
        accounts={mockAccounts}
      />
    )

    expect(screen.getByRole('heading', { name: /Nuevo Préstamo/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/Nombre o Concepto/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Capital Prestado/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Tasa TEA/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Plazo \(Cuotas\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Simulación de Cuotas \(Itaú\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Cuota Nivelada/i)).toBeInTheDocument()
  })

  it('permite alternar entre préstamo tomado y préstamo otorgado', () => {
    render(
      <LoanForm
        institutions={mockInstitutions}
        people={mockPeople}
        accounts={mockAccounts}
      />
    )

    const btnLent = screen.getByRole('button', { name: /Presté dinero \(Por Cobrar\)/i })
    fireEvent.click(btnLent)
    expect(btnLent).toHaveClass('text-income')
  })

  it('deshabilita el submit y muestra advertencia si está offline', () => {
    vi.mocked(onlineHook.useOnlineStatus).mockReturnValue(false)

    render(
      <LoanForm
        institutions={mockInstitutions}
        people={mockPeople}
        accounts={mockAccounts}
      />
    )

    expect(screen.getByText(/Estás sin conexión/i)).toBeInTheDocument()
    const submitBtn = screen.getByRole('button', { name: /Crear Préstamo/i })
    expect(submitBtn).toBeDisabled()
  })
})
