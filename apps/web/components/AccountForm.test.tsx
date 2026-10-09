import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AccountForm } from './AccountForm'
import * as accountActions from '@/app/(protected)/accounts/actions'
import * as modalModule from '@/components/Modal'
import * as navigationModule from 'next/navigation'
import type { Institution, Account } from '@/lib/types'

vi.mock('@/app/(protected)/accounts/actions', () => ({
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
  setAccountActive: vi.fn()
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn()
}))

vi.mock('@/components/Modal', () => ({
  useModal: vi.fn()
}))

describe('AccountForm', () => {
  const mockPush = vi.fn()
  const mockRefresh = vi.fn()
  const mockClose = vi.fn()

  const mockInstitutions: Institution[] = [
    {
      id: 'inst-1',
      name: 'Santander',
      is_active: true
    },
    {
      id: 'inst-2',
      name: 'Wise',
      is_active: true
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(navigationModule.useRouter).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh,
      back: vi.fn(),
      forward: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn()
    } as any)

    vi.mocked(modalModule.useModal).mockReturnValue({
      isModal: false,
      close: mockClose
    })

    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
      writable: true
    })
  })

  it('renderiza el formulario de creación vacío con labels accesibles', () => {
    render(<AccountForm institutions={mockInstitutions} />)

    expect(screen.getByLabelText(/institución/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/nombre de la cuenta/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/tipo de cuenta/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/moneda nativa/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /crear cuenta/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /desactivar cuenta/i })).not.toBeInTheDocument()
  })

  it('permite crear una cuenta y redirige a /accounts', async () => {
    vi.mocked(accountActions.createAccount).mockResolvedValueOnce({ id: 'acc-1' } as any)

    render(<AccountForm institutions={mockInstitutions} />)

    const nameInput = screen.getByLabelText(/nombre de la cuenta/i)
    fireEvent.change(nameInput, { target: { value: 'Caja de Ahorro USD' } })

    const typeSelect = screen.getByLabelText(/tipo de cuenta/i)
    fireEvent.change(typeSelect, { target: { value: 'savings' } })

    const currencySelect = screen.getByLabelText(/moneda nativa/i)
    fireEvent.change(currencySelect, { target: { value: 'USD' } })

    fireEvent.click(screen.getByRole('button', { name: /crear cuenta/i }))

    await waitFor(() => {
      expect(accountActions.createAccount).toHaveBeenCalledWith({
        name: 'Caja de Ahorro USD',
        type: 'savings',
        currencyNative: 'USD',
        creditLimit: null,
        institutionId: 'inst-1'
      })
      expect(mockPush).toHaveBeenCalledWith('/accounts')
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('cierra el modal cuando está dentro de un modal interceptado', async () => {
    vi.mocked(modalModule.useModal).mockReturnValue({
      isModal: true,
      close: mockClose
    })
    vi.mocked(accountActions.createAccount).mockResolvedValueOnce({ id: 'acc-2' } as any)

    render(<AccountForm institutions={mockInstitutions} />)

    fireEvent.change(screen.getByLabelText(/nombre de la cuenta/i), {
      target: { value: 'Cuenta Corriente AUD' }
    })
    fireEvent.click(screen.getByRole('button', { name: /crear cuenta/i }))

    await waitFor(() => {
      expect(mockClose).toHaveBeenCalled()
      expect(mockPush).not.toHaveBeenCalled()
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('muestra campo de límite de crédito cuando el tipo es credit_card', () => {
    render(<AccountForm institutions={mockInstitutions} />)

    expect(screen.queryByLabelText(/límite de crédito/i)).not.toBeInTheDocument()

    const typeSelect = screen.getByLabelText(/tipo de cuenta/i)
    fireEvent.change(typeSelect, { target: { value: 'credit_card' } })

    expect(screen.getByLabelText(/límite de crédito/i)).toBeInTheDocument()
  })

  it('renderiza en modo edición y permite guardar cambios', async () => {
    vi.mocked(accountActions.updateAccount).mockResolvedValueOnce(undefined as any)

    const mockAccount: Account = {
      id: 'acc-100',
      institution_id: 'inst-1',
      name: 'Visa Platinum',
      type: 'credit_card',
      currency_native: 'USD',
      credit_limit: 5000,
      is_active: true
    }

    render(<AccountForm institutions={mockInstitutions} account={mockAccount} />)

    expect(screen.getByRole('button', { name: /guardar cambios/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /desactivar cuenta/i })).toBeInTheDocument()

    const nameInput = screen.getByLabelText(/nombre de la cuenta/i)
    fireEvent.change(nameInput, { target: { value: 'Visa Signature' } })

    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }))

    await waitFor(() => {
      expect(accountActions.updateAccount).toHaveBeenCalledWith('acc-100', {
        name: 'Visa Signature',
        type: 'credit_card',
        currencyNative: 'USD',
        creditLimit: 5000
      })
      expect(mockPush).toHaveBeenCalledWith('/accounts')
    })
  })

  it('permite desactivar una cuenta activa', async () => {
    vi.mocked(accountActions.setAccountActive).mockResolvedValueOnce(undefined as any)

    const mockAccount: Account = {
      id: 'acc-100',
      institution_id: 'inst-1',
      name: 'Cuenta a desactivar',
      type: 'checking',
      currency_native: 'EUR',
      credit_limit: null,
      is_active: true
    }

    render(<AccountForm institutions={mockInstitutions} account={mockAccount} />)

    const deactivateBtn = screen.getByRole('button', { name: /desactivar cuenta/i })
    fireEvent.click(deactivateBtn)

    await waitFor(() => {
      expect(accountActions.setAccountActive).toHaveBeenCalledWith('acc-100', false)
      expect(mockPush).toHaveBeenCalledWith('/accounts')
    })
  })

  it('muestra aviso explicativo y deshabilita el botón si está sin conexión', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
      writable: true
    })

    render(<AccountForm institutions={mockInstitutions} />)

    expect(screen.getByText(/estás sin conexión/i)).toBeInTheDocument()
    const submitBtn = screen.getByRole('button', { name: /sin conexión a internet/i })
    expect(submitBtn).toBeDisabled()
    expect(accountActions.createAccount).not.toHaveBeenCalled()
  })

  it('bloquea el submit y muestra error si se intenta enviar offline', async () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
      writable: true
    })

    render(<AccountForm institutions={mockInstitutions} />)

    const nameInput = screen.getByLabelText(/nombre de la cuenta/i)
    fireEvent.change(nameInput, { target: { value: 'Cuenta Offline' } })

    const form = nameInput.closest('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText(/no tenés conexión a internet/i)).toBeInTheDocument()
      expect(accountActions.createAccount).not.toHaveBeenCalled()
    })
  })
})
