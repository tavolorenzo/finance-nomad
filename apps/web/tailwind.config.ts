import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          0: 'var(--surface-0)', 1: 'var(--surface-1)', 2: 'var(--surface-2)'
        },
        text: {
          primary: 'var(--text-primary)', secondary: 'var(--text-secondary)', muted: 'var(--text-muted)'
        },
        border: 'var(--border)',
        accent: 'var(--accent)',
        income: 'var(--income)',
        expense: 'var(--expense)',
        pending: 'var(--pending)'
      },
      fontFamily: {
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        card: '16px',
        control: '10px'
      }
    }
  },
  darkMode: ['class', '[data-theme="dark"]'],
  plugins: []
}
export default config
