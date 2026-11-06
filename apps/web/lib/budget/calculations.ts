import type {
  ActiveCurrency,
  BudgetEstimate,
  LoanWithInstallments,
  MasterTransaction,
  Person
} from '@/lib/types'

export type DueStatus = 'covered' | 'overdue' | 'due_today' | 'upcoming' | 'no_due_day'

export interface EnrichedBudgetEstimate extends BudgetEstimate {
  realAmountInEstimateCurrency: number
  realAmountInDisplayCurrency: number
  estimatedAmountInDisplayCurrency: number
  coveragePct: number
  isCovered: boolean
  dueStatus: DueStatus
  daysUntilDue: number | null
}

export interface MonthlyCommitmentItem {
  id: string
  kind: 'CARD_INSTALLMENT' | 'LOAN_INSTALLMENT'
  title: string
  subtitle: string
  amount: number
  currency: string
  amountInDisplayCurrency: number
  installmentCurrent: number
  installmentTotal: number
  dueDateOrPeriod: string
  status: 'COMPLETED' | 'PENDING'
  targetHref: string
}

export interface BudgetMonthSummary {
  period: string // YYYY-MM
  displayCurrency: string
  totalExpenseEstimatedDisplay: number
  totalExpenseRealDisplay: number
  expenseCoveragePct: number
  totalIncomeEstimatedDisplay: number
  totalIncomeRealDisplay: number
  incomeCoveragePct: number
  totalCommitmentsDisplay: number
  projectedSavingsDisplay: number
  expenseEstimates: EnrichedBudgetEstimate[]
  incomeEstimates: EnrichedBudgetEstimate[]
  commitments: MonthlyCommitmentItem[]
}

/**
 * Construye un mapa de tasas de cambio contra displayCurrency a partir de active_currencies manuales
 * y una matriz opcional de tasas de mercado.
 */
export function buildCustomRatesMap(
  displayCurrency: string,
  activeCurrencies?: ActiveCurrency[] | null,
  marketRatesMatrix?: Record<string, number>
): Record<string, number> {
  const rates: Record<string, number> = { ...(marketRatesMatrix ?? {}) }
  const globalCode = displayCurrency.toUpperCase()
  rates[`${globalCode}_${globalCode}`] = 1

  if (Array.isArray(activeCurrencies)) {
    for (const c of activeCurrencies) {
      if (
        c.rate_mode === 'manual' &&
        typeof c.custom_rate_against_global === 'number' &&
        c.custom_rate_against_global > 0
      ) {
        const code = c.code.toUpperCase()
        // 1 [GLOBAL] = custom_rate_against_global [DIVISA]
        rates[`${globalCode}_${code}`] = c.custom_rate_against_global
        rates[`${code}_${globalCode}`] = Math.round((1 / c.custom_rate_against_global) * 1000000) / 1000000
      }
    }
  }

  return rates
}

/**
 * Convierte un monto entre dos monedas usando el mapa de tasas disponible.
 * Soporta cruce directo (FROM_TO), inverso (1 / TO_FROM) o triangular vía displayCurrency / USD.
 */
export function convertAmountSync(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  ratesMap: Record<string, number>,
  pivotCurrency = 'USD'
): number {
  if (!amount || amount === 0) return 0
  const from = (fromCurrency || 'USD').toUpperCase()
  const to = (toCurrency || 'USD').toUpperCase()
  if (from === to) return Math.round(amount * 100) / 100

  const directKey = `${from}_${to}`
  if (typeof ratesMap[directKey] === 'number' && ratesMap[directKey] > 0) {
    return Math.round(amount * ratesMap[directKey] * 100) / 100
  }

  const inverseKey = `${to}_${from}`
  if (typeof ratesMap[inverseKey] === 'number' && ratesMap[inverseKey] > 0) {
    return Math.round((amount / ratesMap[inverseKey]) * 100) / 100
  }

  // Cruce triangular vía pivotCurrency
  const pivot = pivotCurrency.toUpperCase()
  const fromToPivot = ratesMap[`${from}_${pivot}`] ?? (ratesMap[`${pivot}_${from}`] ? 1 / ratesMap[`${pivot}_${from}`] : null)
  const pivotToTo = ratesMap[`${pivot}_${to}`] ?? (ratesMap[`${to}_${pivot}`] ? 1 / ratesMap[`${to}_${pivot}`] : null)

  if (fromToPivot && pivotToTo) {
    return Math.round(amount * fromToPivot * pivotToTo * 100) / 100
  }

  return Math.round(amount * 100) / 100
}

/**
 * Determina si una transacción corresponde a consumo propio ("Personal" o sin persona asignada).
 */
export function isPersonalTransaction(
  tx: Pick<MasterTransaction, 'person_id'>,
  peopleById: Map<string, Person>
): boolean {
  if (!tx.person_id) return true
  const person = peopleById.get(tx.person_id)
  if (!person) return true
  return person.name.trim().toLowerCase() === 'personal'
}

/**
 * Evalúa si una transacción pertenece al período contable YYYY-MM seleccionado.
 * Prioriza `accounting_period` si está definido; de lo contrario usa los primeros 7 caracteres de `date`.
 */
export function matchesBudgetPeriod(
  tx: Pick<MasterTransaction, 'date' | 'accounting_period'>,
  period: string
): boolean {
  if (tx.accounting_period) {
    return tx.accounting_period === period
  }
  return Boolean(tx.date && tx.date.slice(0, 7) === period)
}

/**
 * Calcula el estado de vencimiento de una estimación en relación con la fecha de referencia y el período.
 */
export function evaluateDueStatus(
  dueDay: number | null | undefined,
  isCovered: boolean,
  period: string,
  referenceDate = new Date()
): { dueStatus: DueStatus; daysUntilDue: number | null } {
  if (isCovered) {
    return { dueStatus: 'covered', daysUntilDue: null }
  }
  if (!dueDay || dueDay < 1 || dueDay > 31) {
    return { dueStatus: 'no_due_day', daysUntilDue: null }
  }

  const currentPeriod = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, '0')}`
  if (period < currentPeriod) {
    return { dueStatus: 'overdue', daysUntilDue: -1 }
  }
  if (period > currentPeriod) {
    return { dueStatus: 'upcoming', daysUntilDue: null }
  }

  const todayDay = referenceDate.getDate()
  const diff = dueDay - todayDay
  if (diff === 0) return { dueStatus: 'due_today', daysUntilDue: 0 }
  if (diff < 0) return { dueStatus: 'overdue', daysUntilDue: diff }
  return { dueStatus: 'upcoming', daysUntilDue: diff }
}

/**
 * Calcula el resumen completo del presupuesto para un mes contable (YYYY-MM).
 * Regla de negocio: NUNCA computa TRANSFER ni ADJUSTMENT como consumo o ingreso de presupuesto.
 */
export function computeBudgetMonthSummary({
  period,
  estimates,
  transactions,
  loans = [],
  people = [],
  accountsById = new Map(),
  displayCurrency,
  ratesMap = {},
  referenceDate = new Date()
}: {
  period: string
  estimates: BudgetEstimate[]
  transactions: MasterTransaction[]
  loans?: LoanWithInstallments[]
  people?: Person[]
  accountsById?: Map<string, { name: string; currency_native: string }>
  displayCurrency: string
  ratesMap?: Record<string, number>
  referenceDate?: Date
}): BudgetMonthSummary {
  const peopleById = new Map(people.map((p) => [p.id, p]))
  const activeEstimates = estimates.filter((e) => e.is_active !== false)

  // Filtrar transacciones válidas del período (solo INCOME y OUTCOME propios, nunca TRANSFER ni ADJUSTMENT)
  const periodTransactions = transactions.filter((tx) => {
    if (tx.type !== 'OUTCOME' && tx.type !== 'INCOME') return false
    if (!matchesBudgetPeriod(tx, period)) return false
    // Para el presupuesto personal, excluimos gastos realizados a nombre de terceros
    if (!isPersonalTransaction(tx, peopleById)) return false
    // Consideramos transacciones COMPLETED o cuotas del período contable actual
    if (tx.status !== 'COMPLETED' && tx.accounting_period !== period) return false
    return true
  })

  const enrichEstimate = (est: BudgetEstimate): EnrichedBudgetEstimate => {
    const isExpense = est.type === 'EXPENSE_ESTIMATE'
    const matchingTxs = periodTransactions.filter(
      (tx) => tx.category_id && tx.category_id === est.category_id
    )

    let realInEstCurrency = 0
    for (const tx of matchingTxs) {
      // En un estimado de gasto: OUTCOME suma progreso, INCOME en esa categoría (refund) resta
      // En un estimado de ingreso: INCOME suma progreso, OUTCOME resta
      const sign = isExpense
        ? tx.type === 'OUTCOME'
          ? 1
          : -1
        : tx.type === 'INCOME'
          ? 1
          : -1

      const rawAmount =
        tx.currency_original?.toUpperCase() === est.currency.toUpperCase()
          ? Math.abs(Number(tx.amount_original))
          : tx.currency_account?.toUpperCase() === est.currency.toUpperCase()
            ? Math.abs(Number(tx.amount_account))
            : convertAmountSync(
                Math.abs(Number(tx.amount_account)),
                tx.currency_account,
                est.currency,
                ratesMap,
                displayCurrency
              )

      realInEstCurrency += sign * rawAmount
    }

    realInEstCurrency = Math.max(0, Math.round(realInEstCurrency * 100) / 100)
    const estimatedAmount = Number(est.estimated_amount) || 0
    const coveragePct =
      estimatedAmount > 0 ? Math.min(100, Math.round((realInEstCurrency / estimatedAmount) * 100)) : 0
    const isCovered = estimatedAmount > 0 && realInEstCurrency >= estimatedAmount

    const { dueStatus, daysUntilDue } = evaluateDueStatus(
      est.due_day,
      isCovered,
      period,
      referenceDate
    )

    const estimatedAmountInDisplayCurrency = convertAmountSync(
      estimatedAmount,
      est.currency,
      displayCurrency,
      ratesMap,
      displayCurrency
    )
    const realAmountInDisplayCurrency = convertAmountSync(
      realInEstCurrency,
      est.currency,
      displayCurrency,
      ratesMap,
      displayCurrency
    )

    return {
      ...est,
      realAmountInEstimateCurrency: realInEstCurrency,
      realAmountInDisplayCurrency,
      estimatedAmountInDisplayCurrency,
      coveragePct,
      isCovered,
      dueStatus,
      daysUntilDue
    }
  }

  const expenseEstimates = activeEstimates
    .filter((e) => e.type === 'EXPENSE_ESTIMATE')
    .map(enrichEstimate)
    .sort((a, b) => (a.due_day ?? 99) - (b.due_day ?? 99))

  const incomeEstimates = activeEstimates
    .filter((e) => e.type === 'INCOME_ESTIMATE')
    .map(enrichEstimate)
    .sort((a, b) => (a.due_day ?? 99) - (b.due_day ?? 99))

  // Compromisos automáticos del mes:
  // 1) Cuotas de tarjeta vigentes en el período (installment_total > 1)
  const cardInstallments: MonthlyCommitmentItem[] = transactions
    .filter(
      (tx) =>
        tx.type === 'OUTCOME' &&
        tx.installment_total > 1 &&
        matchesBudgetPeriod(tx, period) &&
        isPersonalTransaction(tx, peopleById)
    )
    .map((tx) => {
      const acc = accountsById.get(tx.account_id)
      const amount = Math.abs(Number(tx.amount_account))
      return {
        id: `card-${tx.id}`,
        kind: 'CARD_INSTALLMENT' as const,
        title: tx.notes || 'Compra en cuotas',
        subtitle: acc ? `${acc.name} · Cuota ${tx.installment_current}/${tx.installment_total}` : `Cuota ${tx.installment_current}/${tx.installment_total}`,
        amount,
        currency: tx.currency_account,
        amountInDisplayCurrency: convertAmountSync(
          amount,
          tx.currency_account,
          displayCurrency,
          ratesMap,
          displayCurrency
        ),
        installmentCurrent: tx.installment_current,
        installmentTotal: tx.installment_total,
        dueDateOrPeriod: tx.date || period,
        status: tx.status,
        targetHref: '/cards'
      }
    })

  // 2) Cuotas de préstamos tomados (BORROWED) que vencen en el período seleccionado
  const loanCommitments: MonthlyCommitmentItem[] = []
  for (const loan of loans) {
    if (loan.is_active === false || loan.direction !== 'BORROWED') continue
    // Si el préstamo es intermediado para un tercero (beneficiary_person_id), no es gasto propio
    if (loan.beneficiary_person_id) continue

    for (const inst of loan.installments ?? []) {
      if (inst.due_date && inst.due_date.slice(0, 7) === period) {
        const amount = Math.abs(Number(inst.installment_amount))
        loanCommitments.push({
          id: `loan-${inst.id}`,
          kind: 'LOAN_INSTALLMENT',
          title: loan.name,
          subtitle: `Préstamo · Cuota ${inst.period}/${loan.total_installments}`,
          amount,
          currency: loan.currency,
          amountInDisplayCurrency: convertAmountSync(
            amount,
            loan.currency,
            displayCurrency,
            ratesMap,
            displayCurrency
          ),
          installmentCurrent: inst.period,
          installmentTotal: loan.total_installments,
          dueDateOrPeriod: inst.due_date,
          status: inst.paid ? 'COMPLETED' : 'PENDING',
          targetHref: `/loans/${loan.id}`
        })
      }
    }
  }

  const commitments = [...cardInstallments, ...loanCommitments]

  const totalExpenseEstimatedDisplay = Math.round(
    expenseEstimates.reduce((sum, e) => sum + e.estimatedAmountInDisplayCurrency, 0) * 100
  ) / 100

  const totalExpenseRealDisplay = Math.round(
    expenseEstimates.reduce((sum, e) => sum + e.realAmountInDisplayCurrency, 0) * 100
  ) / 100

  const expenseCoveragePct =
    totalExpenseEstimatedDisplay > 0
      ? Math.min(100, Math.round((totalExpenseRealDisplay / totalExpenseEstimatedDisplay) * 100))
      : 0

  const totalIncomeEstimatedDisplay = Math.round(
    incomeEstimates.reduce((sum, e) => sum + e.estimatedAmountInDisplayCurrency, 0) * 100
  ) / 100

  const totalIncomeRealDisplay = Math.round(
    incomeEstimates.reduce((sum, e) => sum + e.realAmountInDisplayCurrency, 0) * 100
  ) / 100

  const incomeCoveragePct =
    totalIncomeEstimatedDisplay > 0
      ? Math.min(100, Math.round((totalIncomeRealDisplay / totalIncomeEstimatedDisplay) * 100))
      : 0

  const totalCommitmentsDisplay = Math.round(
    commitments.reduce((sum, c) => sum + c.amountInDisplayCurrency, 0) * 100
  ) / 100

  const projectedSavingsDisplay = Math.round(
    (totalIncomeEstimatedDisplay - (totalExpenseEstimatedDisplay + totalCommitmentsDisplay)) * 100
  ) / 100

  return {
    period,
    displayCurrency,
    totalExpenseEstimatedDisplay,
    totalExpenseRealDisplay,
    expenseCoveragePct,
    totalIncomeEstimatedDisplay,
    totalIncomeRealDisplay,
    incomeCoveragePct,
    totalCommitmentsDisplay,
    projectedSavingsDisplay,
    expenseEstimates,
    incomeEstimates,
    commitments
  }
}
