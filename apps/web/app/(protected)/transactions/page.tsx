import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatMoney } from '@/lib/currency'
import type { MasterTransaction } from '@/lib/types'

export default async function TransactionsPage() {
  const supabase = await createClient()
  const { data: transactions } = await supabase
    .from('master_transactions')
    .select('*')
    .order('date', { ascending: false })
    .limit(50)
    .returns<MasterTransaction[]>()

  return (
    <main className="max-w-md mx-auto p-4">
      <div className="flex justify-between items-center mb-3">
        <h1 className="font-display text-xl font-medium">Movimientos</h1>
        <Link href="/transactions/new"
          className="flex items-center gap-1 text-sm text-accent font-medium">
          <Plus size={16} /> Cargar movimiento
        </Link>
      </div>
      {(!transactions || transactions.length === 0) && (
        <p className="text-sm text-text-muted">
          Todavía no cargaste movimientos este mes.{' '}
          <Link href="/transactions/new" className="text-accent font-medium">
            Cargá el primero.
          </Link>
        </p>
      )}
      {(transactions ?? []).map((t) => (
        <div key={t.id} className="flex justify-between items-center py-2 border-b border-border">
          <div>
            <p className="text-sm">{t.notes ?? 'Movimiento'}</p>
            <p className="text-xs text-text-muted">{t.date}</p>
          </div>
          <p className={`font-mono amount text-sm ${t.type === 'OUTCOME' ? 'text-expense' : 'text-income'}`}>
            {t.type === 'OUTCOME' ? '-' : '+'}{formatMoney(t.amount_account, t.currency_account)}
          </p>
        </div>
      ))}
    </main>
  )
}
