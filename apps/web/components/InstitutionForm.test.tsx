import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { InstitutionForm } from './InstitutionForm'
import * as institutionActions from '@/app/(protected)/institutions/actions'
import * as modalModule from '@/components/Modal'
import * as navigationModule from 'next/navigation'

vi.mock('@/app/(protected)/institutions/actions', () => ({
  createInstitution: vi.fn(),
  updateInstitution: vi.fn(),
  setInstitutionActive: vi.fn()
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn()
}))

vi.mock('@/components/Modal', () => ({
  useModal: vi.fn()
}))

describe('InstitutionForm', () => {
  const mockPush = vi.fn()
  const mockRefresh = vi.fn()
  const mockClose = vi.fn()

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

  it('renderiza el formulario de creación vacío por defecto con label accesible', () => {
    render(<InstitutionForm />)

    expect(screen.getByLabelText(/nombre de la institución/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Commbank, Wise, Itaú/i)).toHaveValue('')
    expect(screen.getByRole('button', { name: /crear institución/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /guardar cambios/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /desactivar institución/i })).not.toBeInTheDocument()
  })

  it('permite escribir el nombre y enviar el formulario para crear una institución', async () => {
    vi.mocked(institutionActions.createInstitution).mockResolvedValueOnce(undefined)

    render(<InstitutionForm />)

    const input = screen.getByPlaceholderText(/Commbank, Wise, Itaú/i)
    fireEvent.change(input, { target: { value: 'Mercado Pago' } })

    const submitBtn = screen.getByRole('button', { name: /crear institución/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(institutionActions.createInstitution).toHaveBeenCalledWith('Mercado Pago')
      expect(mockPush).toHaveBeenCalledWith('/accounts')
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('cierra el modal en vez de redirigir si está dentro de un modal', async () => {
    vi.mocked(modalModule.useModal).mockReturnValue({
      isModal: true,
      close: mockClose
    })
    vi.mocked(institutionActions.createInstitution).mockResolvedValueOnce(undefined)

    render(<InstitutionForm />)

    const input = screen.getByPlaceholderText(/Commbank, Wise, Itaú/i)
    fireEvent.change(input, { target: { value: 'Santander' } })

    fireEvent.click(screen.getByRole('button', { name: /crear institución/i }))

    await waitFor(() => {
      expect(institutionActions.createInstitution).toHaveBeenCalledWith('Santander')
      expect(mockClose).toHaveBeenCalled()
      expect(mockPush).not.toHaveBeenCalled()
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('muestra mensaje de error si la acción createInstitution falla', async () => {
    vi.mocked(institutionActions.createInstitution).mockRejectedValueOnce(
      new Error('Error de conexión con la base de datos')
    )

    render(<InstitutionForm />)

    const input = screen.getByPlaceholderText(/Commbank, Wise, Itaú/i)
    fireEvent.change(input, { target: { value: 'BBVA' } })

    fireEvent.click(screen.getByRole('button', { name: /crear institución/i }))

    await waitFor(() => {
      expect(screen.getByText('Error de conexión con la base de datos')).toBeInTheDocument()
    })

    // Debe habilitar nuevamente el botón tras fallar
    expect(screen.getByRole('button', { name: /crear institución/i })).not.toBeDisabled()
  })

  it('renderiza en modo edición con los datos de la institución y permite actualizar', async () => {
    vi.mocked(institutionActions.updateInstitution).mockResolvedValueOnce(undefined)

    const mockInstitution = {
      id: 'inst-123',
      user_id: 'user-1',
      name: 'Galicia',
      is_active: true,
      created_at: new Date().toISOString()
    }

    render(<InstitutionForm institution={mockInstitution} />)

    const input = screen.getByPlaceholderText(/Commbank, Wise, Itaú/i)
    expect(input).toHaveValue('Galicia')
    expect(screen.getByRole('button', { name: /guardar cambios/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /desactivar institución/i })).toBeInTheDocument()

    fireEvent.change(input, { target: { value: 'Banco Galicia' } })
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }))

    await waitFor(() => {
      expect(institutionActions.updateInstitution).toHaveBeenCalledWith('inst-123', 'Banco Galicia')
      expect(mockPush).toHaveBeenCalledWith('/accounts')
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('permite desactivar una institución activa', async () => {
    vi.mocked(institutionActions.setInstitutionActive).mockResolvedValueOnce(undefined)

    const mockInstitution = {
      id: 'inst-456',
      user_id: 'user-1',
      name: 'HSBC',
      is_active: true,
      created_at: new Date().toISOString()
    }

    render(<InstitutionForm institution={mockInstitution} />)

    const deactivateBtn = screen.getByRole('button', { name: /desactivar institución/i })
    fireEvent.click(deactivateBtn)

    await waitFor(() => {
      expect(institutionActions.setInstitutionActive).toHaveBeenCalledWith('inst-456', false)
      expect(mockPush).toHaveBeenCalledWith('/accounts')
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('permite reactivar una institución desactivada y muestra advertencia informativa', async () => {
    vi.mocked(institutionActions.setInstitutionActive).mockResolvedValueOnce(undefined)

    const mockInstitution = {
      id: 'inst-789',
      user_id: 'user-1',
      name: 'Prex',
      is_active: false,
      created_at: new Date().toISOString()
    }

    render(<InstitutionForm institution={mockInstitution} />)

    expect(screen.getByText(/está desactivada — no aparece para cargar movimientos nuevos/i)).toBeInTheDocument()

    const reactivateBtn = screen.getByRole('button', { name: /reactivar institución/i })
    fireEvent.click(reactivateBtn)

    await waitFor(() => {
      expect(institutionActions.setInstitutionActive).toHaveBeenCalledWith('inst-789', true)
      expect(mockPush).toHaveBeenCalledWith('/accounts')
    })
  })

  it('muestra aviso explicativo y deshabilita el botón de crear si está sin conexión a internet', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
      writable: true
    })

    render(<InstitutionForm />)

    expect(screen.getByText(/estás sin conexión/i)).toBeInTheDocument()
    const submitBtn = screen.getByRole('button', { name: /sin conexión a internet/i })
    expect(submitBtn).toBeDisabled()
    expect(institutionActions.createInstitution).not.toHaveBeenCalled()
  })

  it('bloquea el submit y muestra mensaje de error si se intenta forzar el envío estando offline', async () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
      writable: true
    })

    render(<InstitutionForm />)

    const input = screen.getByPlaceholderText(/Commbank, Wise, Itaú/i)
    fireEvent.change(input, { target: { value: 'Revolut' } })

    const form = input.closest('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText(/no tenés conexión a internet/i)).toBeInTheDocument()
      expect(institutionActions.createInstitution).not.toHaveBeenCalled()
    })
  })
})

