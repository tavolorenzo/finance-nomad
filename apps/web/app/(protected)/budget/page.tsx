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
    <main className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Presupuesto</h1>
        <p className="text-xs text-text-muted mt-0.5">Control de gastos fijos e ingresos proyectados del mes</p>
      </div>

      {(!estimates || estimates.length === 0) && (
        <div className="bg-surface-1 border border-border rounded-card p-8 text-center text-sm text-text-muted">
          Definí tus gastos fijos para ver el avance y control del mes.
        </div>
      )}

      {expenseEstimates.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-base font-semibold tracking-tight text-text-primary">Gastos fijos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {expenseEstimates.map((e) => {
              const real = realByCategory.get(e.category_id) ?? 0
              const pct = Math.min(100, Math.round((real / e.estimated_amount) * 100))
              const done = real >= e.estimated_amount
              return (
                <div key={e.id} className="bg-surface-1 border border-border rounded-card p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{e.name}</p>
                      <p className="text-xs text-text-muted">
                        {(e as any).categories?.name} · vence el {e.due_day}
                      </p>
                    </div>
                    <ExecutePaymentButton estimateId={e.id} disabled={done} />
                  </div>
                  <div>
                    <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${done ? 'bg-income' : 'bg-accent'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-xs text-text-muted mt-1.5 font-mono">
                      <span>{pct}% cubierto</span>
                      <span>
                        {formatMoney(real, e.currency)} / {formatMoney(e.estimated_amount, e.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {incomeEstimates.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-base font-semibold tracking-tight text-text-primary">Ingresos proyectados</h2>
          <div className="bg-surface-1 border border-border rounded-card divide-y divide-border px-4 py-1">
            {incomeEstimates.map((e) => (
              <div key={e.id} className="flex justify-between items-center py-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">{e.name}</p>
                  <p className="text-xs text-text-muted">Día de acreditación: {e.due_day}</p>
                </div>
                <span className="font-mono text-sm font-semibold text-income">
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
