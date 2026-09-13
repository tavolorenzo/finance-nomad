import Link from 'next/link'
import { InstitutionForm } from '@/components/InstitutionForm'

export default function NewInstitutionPage() {
  return (
    <main className="max-w-md mx-auto p-4 space-y-4">
      <Link
        href="/accounts"
        className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition"
      >
        <span>←</span>
        <span>Volver a Cuentas</span>
      </Link>
      <h1 className="font-display text-xl font-bold tracking-tight">Nueva institución</h1>
      <div className="bg-surface-2 border border-border rounded-card">
        <InstitutionForm />
      </div>
    </main>
  )
}
