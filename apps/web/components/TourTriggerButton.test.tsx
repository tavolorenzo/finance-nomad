import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TourTriggerButton } from './TourTriggerButton'

vi.mock('./OnboardingTour', () => ({
  OnboardingTour: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    isOpen ? (
      <div data-testid="onboarding-tour-modal">
        <span>Tour Activo</span>
        <button onClick={onClose}>Cerrar Tour</button>
      </div>
    ) : null
  )
}))

describe('TourTriggerButton', () => {
  it('renderiza botón para ver el tour', () => {
    render(<TourTriggerButton />)
    expect(screen.getByRole('button', { name: /ver tour de bienvenida/i })).toBeInTheDocument()
    expect(screen.queryByTestId('onboarding-tour-modal')).not.toBeInTheDocument()
  })

  it('abre el tour modal al hacer click y lo cierra al invocar onClose', () => {
    render(<TourTriggerButton />)
    const trigger = screen.getByRole('button', { name: /ver tour de bienvenida/i })
    fireEvent.click(trigger)

    expect(screen.getByTestId('onboarding-tour-modal')).toBeInTheDocument()

    const closeBtn = screen.getByRole('button', { name: /cerrar tour/i })
    fireEvent.click(closeBtn)

    expect(screen.queryByTestId('onboarding-tour-modal')).not.toBeInTheDocument()
  })
})
