'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon, Laptop } from 'lucide-react'

type Theme = 'light' | 'dark' | 'system'

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system')

  useEffect(() => {
    const saved = localStorage.getItem('theme') as Theme | null
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved)
    } else {
      setTheme('system')
    }
  }, [])

  function applyTheme(next: Theme) {
    setTheme(next)
    if (next === 'system') {
      localStorage.removeItem('theme')
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
    } else {
      localStorage.setItem('theme', next)
      document.documentElement.setAttribute('data-theme', next)
    }
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <button
        type="button"
        onClick={() => applyTheme('light')}
        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full ${
          theme === 'light'
            ? 'bg-accent/15 text-accent font-medium'
            : 'border border-border text-text-secondary'
        }`}
      >
        <Sun size={15} />
        Claro
      </button>

      <button
        type="button"
        onClick={() => applyTheme('dark')}
        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full ${
          theme === 'dark'
            ? 'bg-accent/15 text-accent font-medium'
            : 'border border-border text-text-secondary'
        }`}
      >
        <Moon size={15} />
        Oscuro
      </button>

      <button
        type="button"
        onClick={() => applyTheme('system')}
        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full ${
          theme === 'system'
            ? 'bg-accent/15 text-accent font-medium'
            : 'border border-border text-text-secondary'
        }`}
      >
        <Laptop size={15} />
        Sistema
      </button>
    </div>
  )
}
