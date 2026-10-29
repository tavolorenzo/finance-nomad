import { createClient } from '@/lib/supabase/server'
import { PersonForm } from '@/components/PersonForm'
import { Modal } from '@/components/Modal'
import type { Person } from '@/lib/types'

export default async function NewPersonModal() {
  const supabase = await createClient()
  const { data: people } = await supabase.from('people').select('*').returns<Person[]>()

  return (
    <Modal title="Nueva persona">
      <PersonForm existingPeople={people ?? []} />
    </Modal>
  )
}
