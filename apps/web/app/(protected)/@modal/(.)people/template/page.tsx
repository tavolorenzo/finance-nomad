import { createClient } from '@/lib/supabase/server'
import { WhatsAppTemplateForm } from '@/components/WhatsAppTemplateForm'
import { Modal } from '@/components/Modal'
import type { UserSettings } from '@/lib/types'

export default async function WhatsAppTemplateModal() {
  const supabase = await createClient()

  const { data: settings } = await supabase
    .from('user_settings')
    .select('whatsapp_template')
    .maybeSingle<Pick<UserSettings, 'whatsapp_template'>>()

  return (
    <Modal title="Plantilla de WhatsApp">
      <WhatsAppTemplateForm initialTemplate={settings?.whatsapp_template ?? null} />
    </Modal>
  )
}
