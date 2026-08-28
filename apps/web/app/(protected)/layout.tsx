import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navigation } from '@/components/Navigation'

export default async function ProtectedLayout({
  children,
  modal
}: {
  children: React.ReactNode
  modal: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // El middleware ya redirige, esto es defensa en profundidad por si el
  // layout se renderiza en un contexto donde el middleware no corrió.
  if (!user) redirect('/login')

  return (
    <div>
      <Navigation />
      <div className="md:pl-56 pb-20 md:pb-0">{children}</div>
      {/* Wrapper estable: @modal a veces es null y Next inyecta un placeholder
          distinto en servidor vs cliente si el slot queda suelto. */}
      <div>{modal}</div>
    </div>
  )
}
