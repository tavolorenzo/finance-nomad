import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { WhatsAppTemplateForm } from '@/components/WhatsAppTemplateForm'
import type { UserSettings } from '@/lib/types'

export default async function WhatsAppTemplatePage() {
  const supabase = await createClient()

  const { data: settings } = await supabase
    .from('user_settings')
    .select('whatsapp_template')
    .maybeSingle<Pick<UserSettings, 'whatsapp_template'>>()

  return (
    <main className="max-w-xl mx-auto p-4 md:p-6 space-y-4">
      <Link
        href="/people"
        className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition"
      >
        <span>←</span>
        <span>Volver a Personas</span>
      </Link>

      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Plantilla de WhatsApp</h1>
        <p className="text-xs text-text-muted mt-1">
          Configurá el formato predeterminado para los mensajes de cobranza y detalle de gastos compartidos.
        </p>
      </div>

      <div className="bg-surface-1 border border-border rounded-card">
        <WhatsAppTemplateForm initialTemplate={settings?.whatsapp_template ?? null} />
      </div>
    </main>
  )
}
