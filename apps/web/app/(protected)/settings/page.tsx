import { createClient } from '@/lib/supabase/server'
import { CurrencySelector } from '@/components/CurrencySelector'
import { LogoutButton } from '@/components/LogoutButton'
import { SendResetLinkButton } from '@/components/SendResetLinkButton'
import { UpdatePasswordForm } from '@/components/UpdatePasswordForm'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: settings } = await supabase
    .from('user_settings')
    .select('display_currency')
    .eq('user_id', user!.id)
    .maybeSingle()

  return (
    <main className="max-w-md mx-auto p-4 space-y-4">
      <h1 className="font-display text-xl font-medium">Ajustes</h1>

      <div className="bg-surface-1 border border-border rounded-card p-4">
        <p className="text-sm text-text-secondary mb-2">Moneda global</p>
        <CurrencySelector current={settings?.display_currency ?? 'EUR'} />
        <p className="text-xs text-text-muted mt-2">
          El patrimonio neto y los totales del dashboard se muestran en esta moneda.
        </p>
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
    </main>
  )
}
