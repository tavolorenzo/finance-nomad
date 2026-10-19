import Link from 'next/link'
import { HelpCircle, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth-helper'
import { CurrencySelector } from '@/components/CurrencySelector'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LogoutButton } from '@/components/LogoutButton'
import { SendResetLinkButton } from '@/components/SendResetLinkButton'
import { UpdatePasswordForm } from '@/components/UpdatePasswordForm'
import { SystemInfoCard } from '@/components/SystemInfoCard'
import { TourTriggerButton } from '@/components/TourTriggerButton'

export default async function SettingsPage() {
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)
  let settings: { display_currency: string } | null = null

  if (user) {
    try {
      const { data } = await supabase
        .from('user_settings')
        .select('display_currency')
        .eq('user_id', user.id)
        .maybeSingle()
      settings = data
    } catch {
      // Modo offline
    }
  }

  return (
    <main className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
      <h1 className="font-display text-xl font-medium">Ajustes</h1>

      <div className="bg-surface-1 border border-border rounded-card p-4">
        <p className="text-sm font-medium text-text-secondary mb-2">Apariencia</p>
        <ThemeToggle />
        <p className="text-xs text-text-muted mt-2">
          Elegí entre tema claro, oscuro o según la preferencia de tu sistema.
        </p>
      </div>

      <div className="bg-surface-1 border border-border rounded-card p-4">
        <p className="text-sm font-medium text-text-secondary mb-2">Moneda global</p>
        <CurrencySelector current={settings?.display_currency ?? 'EUR'} />
        <p className="text-xs text-text-muted mt-2">
          El patrimonio neto y los totales del dashboard se muestran en esta moneda.
        </p>
      </div>

      <div className="bg-surface-1 border border-border rounded-card p-4 space-y-3">
        <div>
          <p className="text-sm font-medium text-text-secondary">Guía y Aprendizaje</p>
          <p className="text-xs text-text-muted mt-0.5">
            Consultá la documentación completa, preguntas frecuentes o repasá el tour guiado interactivo.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/help"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-control text-sm font-medium bg-accent text-[color:var(--on-accent)] hover:opacity-90 transition shadow-sm"
          >
            <HelpCircle size={16} />
            Centro de Ayuda & Wiki
          </Link>
          <TourTriggerButton currentCurrency={settings?.display_currency ?? 'EUR'} />
          <Link
            href="/welcome"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-control text-sm font-medium bg-surface-2 text-text-primary hover:bg-surface-0 border border-border transition"
          >
            <Sparkles size={16} className="text-accent" />
            Asistente Inicial
          </Link>
        </div>
      </div>

      <div className="bg-surface-1 border border-border rounded-card p-4 space-y-3">
        <p className="text-sm text-text-secondary">Cuenta</p>
        <p className="text-sm">{user?.email}</p>
        <LogoutButton />
      </div>

      <div className="bg-surface-1 border border-border rounded-card p-4 space-y-3">
        <p className="text-sm text-text-secondary">Contraseña</p>
        <p className="text-xs text-text-muted">
          Cambiala acá o mandate un link al email para restablecerla.
        </p>
        <UpdatePasswordForm afterSave="/settings" />
        <SendResetLinkButton email={user?.email ?? ''} />
      </div>

      <SystemInfoCard />
    </main>
  )
}
