import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { Navigation } from './Navigation'
import * as navigation from 'next/navigation'
import * as versionModule from '@/lib/version'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn()
}))

vi.mock('@/lib/version', () => ({
  getEnvironmentInfo: vi.fn()
}))

vi.mock('./LogoutButton', () => ({
  LogoutButton: () => <button>Cerrar sesión mock</button>
}))

vi.mock('./SyncStatusBadge', () => ({
  SyncStatusBadge: () => <div>Sync Badge Mock</div>
}))

vi.mock('@/lib/ledger/ledger-context', () => ({
  useOptionalLedger: vi.fn(),
  useLedger: vi.fn()
}))

import * as ledgerModule from '@/lib/ledger/ledger-context'

describe('Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(navigation.usePathname).mockReturnValue('/dashboard')
    vi.mocked(versionModule.getEnvironmentInfo).mockReturnValue({
      version: '2.8.0',
      env: 'production',
      label: 'Producción',
      description: 'Producción',
      isProduction: true,
      isDevelopment: false,
      isStaging: false,
      supabaseHost: 'prod.supabase.co'
    })
  })

  it('renderiza elementos principales de navegación', () => {
    render(<Navigation />)
    expect(screen.getAllByText('Inicio')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Cuentas')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Movimientos')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Cerrar sesión mock')[0]).toBeInTheDocument()
  })

  it('muestra "Tarjetas de crédito" en navegación cuando el usuario tiene plásticos activos', () => {
    vi.mocked(ledgerModule.useOptionalLedger).mockReturnValue({
      accounts: [
        { id: 'card-1', name: 'Visa Infinite', type: 'credit_card', is_active: true } as any
      ]
    } as any)

    render(<Navigation />)
    const cardNavItems = screen.getAllByText('Tarjetas de crédito')
    expect(cardNavItems.length).toBeGreaterThan(0)
  })

  it('abre y cierra el menú Más en móvil', () => {
    render(<Navigation />)
    const moreBtn = screen.getByRole('button', { name: /más/i })
    fireEvent.click(moreBtn)

    const dialog = screen.getByRole('dialog', { name: /más opciones/i })
    expect(dialog).toBeInTheDocument()

    const closeBtn = within(dialog).getByRole('button', { name: 'Cerrar' })
    fireEvent.click(closeBtn)

    expect(screen.queryByRole('dialog', { name: /más opciones/i })).not.toBeInTheDocument()
  })
})
