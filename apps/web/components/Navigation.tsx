'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  Home, Wallet, Plus, List, Menu, X,
  Users, PiggyBank, Landmark, TrendingUp, Settings
} from 'lucide-react'
import { LogoutButton } from './LogoutButton'

const MAIN_ITEMS = [
  { href: '/dashboard', label: 'Inicio', icon: Home },
  { href: '/accounts', label: 'Cuentas', icon: Wallet },
  { href: '/transactions', label: 'Movimientos', icon: List }
]

// Personas, Presupuesto y Ajustes ya están construidas. Préstamos y
// Portafolio quedan para fase 4.
const MORE_ITEMS = [
  { href: '/people', label: 'Personas', icon: Users, ready: true },
  { href: '/budget', label: 'Presupuesto', icon: PiggyBank, ready: true },
  { href: '/loans', label: 'Préstamos', icon: Landmark, ready: false },
  { href: '/portfolio', label: 'Portafolio', icon: TrendingUp, ready: false },
  { href: '/settings', label: 'Ajustes', icon: Settings, ready: true }
]

function NavLink({ href, label, icon: Icon, active }: any) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-control text-sm ${
        active ? 'bg-accent/15 text-accent font-medium' : 'text-text-secondary'
      }`}
    >
      <Icon size={18} />
      {label}
    </Link>
  )
}

export function Navigation() {
  const pathname = usePathname() ?? ''
  const [moreOpen, setMoreOpen] = useState(false)

  const isActive = (href: string) => {
    if (pathname === href) return true
    if (!pathname.startsWith(href + '/')) return false
    // El formulario vive en /transactions/new; no marcar Movimientos como activo.
    if (href === '/transactions' && pathname.startsWith('/transactions/new')) return false
    return true
  }

  return (
    <div>
      {/* ── Sidebar web (>= md) ── */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-56 md:border-r md:border-border md:bg-surface-1 md:p-4">
        <div className="font-display text-lg font-medium mb-6 px-2">Finance Nomad</div>
        <Link
          href="/transactions/new"
          className="flex items-center justify-center gap-2 w-full mb-4 bg-accent text-[color:var(--on-accent)] py-2.5 rounded-control text-sm font-medium"
        >
          <Plus size={16} />
          Cargar movimiento
        </Link>
        <nav className="flex-1 space-y-1">
          {MAIN_ITEMS.map((item) => (
            <NavLink key={item.href} {...item} active={isActive(item.href)} />
          ))}
          <div className="h-px bg-border my-3" />
          {MORE_ITEMS.map((item) =>
            item.ready ? (
              <NavLink key={item.href} {...item} active={isActive(item.href)} />
            ) : (
              <div key={item.href} className="flex items-center gap-3 px-3 py-2 text-sm text-text-muted">
                <item.icon size={18} />
                {item.label}
                <span className="text-xs">· pronto</span>
              </div>
            )
          )}
        </nav>
        <div className="border-t border-border pt-3">
          <LogoutButton />
        </div>
      </aside>

      {/* ── Tab bar mobile (< md) ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-surface-1 border-t border-border flex items-center justify-around py-2 z-40">
        {MAIN_ITEMS.slice(0, 2).map((item) => (
          <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1 px-2">
            <item.icon size={20} className={isActive(item.href) ? 'text-accent' : 'text-text-secondary'} />
            <span className={`text-[11px] ${isActive(item.href) ? 'text-accent' : 'text-text-secondary'}`}>
              {item.label}
            </span>
          </Link>
        ))}

        <Link
          href="/transactions/new"
          aria-label="Nuevo movimiento"
          className="flex items-center justify-center w-12 h-12 -mt-6 rounded-full bg-accent text-[color:var(--on-accent)] shadow-md"
        >
          <Plus size={22} />
        </Link>

        <Link href="/transactions" className="flex flex-col items-center gap-1 px-2">
          <List size={20} className={isActive('/transactions') ? 'text-accent' : 'text-text-secondary'} />
          <span className={`text-[11px] ${isActive('/transactions') ? 'text-accent' : 'text-text-secondary'}`}>
            Movimientos
          </span>
        </Link>

        <button onClick={() => setMoreOpen(true)} className="flex flex-col items-center gap-1 px-2">
          <Menu size={20} className="text-text-secondary" />
          <span className="text-[11px] text-text-secondary">Más</span>
        </button>
      </nav>

      {/* ── Sheet "Más" mobile ── */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end" role="dialog" aria-label="Más opciones">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMoreOpen(false)} />
          <div className="relative w-full bg-surface-2 rounded-t-card p-4 space-y-1">
            <div className="flex justify-between items-center mb-2">
              <p className="font-display text-base font-medium">Más</p>
              <button onClick={() => setMoreOpen(false)} aria-label="Cerrar">
                <X size={20} className="text-text-secondary" />
              </button>
            </div>
            {MORE_ITEMS.map((item) =>
              item.ready ? (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={`flex items-center gap-3 px-2 py-3 text-sm rounded-control ${
                    isActive(item.href) ? 'text-accent font-medium' : 'text-text-primary'
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              ) : (
                <div key={item.href} className="flex items-center gap-3 px-2 py-3 text-sm text-text-muted">
                  <item.icon size={18} />
                  {item.label}
                  <span className="text-xs">· pronto</span>
                </div>
              )
            )}
            <div className="border-t border-border pt-2 mt-2">
              <LogoutButton />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
