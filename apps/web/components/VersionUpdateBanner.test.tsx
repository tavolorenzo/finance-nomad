import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { VersionUpdateBanner } from './VersionUpdateBanner'

describe('VersionUpdateBanner', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(window.navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true
    })
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('no muestra el banner cuando el servidor reporta la misma versión', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: '2.25.0', commitSha: 'abc1234', env: 'production' })
    }) as any

    const { container } = render(
      <VersionUpdateBanner clientVersion="2.25.0" clientCommitSha="abc1234" />
    )

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/version',
        expect.objectContaining({ method: 'GET', cache: 'no-store' })
      )
    })
    expect(container.firstChild).toBeNull()
  })

  it('muestra el banner cuando el servidor reporta una nueva versión y permite recargar limpiando caché', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: '2.26.0', commitSha: 'def5678', env: 'production' })
    }) as any

    const deleteCacheMock = vi.fn().mockResolvedValue(true)
    Object.defineProperty(window, 'caches', {
      value: {
        keys: vi.fn().mockResolvedValue(['fn-static-v1', 'other-cache']),
        delete: deleteCacheMock
      },
      writable: true,
      configurable: true
    })

    const onReloadMock = vi.fn()

    render(
      <VersionUpdateBanner
        clientVersion="2.25.0"
        clientCommitSha="abc1234"
        onReload={onReloadMock}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Nueva versión disponible')).toBeInTheDocument()
    })
    expect(screen.getByText('(v2.26.0)')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Actualizar \/ Recargar/i }))

    await waitFor(() => {
      expect(deleteCacheMock).toHaveBeenCalledWith('fn-static-v1')
      expect(deleteCacheMock).not.toHaveBeenCalledWith('other-cache')
      expect(onReloadMock).toHaveBeenCalledTimes(1)
    })
  })

  it('permite posponer el aviso cerrando el banner', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: '2.26.0', commitSha: 'def5678', env: 'production' })
    }) as any

    render(<VersionUpdateBanner clientVersion="2.25.0" />)

    await waitFor(() => {
      expect(screen.getByText('Nueva versión disponible')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Posponer actualización/i }))

    expect(screen.queryByText('Nueva versión disponible')).not.toBeInTheDocument()
  })

  it('no consulta /api/version si el dispositivo está offline', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true
    })
    global.fetch = vi.fn() as any

    render(<VersionUpdateBanner clientVersion="2.25.0" />)

    expect(global.fetch).not.toHaveBeenCalled()
  })
})

