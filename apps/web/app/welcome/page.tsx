import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth-helper'
import { WelcomeWizard } from '@/components/WelcomeWizard'

export const metadata = {
  title: 'Bienvenido a Finance Nomad — Configuración Inicial',
  description: 'Inicializá tu espacio con tus cuentas, divisas y categorías favoritas'
}

export default async function WelcomePage() {
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)
  if (!user) redirect('/login')

  // Acceso exclusivo para usuarios nuevos: si ya tiene cuentas o completó el onboarding, redirigir al Dashboard
  const [settingsRes, accountsRes] = await Promise.all([
    supabase.from('user_settings').select('onboarding_completed').eq('user_id', user.id).maybeSingle(),
    supabase.from('accounts').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_active', true)
  ])

  if (settingsRes.data?.onboarding_completed || (accountsRes.count && accountsRes.count > 0)) {
    redirect('/dashboard')
  }

  return <WelcomeWizard />
}
