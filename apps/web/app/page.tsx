import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth-helper'

export default async function RootPage() {
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)
  redirect(user ? '/dashboard' : '/login')
}

