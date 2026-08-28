import { InstitutionForm } from '@/components/InstitutionForm'

export default function NewInstitutionPage() {
  return (
    <main className="max-w-md mx-auto py-4">
      <h1 className="font-display text-xl font-medium px-4 mb-3">Nueva institución</h1>
      <div className="bg-surface-2 border border-border rounded-card">
        <InstitutionForm />
      </div>
    </main>
  )
}
