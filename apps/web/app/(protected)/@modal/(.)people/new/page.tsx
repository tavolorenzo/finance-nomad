import { PersonForm } from '@/components/PersonForm'
import { Modal } from '@/components/Modal'

export default function NewPersonModal() {
  return (
    <Modal title="Nueva persona">
      <PersonForm />
    </Modal>
  )
}
