import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PersonForm } from '@/components/PersonForm'
import type { Person } from '@/lib/types'

export default async function NewPersonPage() {
  const supabase = await createClient()
  const { data: people } = await supabase.from('people').select('*').returns<Person[]>()

  return (
    <main className="max-w-md mx-auto p-4 space-y-4">
      <Link
        href="/people"
        className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition"
      >
        <span>←</span>
        <span>Volver a Personas</span>
      </Link>
      <h1 className="font-display text-xl font-bold tracking-tight">Nueva persona</h1>
      <div className="bg-surface-2 border border-border rounded-card">
        <PersonForm existingPeople={people ?? []} />
      </div>
    </main>
  )
}
