import { createClient } from '@/lib/supabase/server'
import { LoanForm } from '@/components/LoanForm'
import type { Account, Institution, Person } from '@/lib/types'

export default async function NewLoanPage() {
  const supabase = await createClient()

  let institutions: Institution[] = []
  let people: Person[] = []
  let accounts: (Account & { institutions?: { name: string } | null })[] = []

  try {
    const [instRes, peopleRes, accRes] = await Promise.all([
      supabase.from('institutions').select('*').eq('is_active', true).order('name'),
      supabase.from('people').select('*').neq('name', 'Personal').eq('is_active', true).order('name'),
      supabase.from('accounts').select('*, institutions(name)').eq('is_active', true).order('name')
    ])

    institutions = (instRes.data as Institution[]) ?? []
    people = (peopleRes.data as Person[]) ?? []
    accounts = (accRes.data as unknown as (Account & { institutions?: { name: string } | null })[]) ?? []
  } catch {
    // Si falla la red, el formulario cargará con catálogos vacíos
  }

  return (
    <main className="max-w-4xl mx-auto p-4 md:p-6">
      <LoanForm
        institutions={institutions}
        people={people}
        accounts={accounts}
      />
    </main>
  )
}
