import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { TransactionsList } from '@/components/TransactionsList'
import type { MasterTransaction } from '@/lib/types'

export default async function TransactionsPage() {
  const supabase = await createClient()
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  // Carga inicial optimizada: últimos 10 días o hasta 50 movimientos
  let transactions: MasterTransaction[] = []
  try {
    const { data } = await supabase
      .from('master_transactions')
      .select('*')
      .gte('date', tenDaysAgo)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50)
      .returns<MasterTransaction[]>()
    transactions = data ?? []
  } catch {
    // Si la conexión a Supabase falla (offline), TransactionsList lee
    // los movimientos locales directamente desde el LedgerContext (IndexedDB).
  }

  return (
    <main className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Movimientos</h1>
          <p className="text-xs text-text-muted mt-0.5">Historial reciente de ingresos, egresos y transferencias</p>
        </div>
        <Link
          href="/transactions/new"
          className="inline-flex items-center justify-center gap-1.5 bg-accent text-[color:var(--on-accent)] text-xs font-medium px-3.5 py-2 rounded-control hover:opacity-90 transition self-start sm:self-auto"
        >
          <Plus size={15} /> Cargar movimiento
        </Link>
      </div>

      <TransactionsList initialTransactions={transactions ?? []} />
    </main>
  )
}
