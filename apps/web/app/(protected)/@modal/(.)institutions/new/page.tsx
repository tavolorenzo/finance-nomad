import { InstitutionForm } from '@/components/InstitutionForm'
import { Modal } from '@/components/Modal'

export default function NewInstitutionModal() {
  return (
    <Modal title="Nueva institución">
      <InstitutionForm />
    </Modal>
  )
}
