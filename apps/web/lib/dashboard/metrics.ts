import type { MasterTransaction, Person, Category, Account, LoanWithInstallments } from '@/lib/types'

export type DashboardPeriod = 'this_month' | 'last_30_days'

export interface DashboardPeriodRange {
  start: string
  end: string
  label: string
}

export type CurrencyConverterSync = (amount: number, fromCurrency: string, toCurrency: string) => number

export function formatDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Calcula el rango de fechas para el selector de período del dashboard.
 */
export function getDashboardPeriodRange(
  mode: DashboardPeriod,
  today = new Date()
): DashboardPeriodRange {
  const todayStr = formatDateStr(today)
  const y = today.getFullYear()
  const m = today.getMonth()

  if (mode === 'this_month') {
    const start = `${y}-${String(m + 1).padStart(2, '0')}-01`
    const lastDay = new Date(y, m + 1, 0).getDate()
    const end = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    return {
      start,
      end,
      label: 'Mes actual'
    }
  }

  // 'last_30_days'
  const past30 = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
  return {
    start: formatDateStr(past30),
    end: todayStr,
    label: 'Últimos 30 días'
  }
}

/**
 * Determina si una transacción corresponde a un consumo de un tercero (gasto compartido a cobrar).
 */
export function isThirdPartyTransaction(
  tx: MasterTransaction,
  peopleById: Map<string, Person>
): boolean {
  if (!tx.person_id) return false
  const person = peopleById.get(tx.person_id)
  if (!person) return false
  return person.name.trim().toLowerCase() !== 'personal'
}

export interface CashFlowMetrics {
  totalIncome: number
  totalPersonalExpenses: number
  totalThirdPartyExpenses: number
  netCashFlow: number
  savingsRate: number
}

/**
 * Calcula el cash flow discriminando consumos personales de gastos asumidos por cuenta de terceros.
 * Excluye rigurosamente transferencias (TRANSFER) y ajustes de saldo (ADJUSTMENT).
 */
export function computeDashboardCashFlow({
  transactions,
  startDate,
  endDate,
  displayCurrency,
  peopleById,
  convert
}: {
  transactions: MasterTransaction[]
  startDate: string
  endDate: string
  displayCurrency: string
  peopleById: Map<string, Person>
  convert: CurrencyConverterSync
}): CashFlowMetrics {
  let totalIncome = 0
  let totalPersonalExpenses = 0
  let totalThirdPartyExpenses = 0

  for (const tx of transactions) {
    if (tx.status !== 'COMPLETED') continue
    if (tx.date < startDate || tx.date > endDate) continue

    const curr = tx.currency_account || displayCurrency
    const amt = Math.abs(Number(tx.amount_account || 0))
    const inDisplay = convert(amt, curr, displayCurrency)

    if (tx.type === 'INCOME') {
      totalIncome += inDisplay
    } else if (tx.type === 'OUTCOME') {
      if (isThirdPartyTransaction(tx, peopleById)) {
        totalThirdPartyExpenses += inDisplay
      } else {
        totalPersonalExpenses += inDisplay
      }
    }
  }

  const netCashFlow = Math.round((totalIncome - totalPersonalExpenses) * 100) / 100
  const savingsRate =
    totalIncome > 0
      ? Math.max(0, Math.min(100, Math.round((netCashFlow / totalIncome) * 100)))
      : 0

  return {
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalPersonalExpenses: Math.round(totalPersonalExpenses * 100) / 100,
    totalThirdPartyExpenses: Math.round(totalThirdPartyExpenses * 100) / 100,
    netCashFlow,
    savingsRate
  }
}

export interface CategorySpendingItem {
  categoryId: string
  name: string
  icon: string
  color: string
  amount: number
  percentage: number
}

/**
 * Calcula los gastos personales agrupados por categoría para el período seleccionado.
 */
export function computeDashboardCategorySpending({
  transactions,
  categoriesById,
  peopleById,
  startDate,
  endDate,
  displayCurrency,
  convert
}: {
  transactions: MasterTransaction[]
  categoriesById: Map<string, Category>
  peopleById: Map<string, Person>
  startDate: string
  endDate: string
  displayCurrency: string
  convert: CurrencyConverterSync
}): CategorySpendingItem[] {
  const totals = new Map<string, number>()
  let overallPersonal = 0

  for (const tx of transactions) {
    if (tx.status !== 'COMPLETED') continue
    if (tx.type !== 'OUTCOME') continue
    if (tx.date < startDate || tx.date > endDate) continue
    if (isThirdPartyTransaction(tx, peopleById)) continue

    const curr = tx.currency_account || displayCurrency
    const amt = Math.abs(Number(tx.amount_account || 0))
    const inDisplay = convert(amt, curr, displayCurrency)

    const catId = tx.category_id || 'uncategorized'
    totals.set(catId, (totals.get(catId) || 0) + inDisplay)
    overallPersonal += inDisplay
  }

  if (overallPersonal === 0) return []

  const items: CategorySpendingItem[] = []
  for (const [catId, amount] of totals.entries()) {
    const cat = categoriesById.get(catId)
    const pct = Math.round((amount / overallPersonal) * 100)
    items.push({
      categoryId: catId,
      name: cat?.name || 'Sin categoría',
      icon: cat?.icon || 'tag',
      color: cat?.color || 'gray',
      amount: Math.round(amount * 100) / 100,
      percentage: pct
    })
  }

  return items.sort((a, b) => b.amount - a.amount)
}

export interface LiabilitiesMetrics {
  cardCurrentDebt: number
  cardFutureDebt: number
  totalCardDebt: number
  loansBorrowedDebt: number
  totalCurrentLiabilities: number
  totalConsolidatedLiabilities: number
}

/**
 * Calcula la deuda híbrida de tarjetas de crédito y préstamos tomados.
 */
export function computeDashboardLiabilities({
  creditCardAccounts,
  balanceByAccount,
  transactions,
  loans,
  todayStr,
  displayCurrency,
  convert
}: {
  creditCardAccounts: Account[]
  balanceByAccount: Map<string, number>
  transactions: MasterTransaction[]
  loans: LoanWithInstallments[]
  todayStr: string
  displayCurrency: string
  convert: CurrencyConverterSync
}): LiabilitiesMetrics {
  const currentPeriod = todayStr.slice(0, 7)
  let cardCurrentDebt = 0
  let cardFutureDebt = 0

  const cardAccountIds = new Set(creditCardAccounts.map((a) => a.id))

  // 1. Deuda corriente en tarjetas: saldo nominal negativo de las cuentas de tarjeta
  for (const card of creditCardAccounts) {
    const bal = balanceByAccount.get(card.id) ?? 0
    if (bal < 0) {
      const inDisplay = convert(Math.abs(bal), card.currency_native, displayCurrency)
      cardCurrentDebt += inDisplay
    }
  }

  // 2. Cuotas futuras diferidas de tarjetas de crédito (compras en cuotas aún no facturadas)
  for (const tx of transactions) {
    if (!cardAccountIds.has(tx.account_id)) continue
    if (tx.type !== 'OUTCOME') continue

    const effectivePeriod = (tx.accounting_period || tx.date.slice(0, 7)).slice(0, 7)
    if (effectivePeriod > currentPeriod) {
      const curr = tx.currency_account || displayCurrency
      const amt = Math.abs(Number(tx.amount_account || 0))
      const inDisplay = convert(amt, curr, displayCurrency)
      cardFutureDebt += inDisplay
    }
  }

  // 3. Saldo adeudado de préstamos tomados (BORROWED)
  let loansBorrowedDebt = 0
  for (const loan of loans) {
    if (!loan.is_active || loan.status !== 'ACTIVE') continue
    if (loan.direction !== 'BORROWED') continue

    const unpaidInstallments = (loan.installments || []).filter((i) => !i.paid)
    const unpaidSum = unpaidInstallments.reduce(
      (sum, i) => sum + Number(i.installment_amount || i.balance || 0),
      0
    )
    const inDisplay = convert(unpaidSum, loan.currency, displayCurrency)
    loansBorrowedDebt += inDisplay
  }

  cardCurrentDebt = Math.round(cardCurrentDebt * 100) / 100
  cardFutureDebt = Math.round(cardFutureDebt * 100) / 100
  loansBorrowedDebt = Math.round(loansBorrowedDebt * 100) / 100

  return {
    cardCurrentDebt,
    cardFutureDebt,
    totalCardDebt: Math.round((cardCurrentDebt + cardFutureDebt) * 100) / 100,
    loansBorrowedDebt,
    totalCurrentLiabilities: Math.round((cardCurrentDebt + loansBorrowedDebt) * 100) / 100,
    totalConsolidatedLiabilities:
      Math.round((cardCurrentDebt + cardFutureDebt + loansBorrowedDebt) * 100) / 100
  }
}

export interface ReceivablesMetrics {
  thirdPartyPending: number
  loansLentPending: number
  totalReceivables: number
}

/**
 * Calcula el total adeudado a favor del usuario (gastos compartidos no saldados + préstamos otorgados).
 */
export function computeDashboardReceivables({
  transactions,
  loans,
  peopleById,
  displayCurrency,
  convert
}: {
  transactions: MasterTransaction[]
  loans: LoanWithInstallments[]
  peopleById: Map<string, Person>
  displayCurrency: string
  convert: CurrencyConverterSync
}): ReceivablesMetrics {
  let thirdPartyPending = 0

  // 1. Gastos compartidos de terceros pendientes de cobro
  for (const tx of transactions) {
    if (tx.type !== 'OUTCOME') continue
    if (!tx.person_id) continue
    if (tx.settled_at) continue
    if (!isThirdPartyTransaction(tx, peopleById)) continue

    const amt = Math.max(0, Number(tx.amount_account || 0) - Number(tx.settled_amount || 0))
    if (amt > 0) {
      const curr = tx.currency_account || displayCurrency
      const inDisplay = convert(amt, curr, displayCurrency)
      thirdPartyPending += inDisplay
    }
  }

  // 2. Préstamos otorgados a cobrar (direction = 'LENT')
  let loansLentPending = 0
  for (const loan of loans) {
    if (!loan.is_active || loan.status !== 'ACTIVE') continue
    if (loan.direction !== 'LENT') continue

    const unpaidInstallments = (loan.installments || []).filter((i) => !i.paid)
    const unpaidSum = unpaidInstallments.reduce(
      (sum, i) => sum + Number(i.installment_amount || i.balance || 0),
      0
    )
    const inDisplay = convert(unpaidSum, loan.currency, displayCurrency)
    loansLentPending += inDisplay
  }

  thirdPartyPending = Math.round(thirdPartyPending * 100) / 100
  loansLentPending = Math.round(loansLentPending * 100) / 100

  return {
    thirdPartyPending,
    loansLentPending,
    totalReceivables: Math.round((thirdPartyPending + loansLentPending) * 100) / 100
  }
}

export interface QuickLoansItem {
  id: string
  name: string
  direction: 'BORROWED' | 'LENT'
  currency: string
  remainingBalance: number
  counterparty: string
  nextInstallment?: {
    period: number
    dueDate: string | null
    amount: number
  } | null
}

export interface QuickLoansSummary {
  activeBorrowedCount: number
  activeLentCount: number
  loans: QuickLoansItem[]
  nextUpcomingInstallment?: {
    loanName: string
    direction: 'BORROWED' | 'LENT'
    dueDate: string | null
    amount: number
    currency: string
  } | null
}

/**
 * Genera el resumen compacto para el widget de préstamos activos y próximas cuotas.
 */
export function computeQuickLoansSummary(
  loans: LoanWithInstallments[],
  todayStr: string
): QuickLoansSummary {
  const activeLoans = (loans || []).filter((l) => l.is_active && l.status === 'ACTIVE')
  let activeBorrowedCount = 0
  let activeLentCount = 0

  const items: QuickLoansItem[] = []
  let earliestUpcoming: {
    loanName: string
    direction: 'BORROWED' | 'LENT'
    dueDate: string | null
    amount: number
    currency: string
  } | null = null

  for (const l of activeLoans) {
    if (l.direction === 'BORROWED') activeBorrowedCount++
    if (l.direction === 'LENT') activeLentCount++

    const unpaidInstallments = (l.installments || [])
      .filter((i) => !i.paid)
      .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))

    const remainingBal = unpaidInstallments.reduce(
      (sum, i) => sum + Number(i.installment_amount || i.balance || 0),
      0
    )

    const firstUnpaid = unpaidInstallments[0]
    const nextInst = firstUnpaid
      ? {
          period: firstUnpaid.period,
          dueDate: firstUnpaid.due_date,
          amount: Number(firstUnpaid.installment_amount)
        }
      : null

    const counterparty =
      l.direction === 'BORROWED'
        ? l.institution?.name || 'Entidad'
        : l.person?.name || 'Tercero'

    items.push({
      id: l.id,
      name: l.name,
      direction: l.direction,
      currency: l.currency,
      remainingBalance: Math.round(remainingBal * 100) / 100,
      counterparty,
      nextInstallment: nextInst
    })

    if (nextInst && nextInst.dueDate) {
      if (!earliestUpcoming || (nextInst.dueDate < (earliestUpcoming.dueDate || '9999-99-99'))) {
        earliestUpcoming = {
          loanName: l.name,
          direction: l.direction,
          dueDate: nextInst.dueDate,
          amount: nextInst.amount,
          currency: l.currency
        }
      }
    }
  }

  return {
    activeBorrowedCount,
    activeLentCount,
    loans: items,
    nextUpcomingInstallment: earliestUpcoming
  }
}
