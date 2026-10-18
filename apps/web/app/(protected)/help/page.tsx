import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth-helper'
import { HelpCenter } from '@/components/HelpCenter'

export const metadata: Metadata = {
  title: 'Ayuda & Wiki — Finance Nomad',
  description: 'Preguntas frecuentes, guías interactivas y documentación de funcionalidades para nómadas y viajeros.'
}

export default async function HelpPage() {
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)
  let displayCurrency = 'EUR'

  if (user) {
    try {
      const { data } = await supabase
        .from('user_settings')
        .select('display_currency')
        .eq('user_id', user.id)
        .maybeSingle()

      if (data?.display_currency) {
        displayCurrency = data.display_currency
      }
    } catch {
      // Modo offline: se usa EUR como fallback seguro
    }
  }

  return (
    <main className="max-w-4xl mx-auto p-4 md:p-6 pb-24 md:pb-12">
      <HelpCenter currentCurrency={displayCurrency} />
    </main>
  )
}
