import type { MasterTransaction, Category, Account } from './types'

export type AnalyticsPeriod = 'this_month' | 'last_3_months' | 'last_6_months' | 'this_year' | 'all'

export interface CategoryBreakdownItem {
  categoryId: string
  name: string
  icon: string
  color: string
  total: number
  percentage: number
  count: number
}

export interface MonthlyCashflowItem {
  month: string // "2026-08", "2026-09", etc.
  label: string // "Ago", "Set", etc.
  income: number
  expense: number
  net: number
  savingsRate: number
}

export interface CurrencyBreakdownItem {
  currency: string
  total: number
  count: number
}

export interface AccountTypeBreakdownItem {
  type: string
  label: string
  total: number
  percentage: number
}

export interface AnalyticsKPIs {
  totalExpense: number
  totalIncome: number
  netSavings: number
  savingsRate: number
  dailyAverage: number
  topCategory: { name: string; amount: number } | null
}

const MONTH_NAMES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'
]

function formatDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function getPeriodRange(period: AnalyticsPeriod, today = new Date()): { start: string; end: string; days: number } {
  const end = formatDateString(today)
  const y = today.getFullYear()
  const m = today.getMonth()

  if (period === 'this_month') {
    const start = `${y}-${String(m + 1).padStart(2, '0')}-01`
    const days = Math.max(1, today.getDate())
    return { start, end, days }
  }

  if (period === 'last_3_months') {
    const startDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000)
    return { start: formatDateString(startDate), end, days: 90 }
  }

  if (period === 'last_6_months') {
    const startDate = new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000)
    return { start: formatDateString(startDate), end, days: 180 }
  }

  if (period === 'this_year') {
    const start = `${y}-01-01`
    const diffDays = Math.max(1, Math.round((today.getTime() - new Date(y, 0, 1).getTime()) / (24 * 60 * 60 * 1000)))
    return { start, end, days: diffDays }
  }

  // 'all'
  return { start: '2020-01-01', end, days: 365 }
}

export function filterTransactionsByPeriod(
  transactions: MasterTransaction[],
  period: AnalyticsPeriod,
  today = new Date()
): MasterTransaction[] {
  const { start, end } = getPeriodRange(period, today)
  return transactions.filter((t) => t.date >= start && t.date <= end)
}

export function computeAnalyticsKPIs(
  transactions: MasterTransaction[],
  periodDays: number,
  categoryMap: Map<string, Category>
): AnalyticsKPIs {
  let totalExpense = 0
  let totalIncome = 0
  const categoryExpenses = new Map<string, number>()

  for (const t of transactions) {
    if (t.status !== 'COMPLETED') continue

    if (t.type === 'OUTCOME') {
      const amt = Number(t.amount_account || 0)
      totalExpense += amt
      if (t.category_id) {
        categoryExpenses.set(t.category_id, (categoryExpenses.get(t.category_id) ?? 0) + amt)
      }
    } else if (t.type === 'INCOME') {
      totalIncome += Number(t.amount_account || 0)
    }
  }

  totalExpense = Math.round(totalExpense * 100) / 100
  totalIncome = Math.round(totalIncome * 100) / 100
  const netSavings = Math.round((totalIncome - totalExpense) * 100) / 100
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0
  const dailyAverage = periodDays > 0 ? Math.round((totalExpense / periodDays) * 100) / 100 : 0

  let topCategory: { name: string; amount: number } | null = null
  let maxCatAmount = 0
  for (const [catId, amount] of categoryExpenses.entries()) {
    if (amount > maxCatAmount) {
      maxCatAmount = amount
      topCategory = {
        name: categoryMap.get(catId)?.name ?? 'Sin categoría',
        amount: Math.round(amount * 100) / 100
      }
    }
  }

  return {
    totalExpense,
    totalIncome,
    netSavings,
    savingsRate,
    dailyAverage,
    topCategory
  }
}

export function computeCategoryBreakdown(
  transactions: MasterTransaction[],
  categories: Category[]
): CategoryBreakdownItem[] {
  const catMap = new Map<string, Category>(categories.map((c) => [c.id, c]))
  const expenseMap = new Map<string, { total: number; count: number }>()
  let overallExpense = 0

  for (const t of transactions) {
    if (t.status !== 'COMPLETED' || t.type !== 'OUTCOME') continue
    const amt = Number(t.amount_account || 0)
    overallExpense += amt
    const key = t.category_id ?? 'uncategorized'
    const curr = expenseMap.get(key) ?? { total: 0, count: 0 }
    expenseMap.set(key, { total: curr.total + amt, count: curr.count + 1 })
  }

  if (overallExpense === 0) return []

  const result: CategoryBreakdownItem[] = []
  for (const [key, stats] of expenseMap.entries()) {
    const cat = catMap.get(key)
    const pct = Math.round((stats.total / overallExpense) * 1000) / 10
    result.push({
      categoryId: key,
      name: cat?.name ?? 'Sin categoría',
      icon: cat?.icon ?? 'tag',
      color: cat?.color ?? 'accent',
      total: Math.round(stats.total * 100) / 100,
      percentage: pct,
      count: stats.count
    })
  }

  return result.sort((a, b) => b.total - a.total)
}

export function computeMonthlyCashflow(
  transactions: MasterTransaction[]
): MonthlyCashflowItem[] {
  const months = new Map<string, { income: number; expense: number }>()

  for (const t of transactions) {
    if (t.status !== 'COMPLETED') continue
    const m = t.date.slice(0, 7) // "YYYY-MM"
    const curr = months.get(m) ?? { income: 0, expense: 0 }

    if (t.type === 'INCOME') {
      curr.income += Number(t.amount_account || 0)
    } else if (t.type === 'OUTCOME') {
      curr.expense += Number(t.amount_account || 0)
    }
    months.set(m, curr)
  }

  const sortedKeys = Array.from(months.keys()).sort()
  return sortedKeys.map((m) => {
    const val = months.get(m)!
    const monthNum = parseInt(m.slice(5, 7), 10) - 1
    const label = MONTH_NAMES[monthNum] || m
    const net = Math.round((val.income - val.expense) * 100) / 100
    const savingsRate = val.income > 0 ? Math.round(((val.income - val.expense) / val.income) * 100) : 0
    return {
      month: m,
      label,
      income: Math.round(val.income * 100) / 100,
      expense: Math.round(val.expense * 100) / 100,
      net,
      savingsRate
    }
  })
}

export function computeCurrencyBreakdown(
  transactions: MasterTransaction[]
): CurrencyBreakdownItem[] {
  const map = new Map<string, { total: number; count: number }>()

  for (const t of transactions) {
    if (t.status !== 'COMPLETED' || t.type !== 'OUTCOME') continue
    const curr = t.currency_original || 'EUR'
    const amt = Number(t.amount_original || 0)
    const prev = map.get(curr) ?? { total: 0, count: 0 }
    map.set(curr, { total: prev.total + amt, count: prev.count + 1 })
  }

  return Array.from(map.entries())
    .map(([currency, stats]) => ({
      currency,
      total: Math.round(stats.total * 100) / 100,
      count: stats.count
    }))
    .sort((a, b) => b.count - a.count)
}
