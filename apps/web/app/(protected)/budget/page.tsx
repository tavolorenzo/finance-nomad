import { createClient } from '@/lib/supabase/server'
import { formatMoney } from '@/lib/currency'
import { ExecutePaymentButton } from '@/components/ExecutePaymentButton'

function monthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10)
  return { start, end }
}

export default async function BudgetPage() {
  const supabase = await createClient()
  const { start, end } = monthRange()

  const { data: estimates } = await supabase
    .from('budget_estimates')
    .select('*, categories(name)')
    .eq('is_active', true)
    .order('due_day', { ascending: true })

  const categoryIds = (estimates ?? []).map((e) => e.category_id)
  const realByCategory = new Map<string, number>()

  if (categoryIds.length > 0) {
    const { data: monthTx } = await supabase
      .from('master_transactions')
      .select('amount_account, category_id, type')
      .in('category_id', categoryIds)
      .gte('date', start)
      .lte('date', end)

    for (const t of monthTx ?? []) {
      if (!t.category_id) continue
      const sign = t.type === 'OUTCOME' ? 1 : -1 // gasto ejecutado cuenta como "cubierto"
      realByCategory.set(t.category_id, (realByCategory.get(t.category_id) ?? 0) + sign * t.amount_account)
    }
  }

  const incomeEstimates = (estimates ?? []).filter((e) => e.type === 'INCOME_ESTIMATE')
  const expenseEstimates = (estimates ?? []).filter((e) => e.type === 'EXPENSE_ESTIMATE')

  return (
    <main className="max-w-md mx-auto p-4 space-y-4">
      <h1 className="font-display text-xl font-medium">Presupuesto</h1>

      {(!estimates || estimates.length === 0) && (
        <p className="text-sm text-text-muted">
          Definí tus gastos fijos para ver el avance del mes.
        </p>
      )}

      {expenseEstimates.length > 0 && (
        <section>
          <p className="font-display text-base font-medium mb-2">Gastos fijos</p>
          <div className="space-y-2">
            {expenseEstimates.map((e) => {
              const real = realByCategory.get(e.category_id) ?? 0
              const pct = Math.min(100, Math.round((real / e.estimated_amount) * 100))
              const done = real >= e.estimated_amount
              return (
                <div key={e.id} className="bg-surface-1 border border-border rounded-card p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-medium">{e.name}</p>
                      <p className="text-xs text-text-muted">
                        {(e as any).categories?.name} · vence el {e.due_day}
                      </p>
                    </div>
                    <ExecutePaymentButton estimateId={e.id} disabled={done} />
                  </div>
                  <div className="h-1.5 bg-surface-0 rounded-full overflow-hidden">
                    <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    {formatMoney(real, e.currency)} de {formatMoney(e.estimated_amount, e.currency)}
                  </p>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {incomeEstimates.length > 0 && (
        <section>
          <p className="font-display text-base font-medium mb-2">Ingresos proyectados</p>
          <div className="space-y-2">
            {incomeEstimates.map((e) => (
              <div key={e.id} className="flex justify-between items-center bg-surface-1 border border-border rounded-card p-3">
                <div>
                  <p className="text-sm font-medium">{e.name}</p>
                  <p className="text-xs text-text-muted">día {e.due_day}</p>
                </div>
                <span className="font-mono amount text-sm text-income">
                  {formatMoney(e.estimated_amount, e.currency)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
