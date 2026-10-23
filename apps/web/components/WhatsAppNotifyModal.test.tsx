import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WhatsAppNotifyModal } from './WhatsAppNotifyModal'
import type { Person } from '@/lib/types'

describe('WhatsAppNotifyModal', () => {
  const mockClose = vi.fn()
  const mockPerson: Person = {
    id: 'per-1',
    name: 'Gladys',
    phone: '+59899123456',
    is_active: true,
    created_at: new Date().toISOString()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    window.open = vi.fn()
  })

  it('no renderiza nada si isOpen es false', () => {
    render(
      <WhatsAppNotifyModal
        isOpen={false}
        onClose={mockClose}
        person={mockPerson}
        initialMessage="Hola Gladys"
      />
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renderiza modal con datos de la persona y mensaje', () => {
    render(
      <WhatsAppNotifyModal
        isOpen={true}
        onClose={mockClose}
        person={mockPerson}
        initialMessage="Hola Gladys, debés $ 500"
      />
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Gladys')).toBeInTheDocument()
    expect(screen.getByText('+59899123456')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveValue('Hola Gladys, debés $ 500')
  })

  it('abre WhatsApp Web con el enlace codificado al enviar', () => {
    render(
      <WhatsAppNotifyModal
        isOpen={true}
        onClose={mockClose}
        person={mockPerson}
        initialMessage="Hola Gladys"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /abrir en whatsapp/i }))

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('https://wa.me/59899123456?text=Hola%20Gladys'),
      '_blank'
    )
    expect(mockClose).toHaveBeenCalledTimes(1)
  })

  it('cierra modal al presionar Escape', () => {
    render(
      <WhatsAppNotifyModal
        isOpen={true}
        onClose={mockClose}
        person={mockPerson}
        initialMessage="Hola Gladys"
      />
    )

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(mockClose).toHaveBeenCalledTimes(1)
  })
})
