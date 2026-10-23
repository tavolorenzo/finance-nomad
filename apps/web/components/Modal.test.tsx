import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Modal } from './Modal'
import * as navigation from 'next/navigation'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn()
}))

describe('Modal', () => {
  const mockBack = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(navigation.useRouter).mockReturnValue({
      back: mockBack
    } as any)
    vi.mocked(navigation.usePathname).mockReturnValue('/accounts/new')
  })

  it('renderiza título y contenido hijo en el diálogo', () => {
    render(
      <Modal title="Nueva Cuenta">
        <p>Formulario de prueba</p>
      </Modal>
    )

    expect(screen.getByRole('dialog', { name: 'Nueva Cuenta' })).toBeInTheDocument()
    expect(screen.getByText('Nueva Cuenta')).toBeInTheDocument()
    expect(screen.getByText('Formulario de prueba')).toBeInTheDocument()
  })

  it('cierra el modal y llama a router.back() al hacer click en el botón de cerrar', () => {
    render(
      <Modal title="Nueva Cuenta">
        <p>Contenido</p>
      </Modal>
    )

    fireEvent.click(screen.getByRole('button', { name: /cerrar/i }))
    expect(mockBack).toHaveBeenCalledTimes(1)
  })

  it('cierra el modal al presionar la tecla Escape', () => {
    render(
      <Modal title="Nueva Cuenta">
        <p>Contenido</p>
      </Modal>
    )

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(mockBack).toHaveBeenCalledTimes(1)
  })
})
