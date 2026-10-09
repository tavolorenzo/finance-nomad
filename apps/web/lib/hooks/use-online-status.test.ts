import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOnlineStatus } from './use-online-status'

describe('useOnlineStatus', () => {
  const originalOnLine = navigator.onLine

  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
      writable: true
    })
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: originalOnLine,
      writable: true
    })
  })

  it('retorna true cuando el navegador está online inicialmente', () => {
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current).toBe(true)
  })

  it('retorna false cuando el navegador está offline inicialmente', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
      writable: true
    })

    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current).toBe(false)
  })

  it('actualiza el estado a false cuando se dispara el evento offline', () => {
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current).toBe(true)

    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: false,
        writable: true
      })
      window.dispatchEvent(new Event('offline'))
    })

    expect(result.current).toBe(false)
  })

  it('actualiza el estado a true cuando se dispara el evento online', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
      writable: true
    })

    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current).toBe(false)

    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: true,
        writable: true
      })
      window.dispatchEvent(new Event('online'))
    })

    expect(result.current).toBe(true)
  })
})
