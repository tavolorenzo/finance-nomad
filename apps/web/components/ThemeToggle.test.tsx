import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeToggle } from './ThemeToggle'

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    vi.clearAllMocks()
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes('dark'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  })

  it('renderiza botones de tema claro, oscuro y sistema', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('button', { name: /claro/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /oscuro/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sistema/i })).toBeInTheDocument()
  })

  it('aplica tema claro al hacer click y lo guarda en localStorage', () => {
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button', { name: /claro/i }))

    expect(localStorage.getItem('theme')).toBe('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('aplica tema oscuro al hacer click y lo guarda en localStorage', () => {
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button', { name: /oscuro/i }))

    expect(localStorage.getItem('theme')).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('aplica tema sistema removiendo clave de localStorage', () => {
    localStorage.setItem('theme', 'dark')
    render(<ThemeToggle />)

    fireEvent.click(screen.getByRole('button', { name: /sistema/i }))
    expect(localStorage.getItem('theme')).toBeNull()
  })
})
