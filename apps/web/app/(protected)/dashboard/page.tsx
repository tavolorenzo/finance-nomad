import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatMoney } from '@/lib/currency'
import { getAccountBalances, convertToDisplayCurrency } from '@/lib/networth'
import type { Account, MasterTransaction } from '@/lib/types'

function monthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10)
  return { start, end }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const today = new Date().toISOString().slice(0, 10)

  const { data: settings } = await supabase
    .from('user_settings')
    .select('display_currency')
    .eq('user_id', user!.id)
    .maybeSingle()
  const displayCurrency = settings?.display_currency ?? 'EUR'

  const [{ data: accounts }, { data: transactions }, { data: estimates }] = await Promise.all([
    supabase
      .from('accounts')
      .select('id, name, type, currency_native, institutions!inner(name)')
      .eq('is_active', true)
      .eq('institutions.is_active', true)
      .returns<(Account & { institutions: { name: string } })[]>(),
    supabase
      .from('master_transactions')
      .select('*')
      .order('date', { ascending: false })
      .limit(5)
      .returns<MasterTransaction[]>(),
    supabase.from('budget_estimates').select('*').eq('is_active', true).eq('type', 'EXPENSE_ESTIMATE')
  ])

  const balances = await getAccountBalances(supabase, today)
  const netWorth = await convertToDisplayCurrency(balances, displayCurrency, today)
  const balanceByAccount = new Map(balances.map((b) => [b.accountId, b.balance]))

  // Presupuesto del mes: real gastado (por categoría de los estimados activos) vs. proyectado.
  const { start, end } = monthRange()
  const estimatedTotal = (estimates ?? []).reduce((sum, e) => sum + e.estimated_amount, 0)
  const categoryIds = (estimates ?? []).map((e) => e.category_id)

  let realSpent = 0
  if (categoryIds.length > 0) {
    const { data: monthTx } = await supabase
      .from('master_transactions')
      .select('amount_account, category_id, date, type')
      .in('category_id', categoryIds)
      .eq('type', 'OUTCOME')
      .gte('date', start)
      .lte('date', end)
    realSpent = (monthTx ?? []).reduce((sum, t) => sum + t.amount_account, 0)
  }
  const budgetPct = estimatedTotal > 0 ? Math.min(100, Math.round((realSpent / estimatedTotal) * 100)) : 0

  return (
    <main className="max-w-md mx-auto p-4 space-y-4">
      <div className="bg-surface-1 border border-border rounded-card p-4">
        <p className="text-sm text-text-secondary">Patrimonio neto</p>
        <p className="font-mono amount text-3xl font-medium">
          {formatMoney(netWorth, displayCurrency)}
        </p>
      </div>

      {estimatedTotal > 0 && (
        <div className="bg-surface-2 border border-border rounded-card p-4">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-text-secondary">Presupuesto del mes</span>
            <span className="text-sm font-medium">{budgetPct}%</span>
          </div>
          <div className="h-1.5 bg-surface-1 rounded-full overflow-hidden">
            <div className="h-full bg-accent" style={{ width: `${budgetPct}%` }} />
          </div>
          <p className="text-xs text-text-muted mt-2">
            {formatMoney(realSpent, estimates?.[0]?.currency ?? displayCurrency)} gastados de{' '}
            {formatMoney(estimatedTotal, estimates?.[0]?.currency ?? displayCurrency)} proyectados
          </p>
        </div>
      )}

      <div>
        <p className="font-display text-base font-medium mb-2">Cuentas</p>
        <div className="grid grid-cols-2 gap-2">
          {(accounts ?? []).map((a) => (
            <div key={a.id} className="bg-surface-1 rounded-card p-3">
              <p className="text-xs text-text-muted">{a.institutions?.name} · {a.name}</p>
              <p className="font-mono amount text-base">
                {formatMoney(balanceByAccount.get(a.id) ?? 0, a.currency_native)}
              </p>
            </div>
          ))}
          {(!accounts || accounts.length === 0) && (
            <p className="text-sm text-text-muted col-span-2">
              No tenés cuentas cargadas. Corré supabase/seed.sql para arrancar.
            </p>
          )}
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <p className="font-display text-base font-medium">Movimientos</p>
          <Link href="/transactions/new" className="text-sm text-accent font-medium">
            Cargar movimiento
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
              {t.installment_total > 1 && (
                <span className="text-xs bg-pending/15 text-pending px-2 py-0.5 rounded-full">
                  {t.installment_current} de {t.installment_total}
                </span>
              )}
            </div>
            <p className={`font-mono amount text-sm ${t.type === 'OUTCOME' ? 'text-expense' : 'text-income'}`}>
              {t.type === 'OUTCOME' ? '-' : '+'}{formatMoney(t.amount_account, t.currency_account)}
            </p>
          </div>
        ))}
      </div>
    </main>
  )
}
