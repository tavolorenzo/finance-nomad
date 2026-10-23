import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SystemInfoCard } from './SystemInfoCard'
import * as versionModule from '@/lib/version'

vi.mock('@/lib/version', () => ({
  getEnvironmentInfo: vi.fn()
}))

describe('SystemInfoCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza información de entorno producción correctamente', () => {
    vi.mocked(versionModule.getEnvironmentInfo).mockReturnValue({
      version: '2.8.0',
      env: 'production',
      label: 'Producción',
      description: 'Entorno oficial en producción.',
      isProduction: true,
      isDevelopment: false,
      isStaging: false,
      supabaseHost: 'prod.supabase.co'
    })

    render(<SystemInfoCard />)
    expect(screen.getByText('Sistema y entorno')).toBeInTheDocument()
    expect(screen.getByText('Producción')).toBeInTheDocument()
    expect(screen.getByText('Operando en producción')).toBeInTheDocument()
    expect(screen.getByText('v2.8.0')).toBeInTheDocument()
    expect(screen.getByText('prod.supabase.co')).toBeInTheDocument()
  })

  it('renderiza información de entorno desarrollo con alerta correspondiente', () => {
    vi.mocked(versionModule.getEnvironmentInfo).mockReturnValue({
      version: '2.8.0-dev',
      env: 'development',
      label: 'Desarrollo',
      description: 'Entorno local de prueba.',
      isProduction: false,
      isDevelopment: true,
      isStaging: false,
      supabaseHost: '127.0.0.1:54321'
    })

    render(<SystemInfoCard />)
    expect(screen.getByText('Desarrollo')).toBeInTheDocument()
    expect(screen.getByText('Modo desarrollo activo')).toBeInTheDocument()
    expect(screen.getByText('v2.8.0-dev')).toBeInTheDocument()
  })
})
