import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WhatsAppTemplateForm } from './WhatsAppTemplateForm'
import * as peopleActions from '@/app/(protected)/people/actions'
import * as onlineStatus from '@/lib/hooks/use-online-status'
import * as modalModule from '@/components/Modal'
import * as navigation from 'next/navigation'

vi.mock('@/app/(protected)/people/actions', () => ({
  updateWhatsAppTemplate: vi.fn()
}))

vi.mock('@/lib/hooks/use-online-status', () => ({
  useOnlineStatus: vi.fn()
}))

vi.mock('@/components/Modal', () => ({
  useModal: vi.fn()
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn()
}))

describe('WhatsAppTemplateForm', () => {
  const mockClose = vi.fn()
  const mockRefresh = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(onlineStatus.useOnlineStatus).mockReturnValue(true)
    vi.mocked(modalModule.useModal).mockReturnValue({ isModal: false, close: mockClose })
    vi.mocked(navigation.useRouter).mockReturnValue({ refresh: mockRefresh } as any)
  })

  it('renderiza variables disponibles y textarea con plantilla inicial', () => {
    render(<WhatsAppTemplateForm initialTemplate="Hola $Nombre, debés $Total." />)
    expect(screen.getByText('$Nombre')).toBeInTheDocument()
    expect(screen.getByText('$Total')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveValue('Hola $Nombre, debés $Total.')
  })

  it('inserta una variable al hacer click en su chip', () => {
    render(<WhatsAppTemplateForm initialTemplate="Hola" />)
    const chip = screen.getByText('$Nombre')
    fireEvent.click(chip)

    expect(screen.getByRole('textbox')).toHaveValue('$NombreHola')
  })

  it('guarda plantilla exitosamente cuando el usuario está online', async () => {
    vi.mocked(peopleActions.updateWhatsAppTemplate).mockResolvedValue(undefined as any)
    render(<WhatsAppTemplateForm initialTemplate="Plantilla de prueba" />)

    fireEvent.click(screen.getByRole('button', { name: /guardar plantilla/i }))

    await waitFor(() => {
      expect(peopleActions.updateWhatsAppTemplate).toHaveBeenCalledWith('Plantilla de prueba')
      expect(screen.getByText(/¡plantilla guardada!/i)).toBeInTheDocument()
    })
  })

  it('bloquea el submit y muestra advertencia si está offline', () => {
    vi.mocked(onlineStatus.useOnlineStatus).mockReturnValue(false)
    render(<WhatsAppTemplateForm />)

    expect(screen.getByText(/estás sin conexión a internet/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sin conexión a internet/i })).toBeDisabled()
  })
})
