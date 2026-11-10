import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { ServiceWorkerRegister } from './ServiceWorkerRegister'

describe('ServiceWorkerRegister', () => {
  const originalNavigator = global.navigator

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true
    })
  })

  it('no arroja error si navigator.serviceWorker no existe', () => {
    Object.defineProperty(global, 'navigator', {
      value: {},
      writable: true,
      configurable: true
    })

    expect(() => render(<ServiceWorkerRegister />)).not.toThrow()
  })

  it('invoca register si serviceWorker está disponible en navigator', () => {
    const registerMock = vi.fn().mockResolvedValue({})
    Object.defineProperty(global, 'navigator', {
      value: {
        serviceWorker: {
          register: registerMock
        }
      },
      writable: true,
      configurable: true
    })

    render(<ServiceWorkerRegister />)
    expect(registerMock).toHaveBeenCalledWith('/sw.js')
  })
})

