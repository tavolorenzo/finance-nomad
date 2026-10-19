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

  return <WelcomeWizard />
}
