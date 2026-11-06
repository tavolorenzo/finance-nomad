import { calculateAccountingPeriod, formatAccountingPeriodLabel } from '@/lib/ledger/builder'
import type { Account, Category, Institution, MasterTransaction, Person } from '@/lib/types'

export type CardBrand = 'VISA' | 'AMEX' | 'MASTERCARD' | 'MAESTRO'

export interface CardAccountWithInstitution extends Account {
  institutions?: Institution | { id?: string; name: string; is_active?: boolean } | null
}

export interface ClosingInfo {
  closingDay: number
  nextClosingDate: string
  daysUntilClosing: number
  label: string
}

export interface CardPeriodSummary {
  account: CardAccountWithInstitution
  institutionName: string
  brand: CardBrand | null
  closingInfo: ClosingInfo | null
  /** Saldo contable actual (negativo = deuda) para operar con RegisterCardPaymentModal */
  currentBalance: number
  /** Gastos (OUTCOME) del período seleccionado agrupados por moneda original */
  periodSpendByCurrency: Record<string, number>
  /** Pagos registrados (TRANSFER entrantes) del período seleccionado agrupados por moneda */
  periodPaymentsByCurrency: Record<string, number>
  /** Saldo neto adeudado en el resumen del período por moneda */
  periodBalanceByCurrency: Record<string, number>
  /** Gasto del período consolidado en displayCurrency */
  periodSpendInDisplay: number
  /** Pagos del período consolidados en displayCurrency */
  periodPaymentsInDisplay: number
  /** Si el resumen del período cuenta con pagos registrados que cubren sus consumos */
  isStatementPaid: boolean
  /** Porción de gasto propio (Personal) en el período en displayCurrency */
  periodPersonalInDisplay: number
  /** Porción de gasto de terceros (extensiones / compartidos) en el período en displayCurrency */
  periodThirdPartyInDisplay: number
  /** Cuotas y consumos diferidos en períodos posteriores al seleccionado, por moneda original */
  futureCommittedByCurrency: Record<string, number>
  /** Compromisos futuros consolidados en displayCurrency */
  futureCommittedInDisplay: number
  /** Compromisos totales (deuda actual + cuotas futuras) expresados en la moneda nativa de la tarjeta */
  totalCommittedInNative: number
  creditLimit: number
  availableCredit: number
  utilizationPct: number
  utilizationLevel: 'optimal' | 'moderate' | 'high'
  totalPeriodItems: number
  verifiedPeriodItems: number
  verificationPct: number
  activeInstallmentPlansCount: number
}

export interface RunoffMonthBucket {
  period: string
  label: string
  shortLabel: string
  totalInDisplay: number
  personalInDisplay: number
  thirdPartyInDisplay: number
  byCurrency: Record<string, number>
  byCard: Record<string, number>
  endingPlansCount: number
  freedMonthlyInDisplay: number
  freedByCurrency: Record<string, number>
}

export interface ActiveInstallmentPlan {
  planId: string
  accountId: string
  cardName: string
  institutionName: string
  brand: CardBrand | null
  description: string
  categoryName: string | null
  personId: string | null
  personName: string
  isThirdParty: boolean
  purchaseDate: string
  currentInstallment: number
  totalInstallments: number
  remainingInstallments: number
  installmentAmount: number
  currency: string
  installmentInDisplay: number
  remainingAmount: number
  remainingInDisplay: number
  endPeriod: string
  endPeriodLabel: string
}

export interface CardCategoryBreakdownItem {
  categoryId: string
  categoryName: string
  amountInDisplay: number
  byCurrency: Record<string, number>
  percentage: number
  count: number
}

export interface CardPersonBreakdownItem {
  personId: string
  personName: string
  isPersonal: boolean
  periodInDisplay: number
  periodByCurrency: Record<string, number>
  futureInDisplay: number
  futureByCurrency: Record<string, number>
  itemsCount: number
}

export type CurrencyConverter = (amount: number, fromCurrency: string, toCurrency: string) => number

/**
 * Detecta la red/sello de la tarjeta a partir del nombre del producto.
 * Soporta VISA, AMEX (American Express), MASTERCARD (Master Card) y MAESTRO.
 */
export function detectCardBrand(accountName: string): CardBrand | null {
  if (!accountName) return null
  const normalized = accountName.trim().toLowerCase()

  if (/\b(amex|american\s+express)\b/i.test(normalized)) {
    return 'AMEX'
  }
  if (/\b(master\s*card|mastercard)\b/i.test(normalized)) {
    return 'MASTERCARD'
  }
  if (/\bmaestro\b/i.test(normalized)) {
    return 'MAESTRO'
  }
  if (/\bvisa\b/i.test(normalized)) {
    return 'VISA'
  }
  return null
}

/**
 * Calcula la próxima fecha de cierre y los días restantes a partir del closing_day (1..31).
 */
export function computeClosingInfo(
  closingDay: number | null | undefined,
  todayStr: string
): ClosingInfo | null {
  if (!closingDay || closingDay < 1 || closingDay > 31) return null
  const [y, m, d] = todayStr.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null

  const daysInCurrentMonth = new Date(y, m, 0).getDate()
  const effectiveCurrentDay = Math.min(closingDay, daysInCurrentMonth)

  let targetYear = y
  let targetMonth = m
  let targetDay = effectiveCurrentDay

  if (d > effectiveCurrentDay) {
    if (m === 12) {
      targetYear = y + 1
      targetMonth = 1
    } else {
      targetMonth = m + 1
    }
    const daysInNextMonth = new Date(targetYear, targetMonth, 0).getDate()
    targetDay = Math.min(closingDay, daysInNextMonth)
  }

  const nextClosingDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`
  const todayUtc = Date.UTC(y, m - 1, d)
  const targetUtc = Date.UTC(targetYear, targetMonth - 1, targetDay)
  const daysUntilClosing = Math.max(0, Math.round((targetUtc - todayUtc) / (1000 * 60 * 60 * 24)))

  let label = `Cierra el día ${closingDay}`
  if (daysUntilClosing === 0) {
    label = `Cierra hoy (día ${closingDay})`
  } else if (daysUntilClosing === 1) {
    label = `Cierra mañana (día ${closingDay})`
  } else if (daysUntilClosing <= 7) {
    label = `Cierra en ${daysUntilClosing} días (día ${closingDay})`
  } else {
    label = `Día ${closingDay} · faltan ${daysUntilClosing}d`
  }

  return {
    closingDay,
    nextClosingDate,
    daysUntilClosing,
    label
  }
}

export function isThirdPartyTransaction(
  tx: MasterTransaction,
  peopleById: Map<string, Person>
): boolean {
  if (!tx.person_id) return false
  const person = peopleById.get(tx.person_id)
  if (!person) return false
  return person.name.trim().toLowerCase() !== 'personal'
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Calcula las métricas completas de una tarjeta de crédito para un período contable dado.
 */
export function computeCardPeriodSummary({
  account,
  transactions,
  period,
  todayStr,
  displayCurrency,
  peopleById,
  convert
}: {
  account: CardAccountWithInstitution
  transactions: MasterTransaction[]
  period: string
  todayStr: string
  displayCurrency: string
  peopleById: Map<string, Person>
  convert: CurrencyConverter
}): CardPeriodSummary {
  const currentPeriod = todayStr.slice(0, 7)
  const institutionName = account.institutions?.name || 'Institución'
  const brand = detectCardBrand(account.name)
  const closingInfo = computeClosingInfo(account.closing_day, todayStr)

  let currentBalance = 0
  let pendingAmountInNative = 0

  const periodSpendByCurrency: Record<string, number> = {}
  const periodPaymentsByCurrency: Record<string, number> = {}
  const periodBalanceByCurrency: Record<string, number> = {
    [account.currency_native]: 0
  }
  const futureCommittedByCurrency: Record<string, number> = {}

  let periodSpendInDisplay = 0
  let periodPaymentsInDisplay = 0
  let periodPersonalInDisplay = 0
  let periodThirdPartyInDisplay = 0
  let futureCommittedInDisplay = 0

  let totalPeriodItems = 0
  let verifiedPeriodItems = 0
  const activePlanKeys = new Set<string>()

  const cardTxs = transactions.filter((t) => t.account_id === account.id)

  for (const t of cardTxs) {
    const effectivePeriod = (t.accounting_period || t.date.slice(0, 7)).slice(0, 7)
    const isFutureForToday = effectivePeriod > currentPeriod
    const origCurr = t.currency_original || account.currency_native
    const origAbs = Math.abs(Number(t.amount_original ?? t.amount_account) || 0)
    const accAbs = Math.abs(Number(t.amount_account) || 0)

    // 1. Saldo nominal actual y deuda diferida para el límite de crédito de la tarjeta
    if (!isFutureForToday && t.status === 'COMPLETED' && t.date <= todayStr) {
      let delta = Number(t.amount_account)
      if (t.type === 'OUTCOME') delta = -accAbs
      else if (t.type === 'INCOME') delta = accAbs
      currentBalance += delta
    } else if (t.status === 'PENDING' || isFutureForToday) {
      let delta = Number(t.amount_account)
      if (t.type === 'OUTCOME') delta = accAbs
      else if (t.type === 'INCOME') delta = -accAbs
      else delta = delta < 0 ? Math.abs(delta) : 0
      pendingAmountInNative += delta
    }

    // 2. Análisis del período seleccionado (resumen mensual)
    if (effectivePeriod === period) {
      if (t.type === 'OUTCOME') {
        periodSpendByCurrency[origCurr] = round2((periodSpendByCurrency[origCurr] || 0) + origAbs)
        periodBalanceByCurrency[origCurr] = round2((periodBalanceByCurrency[origCurr] || 0) - origAbs)

        const displayVal = convert(origAbs, origCurr, displayCurrency)
        periodSpendInDisplay += displayVal
        if (isThirdPartyTransaction(t, peopleById)) {
          periodThirdPartyInDisplay += displayVal
        } else {
          periodPersonalInDisplay += displayVal
        }

        totalPeriodItems += 1
        if (t.is_verified) {
          verifiedPeriodItems += 1
        }
        if ((t.installment_total ?? 1) > 1) {
          activePlanKeys.add(t.parent_transaction_id || t.id)
        }
      } else if (t.type === 'INCOME') {
        periodBalanceByCurrency[origCurr] = round2((periodBalanceByCurrency[origCurr] || 0) + origAbs)
      } else if (t.type === 'TRANSFER') {
        const amt = Number(t.amount_account)
        if (amt > 0) {
          // Pago acreditado a la tarjeta para amortizar el resumen
          periodPaymentsByCurrency[origCurr] = round2(
            (periodPaymentsByCurrency[origCurr] || 0) + origAbs
          )
          periodPaymentsInDisplay += convert(origAbs, origCurr, displayCurrency)
          periodBalanceByCurrency[origCurr] = round2(
            (periodBalanceByCurrency[origCurr] || 0) + origAbs
          )
        } else {
          periodBalanceByCurrency[origCurr] = round2(
            (periodBalanceByCurrency[origCurr] || 0) - origAbs
          )
        }
      } else if (t.type === 'ADJUSTMENT') {
        const sign = Number(t.amount_account) >= 0 ? 1 : -1
        periodBalanceByCurrency[t.currency_account] = round2(
          (periodBalanceByCurrency[t.currency_account] || 0) + sign * accAbs
        )
      }
    }

    // 3. Compromisos diferidos posteriores al período seleccionado (solo consumos OUTCOME)
    if (effectivePeriod > period && t.type === 'OUTCOME') {
      futureCommittedByCurrency[origCurr] = round2(
        (futureCommittedByCurrency[origCurr] || 0) + origAbs
      )
      futureCommittedInDisplay += convert(origAbs, origCurr, displayCurrency)
      if ((t.installment_total ?? 1) > 1) {
        activePlanKeys.add(t.parent_transaction_id || t.id)
      }
    }
  }

  currentBalance = round2(currentBalance)
  pendingAmountInNative = round2(Math.max(0, pendingAmountInNative))
  periodSpendInDisplay = round2(periodSpendInDisplay)
  periodPaymentsInDisplay = round2(periodPaymentsInDisplay)
  periodPersonalInDisplay = round2(periodPersonalInDisplay)
  periodThirdPartyInDisplay = round2(periodThirdPartyInDisplay)
  futureCommittedInDisplay = round2(futureCommittedInDisplay)

  const isStatementPaid =
    periodSpendInDisplay > 0 && periodPaymentsInDisplay >= periodSpendInDisplay - 0.01

  const creditLimit = Number(account.credit_limit) || 0
  const usedCredit = currentBalance < 0 ? Math.abs(currentBalance) : 0
  const totalCommittedInNative = round2(usedCredit + pendingAmountInNative)
  const availableCredit = creditLimit > 0 ? round2(Math.max(0, creditLimit - totalCommittedInNative)) : 0
  const utilizationPct =
    creditLimit > 0 ? Math.min(100, Math.round((totalCommittedInNative / creditLimit) * 100)) : 0

  let utilizationLevel: 'optimal' | 'moderate' | 'high' = 'optimal'
  if (utilizationPct > 75) utilizationLevel = 'high'
  else if (utilizationPct >= 30) utilizationLevel = 'moderate'

  const verificationPct =
    totalPeriodItems > 0 ? Math.round((verifiedPeriodItems / totalPeriodItems) * 100) : 100

  return {
    account,
    institutionName,
    brand,
    closingInfo,
    currentBalance,
    periodSpendByCurrency,
    periodPaymentsByCurrency,
    periodBalanceByCurrency,
    periodSpendInDisplay,
    periodPaymentsInDisplay,
    isStatementPaid,
    periodPersonalInDisplay,
    periodThirdPartyInDisplay,
    futureCommittedByCurrency,
    futureCommittedInDisplay,
    totalCommittedInNative,
    creditLimit,
    availableCredit,
    utilizationPct,
    utilizationLevel,
    totalPeriodItems,
    verifiedPeriodItems,
    verificationPct,
    activeInstallmentPlansCount: activePlanKeys.size
  }
}

/**
 * Construye la curva de proyección y liberación de cuotas (run-off) para los próximos N meses contables.
 */
export function computeInstallmentsRunoff({
  cards,
  transactions,
  startPeriod,
  monthsCount = 6,
  displayCurrency,
  peopleById,
  convert
}: {
  cards: CardAccountWithInstitution[]
  transactions: MasterTransaction[]
  startPeriod: string
  monthsCount?: number
  displayCurrency: string
  peopleById: Map<string, Person>
  convert: CurrencyConverter
}): RunoffMonthBucket[] {
  const cardIds = new Set(cards.map((c) => c.id))
  const buckets: RunoffMonthBucket[] = []
  const bucketMap = new Map<string, RunoffMonthBucket>()

  for (let i = 0; i < monthsCount; i++) {
    const p = calculateAccountingPeriod(startPeriod, i)
    const fullLabel = formatAccountingPeriodLabel(p)
    const [monthWord, yearStr] = fullLabel.split(' ')
    const shortLabel = `${(monthWord || p).slice(0, 3)} ${yearStr ? yearStr.slice(2) : ''}`.trim()

    const bucket: RunoffMonthBucket = {
      period: p,
      label: fullLabel,
      shortLabel,
      totalInDisplay: 0,
      personalInDisplay: 0,
      thirdPartyInDisplay: 0,
      byCurrency: {},
      byCard: {},
      endingPlansCount: 0,
      freedMonthlyInDisplay: 0,
      freedByCurrency: {}
    }
    buckets.push(bucket)
    bucketMap.set(p, bucket)
  }

  for (const t of transactions) {
    if (!cardIds.has(t.account_id)) continue
    if (t.type !== 'OUTCOME') continue

    const effectivePeriod = (t.accounting_period || t.date.slice(0, 7)).slice(0, 7)
    const bucket = bucketMap.get(effectivePeriod)
    if (!bucket) continue

    const origCurr = t.currency_original || t.currency_account
    const origAbs = Math.abs(Number(t.amount_original ?? t.amount_account) || 0)
    const displayVal = convert(origAbs, origCurr, displayCurrency)

    bucket.totalInDisplay = round2(bucket.totalInDisplay + displayVal)
    if (isThirdPartyTransaction(t, peopleById)) {
      bucket.thirdPartyInDisplay = round2(bucket.thirdPartyInDisplay + displayVal)
    } else {
      bucket.personalInDisplay = round2(bucket.personalInDisplay + displayVal)
    }

    bucket.byCurrency[origCurr] = round2((bucket.byCurrency[origCurr] || 0) + origAbs)
    bucket.byCard[t.account_id] = round2((bucket.byCard[t.account_id] || 0) + displayVal)

    // Si es la última cuota de un plan de cuotas (ej. 6 de 6), este mes se libera ese compromiso mensual
    const totalInst = t.installment_total ?? 1
    const currInst = t.installment_current ?? 1
    if (totalInst > 1 && currInst === totalInst) {
      bucket.endingPlansCount += 1
      bucket.freedMonthlyInDisplay = round2(bucket.freedMonthlyInDisplay + displayVal)
      bucket.freedByCurrency[origCurr] = round2((bucket.freedByCurrency[origCurr] || 0) + origAbs)
    }
  }

  return buckets
}

/**
 * Extrae el listado maestro de planes de compras en cuotas vigentes en o después del período seleccionado.
 */
export function extractActiveInstallmentPlans({
  cards,
  transactions,
  selectedPeriod,
  displayCurrency,
  categoriesById,
  peopleById,
  convert
}: {
  cards: CardAccountWithInstitution[]
  transactions: MasterTransaction[]
  selectedPeriod: string
  displayCurrency: string
  categoriesById: Map<string, Category>
  peopleById: Map<string, Person>
  convert: CurrencyConverter
}): ActiveInstallmentPlan[] {
  const cardById = new Map(cards.map((c) => [c.id, c]))
  const grouped = new Map<string, MasterTransaction[]>()

  for (const t of transactions) {
    if (!cardById.has(t.account_id)) continue
    if (t.type !== 'OUTCOME') continue
    if ((t.installment_total ?? 1) <= 1) continue

    const key = t.parent_transaction_id || t.id
    const list = grouped.get(key) ?? []
    list.push(t)
    grouped.set(key, list)
  }

  const plans: ActiveInstallmentPlan[] = []

  for (const [planId, rows] of grouped.entries()) {
    rows.sort((a, b) => (a.installment_current ?? 1) - (b.installment_current ?? 1))

    // Cuotas desde el período seleccionado en adelante
    const activeRows = rows.filter((r) => {
      const p = (r.accounting_period || r.date.slice(0, 7)).slice(0, 7)
      return p >= selectedPeriod
    })

    if (activeRows.length === 0) continue

    const currentRow =
      activeRows.find((r) => (r.accounting_period || r.date.slice(0, 7)).slice(0, 7) === selectedPeriod) ||
      activeRows[0]
    const firstRow = rows[0]
    const lastRow = rows[rows.length - 1]
    const card = cardById.get(currentRow.account_id)
    if (!card) continue

    const origCurr = currentRow.currency_original || card.currency_native
    const installmentAmount = round2(
      Math.abs(Number(currentRow.amount_original ?? currentRow.amount_account) || 0)
    )
    const remainingAmount = round2(
      activeRows.reduce(
        (acc, r) => acc + Math.abs(Number(r.amount_original ?? r.amount_account) || 0),
        0
      )
    )

    const person = currentRow.person_id ? peopleById.get(currentRow.person_id) : undefined
    const personName = person?.name || 'Personal'
    const isThirdParty = isThirdPartyTransaction(currentRow, peopleById)
    const categoryName = currentRow.category_id
      ? categoriesById.get(currentRow.category_id)?.name ?? null
      : null
    const endPeriod = (lastRow.accounting_period || lastRow.date.slice(0, 7)).slice(0, 7)

    plans.push({
      planId,
      accountId: card.id,
      cardName: card.name,
      institutionName: card.institutions?.name || 'Institución',
      brand: detectCardBrand(card.name),
      description: currentRow.notes || firstRow.notes || 'Compra en cuotas',
      categoryName,
      personId: currentRow.person_id,
      personName,
      isThirdParty,
      purchaseDate: firstRow.date,
      currentInstallment: currentRow.installment_current ?? 1,
      totalInstallments: currentRow.installment_total ?? 1,
      remainingInstallments: activeRows.length,
      installmentAmount,
      currency: origCurr,
      installmentInDisplay: round2(convert(installmentAmount, origCurr, displayCurrency)),
      remainingAmount,
      remainingInDisplay: round2(convert(remainingAmount, origCurr, displayCurrency)),
      endPeriod,
      endPeriodLabel: formatAccountingPeriodLabel(endPeriod)
    })
  }

  return plans.sort((a, b) => b.remainingInDisplay - a.remainingInDisplay)
}

/**
 * Calcula la distribución de gastos de tarjeta por categoría y por persona en el período seleccionado.
 * Excluye estrictamente TRANSFER y ADJUSTMENT (solo analiza consumos OUTCOME).
 */
export function computeCardBreakdowns({
  cards,
  transactions,
  selectedPeriod,
  selectedCardId,
  displayCurrency,
  categoriesById,
  peopleById,
  convert
}: {
  cards: CardAccountWithInstitution[]
  transactions: MasterTransaction[]
  selectedPeriod: string
  selectedCardId?: string | 'ALL'
  displayCurrency: string
  categoriesById: Map<string, Category>
  peopleById: Map<string, Person>
  convert: CurrencyConverter
}): {
  categories: CardCategoryBreakdownItem[]
  people: CardPersonBreakdownItem[]
} {
  const validCardIds = new Set(
    cards
      .filter((c) => !selectedCardId || selectedCardId === 'ALL' || c.id === selectedCardId)
      .map((c) => c.id)
  )

  const catMap = new Map<string, CardCategoryBreakdownItem>()
  const personMap = new Map<string, CardPersonBreakdownItem>()
  let totalCategoryDisplay = 0

  for (const t of transactions) {
    if (!validCardIds.has(t.account_id)) continue
    if (t.type !== 'OUTCOME') continue

    const effectivePeriod = (t.accounting_period || t.date.slice(0, 7)).slice(0, 7)
    const origCurr = t.currency_original || t.currency_account
    const origAbs = Math.abs(Number(t.amount_original ?? t.amount_account) || 0)
    const displayVal = convert(origAbs, origCurr, displayCurrency)

    const person = t.person_id ? peopleById.get(t.person_id) : undefined
    const personKey = person ? person.id : 'personal'
    const personName = person ? person.name : 'Personal'
    const isPersonal = !isThirdPartyTransaction(t, peopleById)

    // Gastos del período seleccionado
    if (effectivePeriod === selectedPeriod) {
      const catId = t.category_id || 'uncategorized'
      const catName = t.category_id
        ? categoriesById.get(t.category_id)?.name || 'Sin categoría'
        : 'Sin categoría'

      const existingCat = catMap.get(catId) ?? {
        categoryId: catId,
        categoryName: catName,
        amountInDisplay: 0,
        byCurrency: {},
        percentage: 0,
        count: 0
      }
      existingCat.amountInDisplay = round2(existingCat.amountInDisplay + displayVal)
      existingCat.byCurrency[origCurr] = round2((existingCat.byCurrency[origCurr] || 0) + origAbs)
      existingCat.count += 1
      catMap.set(catId, existingCat)
      totalCategoryDisplay += displayVal

      const existingPerson = personMap.get(personKey) ?? {
        personId: personKey,
        personName,
        isPersonal,
        periodInDisplay: 0,
        periodByCurrency: {},
        futureInDisplay: 0,
        futureByCurrency: {},
        itemsCount: 0
      }
      existingPerson.periodInDisplay = round2(existingPerson.periodInDisplay + displayVal)
      existingPerson.periodByCurrency[origCurr] = round2(
        (existingPerson.periodByCurrency[origCurr] || 0) + origAbs
      )
      existingPerson.itemsCount += 1
      personMap.set(personKey, existingPerson)
    } else if (effectivePeriod > selectedPeriod) {
      const existingPerson = personMap.get(personKey) ?? {
        personId: personKey,
        personName,
        isPersonal,
        periodInDisplay: 0,
        periodByCurrency: {},
        futureInDisplay: 0,
        futureByCurrency: {},
        itemsCount: 0
      }
      existingPerson.futureInDisplay = round2(existingPerson.futureInDisplay + displayVal)
      existingPerson.futureByCurrency[origCurr] = round2(
        (existingPerson.futureByCurrency[origCurr] || 0) + origAbs
      )
      personMap.set(personKey, existingPerson)
    }
  }

  const categories = Array.from(catMap.values())
    .map((item) => ({
      ...item,
      percentage:
        totalCategoryDisplay > 0 ? Math.round((item.amountInDisplay / totalCategoryDisplay) * 100) : 0
    }))
    .sort((a, b) => b.amountInDisplay - a.amountInDisplay)

  const people = Array.from(personMap.values()).sort(
    (a, b) => b.periodInDisplay + b.futureInDisplay - (a.periodInDisplay + a.futureInDisplay)
  )

  return { categories, people }
}
