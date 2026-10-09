import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PersonForm } from './PersonForm'
import * as personActions from '@/app/(protected)/people/actions'
import * as modalModule from '@/components/Modal'
import * as navigationModule from 'next/navigation'

vi.mock('@/app/(protected)/people/actions', () => ({
  createPerson: vi.fn(),
  updatePerson: vi.fn(),
  setPersonActive: vi.fn()
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn()
}))

vi.mock('@/components/Modal', () => ({
  useModal: vi.fn()
}))

describe('PersonForm', () => {
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

  it('renderiza el formulario de creación vacío para una nueva persona con labels accesibles', () => {
    render(<PersonForm />)

    expect(screen.getByLabelText(/^Nombre$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Número de teléfono/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Gladys, Diego, Ale/i)).toHaveValue('')
    expect(screen.getByPlaceholderText(/\+54 9 11 1234-5678/i)).toHaveValue('')
    expect(screen.getByRole('button', { name: /crear persona/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /desactivar persona/i })).not.toBeInTheDocument()
  })

  it('permite crear una persona y redirige a /people', async () => {
    vi.mocked(personActions.createPerson).mockResolvedValueOnce({ id: 'p-1' } as any)

    render(<PersonForm />)

    fireEvent.change(screen.getByPlaceholderText(/Gladys, Diego, Ale/i), {
      target: { value: 'Diego' }
    })
    fireEvent.change(screen.getByPlaceholderText(/\+54 9 11 1234-5678/i), {
      target: { value: '+5491100000000' }
    })

    fireEvent.click(screen.getByRole('button', { name: /crear persona/i }))

    await waitFor(() => {
      expect(personActions.createPerson).toHaveBeenCalledWith('Diego', '+5491100000000')
      expect(mockPush).toHaveBeenCalledWith('/people')
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('cierra el modal si se encuentra en modo modal al crear una persona', async () => {
    vi.mocked(modalModule.useModal).mockReturnValue({
      isModal: true,
      close: mockClose
    })
    vi.mocked(personActions.createPerson).mockResolvedValueOnce({ id: 'p-2' } as any)

    render(<PersonForm />)

    fireEvent.change(screen.getByPlaceholderText(/Gladys, Diego, Ale/i), {
      target: { value: 'Ale' }
    })
    fireEvent.click(screen.getByRole('button', { name: /crear persona/i }))

    await waitFor(() => {
      expect(personActions.createPerson).toHaveBeenCalledWith('Ale', '')
      expect(mockClose).toHaveBeenCalled()
      expect(mockPush).not.toHaveBeenCalled()
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('muestra mensaje de error si createPerson arroja una excepción', async () => {
    vi.mocked(personActions.createPerson).mockRejectedValueOnce(
      new Error('No se pudo guardar la persona. Intentá de nuevo.')
    )

    render(<PersonForm />)

    fireEvent.change(screen.getByPlaceholderText(/Gladys, Diego, Ale/i), {
      target: { value: 'Romina' }
    })
    fireEvent.click(screen.getByRole('button', { name: /crear persona/i }))

    await waitFor(() => {
      expect(screen.getByText('No se pudo guardar la persona. Intentá de nuevo.')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /crear persona/i })).not.toBeDisabled()
  })

  it('renderiza en modo edición y permite actualizar los datos', async () => {
    vi.mocked(personActions.updatePerson).mockResolvedValueOnce(undefined as any)

    const mockPerson = {
      id: 'p-100',
      user_id: 'u-1',
      name: 'Gladys',
      phone: '+5491111111111',
      is_active: true,
      created_at: new Date().toISOString()
    }

    render(<PersonForm person={mockPerson} />)

    const nameInput = screen.getByPlaceholderText(/Gladys, Diego, Ale/i)
    const phoneInput = screen.getByPlaceholderText(/\+54 9 11 1234-5678/i)

    expect(nameInput).toHaveValue('Gladys')
    expect(phoneInput).toHaveValue('+5491111111111')
    expect(screen.getByRole('button', { name: /guardar cambios/i })).toBeInTheDocument()

    fireEvent.change(nameInput, { target: { value: 'Gladys Mamá' } })
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }))

    await waitFor(() => {
      expect(personActions.updatePerson).toHaveBeenCalledWith('p-100', 'Gladys Mamá', '+5491111111111')
      expect(mockPush).toHaveBeenCalledWith('/people/p-100')
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('bloquea la modificación del nombre para el contacto de sistema Personal', () => {
    const mockPersonal = {
      id: 'p-sys',
      user_id: 'u-1',
      name: 'Personal',
      phone: null,
      is_active: true,
      created_at: new Date().toISOString()
    }

    render(<PersonForm person={mockPersonal} />)

    const nameInput = screen.getByPlaceholderText(/Gladys, Diego, Ale/i)
    expect(nameInput).toBeDisabled()
    expect(screen.getByText(/el nombre del contacto personal no se puede modificar/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /desactivar persona/i })).not.toBeInTheDocument()
  })

  it('deshabilita el botón de desactivar si la persona tiene saldo pendiente', () => {
    const mockPerson = {
      id: 'p-200',
      user_id: 'u-1',
      name: 'Diego',
      phone: null,
      is_active: true,
      created_at: new Date().toISOString()
    }

    render(<PersonForm person={mockPerson} hasPendingBalance={true} />)

    const deactivateBtn = screen.getByRole('button', { name: /desactivar persona/i })
    expect(deactivateBtn).toBeDisabled()
    expect(
      screen.getByText(/solo podés desactivar a una persona si su saldo por cobrar está en 0/i)
    ).toBeInTheDocument()
  })

  it('permite desactivar si no tiene saldo pendiente', async () => {
    vi.mocked(personActions.setPersonActive).mockResolvedValueOnce(undefined as any)

    const mockPerson = {
      id: 'p-200',
      user_id: 'u-1',
      name: 'Diego',
      phone: null,
      is_active: true,
      created_at: new Date().toISOString()
    }

    render(<PersonForm person={mockPerson} hasPendingBalance={false} />)

    const deactivateBtn = screen.getByRole('button', { name: /desactivar persona/i })
    expect(deactivateBtn).not.toBeDisabled()

    fireEvent.click(deactivateBtn)

    await waitFor(() => {
      // isDeactivated era false, por lo que pasa false para desactivarla
      expect(personActions.setPersonActive).toHaveBeenCalledWith('p-200', false)
      expect(mockPush).toHaveBeenCalledWith('/people/p-200')
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('permite reactivar una persona desactivada', async () => {
    vi.mocked(personActions.setPersonActive).mockResolvedValueOnce(undefined as any)

    const mockPerson = {
      id: 'p-300',
      user_id: 'u-1',
      name: 'Romina',
      phone: null,
      is_active: false,
      created_at: new Date().toISOString()
    }

    render(<PersonForm person={mockPerson} />)

    expect(screen.getByText(/está desactivada — no aparece para asignar nuevos gastos/i)).toBeInTheDocument()

    const reactivateBtn = screen.getByRole('button', { name: /reactivar persona/i })
    fireEvent.click(reactivateBtn)

    await waitFor(() => {
      // isDeactivated era true, por lo que pasa true para reactivarla
      expect(personActions.setPersonActive).toHaveBeenCalledWith('p-300', true)
      expect(mockPush).toHaveBeenCalledWith('/people/p-300')
    })
  })

  it('muestra aviso explicativo y deshabilita el botón de crear si está sin conexión a internet', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
      writable: true
    })

    render(<PersonForm />)

    expect(screen.getByText(/estás sin conexión/i)).toBeInTheDocument()
    const submitBtn = screen.getByRole('button', { name: /sin conexión a internet/i })
    expect(submitBtn).toBeDisabled()
    expect(personActions.createPerson).not.toHaveBeenCalled()
  })

  it('bloquea el submit y muestra mensaje de error si se intenta forzar el envío estando offline', async () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
      writable: true
    })

    render(<PersonForm />)

    const nameInput = screen.getByPlaceholderText(/Gladys, Diego, Ale/i)
    fireEvent.change(nameInput, { target: { value: 'Facundo' } })

    const form = nameInput.closest('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText(/no tenés conexión a internet/i)).toBeInTheDocument()
      expect(personActions.createPerson).not.toHaveBeenCalled()
    })
  })
})

