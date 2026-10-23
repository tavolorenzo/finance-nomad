import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CurrencySelector } from './CurrencySelector'
import * as settingsActions from '@/app/(protected)/settings/actions'
import * as ledgerContext from '@/lib/ledger/ledger-context'
import * as onlineStatus from '@/lib/hooks/use-online-status'

vi.mock('@/app/(protected)/settings/actions', () => ({
  updateDisplayCurrency: vi.fn()
}))

vi.mock('@/lib/ledger/ledger-context', () => ({
  useOptionalLedger: vi.fn()
}))

vi.mock('@/lib/hooks/use-online-status', () => ({
  useOnlineStatus: vi.fn()
}))

describe('CurrencySelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(onlineStatus.useOnlineStatus).mockReturnValue(true)
    vi.mocked(ledgerContext.useOptionalLedger).mockReturnValue(null)
  })

  it('renderiza divisas disponibles y marca la activa', () => {
    render(<CurrencySelector current="EUR" options={['USD', 'EUR', 'AUD']} />)
    const eurBtn = screen.getByRole('button', { name: 'EUR' })
    const usdBtn = screen.getByRole('button', { name: 'USD' })

    expect(eurBtn).toBeInTheDocument()
    expect(usdBtn).toBeInTheDocument()
    expect(eurBtn.className).toContain('text-accent')
  })

  it('actualiza la divisa al hacer click cuando está online', async () => {
    vi.mocked(settingsActions.updateDisplayCurrency).mockResolvedValue(undefined as any)
    render(<CurrencySelector current="EUR" options={['USD', 'EUR']} />)

    const usdBtn = screen.getByRole('button', { name: 'USD' })
    fireEvent.click(usdBtn)

    await waitFor(() => {
      expect(settingsActions.updateDisplayCurrency).toHaveBeenCalledWith('USD')
    })
  })

  it('no ejecuta actualización si el usuario está offline', async () => {
    vi.mocked(onlineStatus.useOnlineStatus).mockReturnValue(false)
    render(<CurrencySelector current="EUR" options={['USD', 'EUR']} />)

    const usdBtn = screen.getByRole('button', { name: 'USD' })
    expect(usdBtn).toBeDisabled()
    fireEvent.click(usdBtn)

    expect(settingsActions.updateDisplayCurrency).not.toHaveBeenCalled()
  })
})
