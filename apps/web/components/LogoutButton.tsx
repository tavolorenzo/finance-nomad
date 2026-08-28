'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'

export function LogoutButton({ variant = 'row' }: { variant?: 'row' | 'icon' }) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (variant === 'icon') {
    return (
      <button onClick={handleLogout} aria-label="Cerrar sesión" className="text-text-secondary">
        <LogOut size={18} />
      </button>
    )
  }

  return (
    <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-text-secondary py-2">
      <LogOut size={16} /> Cerrar sesión
    </button>
  )
}
