/**
 * Motor de Amortización Francés — Banco Itaú Uruguay
 * 
 * Implementa el cálculo estándar de cuotas fijas (sistema francés) con base en
 * Tasa Efectiva Anual (TEA), cálculo exponencial de tasa mensual, e IVA sobre
 * intereses (22%) según la regulación bancaria de préstamos personales en Uruguay.
 */

export interface AmortizationScheduleInput {
  principal: number
  teaRate: number // Tasa Efectiva Anual en decimal (ej. 0.285 para 28.5%)
  totalInstallments: number
  startDate: string // YYYY-MM-DD
  dueDay?: number | null // 1-31 (si es null se deduce de startDate)
  includesVat22?: boolean
}

export interface CalculatedInstallment {
  period: number
  dueDate: string
  installmentAmount: number // Total final de la cuota (capital + interés + IVA)
  principalAmount: number // Amortización pura de capital (payment)
  interestAmount: number // Interés puro del período
  vatAmount: number // IVA 22% sobre intereses (si aplica)
  balance: number // Saldo deudor restante luego del pago
}

export interface AmortizationScheduleResult {
  monthlyRate: number
  pureMonthlyPayment: number
  totalInterest: number
  totalVat: number
  totalPayment: number
  installments: CalculatedInstallment[]
}

/**
 * Convierte Tasa Efectiva Anual (TEA) a tasa efectiva mensual:
 * i = (1 + TEA)^(1/12) - 1
 */
export function calculateMonthlyRateFromTea(teaRate: number): number {
  if (teaRate <= 0) return 0
  return Math.pow(1 + teaRate, 1 / 12) - 1
}

/**
 * Calcula la cuota pura mensual fija del sistema francés:
 * C = P * [i * (1 + i)^n] / [(1 + i)^n - 1]
 */
export function calculatePureMonthlyPayment(
  principal: number,
  monthlyRate: number,
  totalInstallments: number
): number {
  if (totalInstallments <= 0) return 0
  if (principal <= 0) return 0
  if (monthlyRate <= 0) {
    return Math.round((principal / totalInstallments) * 100) / 100
  }

  const factor = Math.pow(1 + monthlyRate, totalInstallments)
  const payment = principal * ((monthlyRate * factor) / (factor - 1))
  return Math.round(payment * 100) / 100
}

/**
 * Calcula una fecha de vencimiento segura sumando meses y respetando el día de vencimiento.
 */
export function calculateDueDate(baseDateStr: string, monthsToAdd: number, targetDueDay?: number | null): string {
  const [yearStr, monthStr, dayStr] = baseDateStr.split('-')
  const baseYear = parseInt(yearStr, 10)
  const baseMonth = parseInt(monthStr, 10) - 1
  const originalDay = parseInt(dayStr, 10)
  const desiredDay = targetDueDay && targetDueDay >= 1 && targetDueDay <= 31 ? targetDueDay : originalDay

  // Calculamos el mes objetivo
  const targetDate = new Date(Date.UTC(baseYear, baseMonth + monthsToAdd, 1))
  const targetYear = targetDate.getUTCFullYear()
  const targetMonth = targetDate.getUTCMonth()

  // Determinamos el último día del mes objetivo (ej. Feb 28/29, Abr 30)
  const lastDayOfMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
  const finalDay = Math.min(desiredDay, lastDayOfMonth)

  const y = targetYear
  const m = String(targetMonth + 1).padStart(2, '0')
  const d = String(finalDay).padStart(2, '0')

  return `${y}-${m}-${d}`
}

/**
 * Genera el cuadro de amortización completo según el sistema francés de Itaú Uruguay.
 */
export function calculateItauSchedule(input: AmortizationScheduleInput): AmortizationScheduleResult {
  const {
    principal,
    teaRate,
    totalInstallments,
    startDate,
    dueDay,
    includesVat22 = false
  } = input

  if (principal <= 0 || totalInstallments <= 0) {
    return {
      monthlyRate: 0,
      pureMonthlyPayment: 0,
      totalInterest: 0,
      totalVat: 0,
      totalPayment: 0,
      installments: []
    }
  }

  const monthlyRate = calculateMonthlyRateFromTea(teaRate)
  const pureMonthlyPayment = calculatePureMonthlyPayment(principal, monthlyRate, totalInstallments)

  let remainingBalance = principal
  let totalInterest = 0
  let totalVat = 0
  let totalPayment = 0
  const installments: CalculatedInstallment[] = []

  for (let k = 1; k <= totalInstallments; k++) {
    const dueDate = calculateDueDate(startDate, k, dueDay)
    
    // Interés del período sobre saldo anterior
    const interest = monthlyRate > 0
      ? Math.round(remainingBalance * monthlyRate * 100) / 100
      : 0
    
    // IVA 22% sobre intereses (Uruguay)
    const vat = includesVat22 && interest > 0
      ? Math.round(interest * 0.22 * 100) / 100
      : 0

    let principalPayment = 0
    let installmentAmount = 0

    if (k === totalInstallments) {
      // Última cuota: amortiza exactamente el saldo remanente para evitar discrepancias por redondeo
      principalPayment = Math.round(remainingBalance * 100) / 100
      installmentAmount = Math.round((principalPayment + interest + vat) * 100) / 100
      remainingBalance = 0
    } else {
      principalPayment = Math.round((pureMonthlyPayment - interest) * 100) / 100
      // Aseguramos no amortizar más que el saldo
      if (principalPayment > remainingBalance) {
        principalPayment = remainingBalance
      }
      installmentAmount = Math.round((principalPayment + interest + vat) * 100) / 100
      remainingBalance = Math.round((remainingBalance - principalPayment) * 100) / 100
    }

    totalInterest = Math.round((totalInterest + interest) * 100) / 100
    totalVat = Math.round((totalVat + vat) * 100) / 100
    totalPayment = Math.round((totalPayment + installmentAmount) * 100) / 100

    installments.push({
      period: k,
      dueDate,
      installmentAmount,
      principalAmount: principalPayment,
      interestAmount: interest,
      vatAmount: vat,
      balance: Math.max(0, remainingBalance)
    })
  }

  return {
    monthlyRate,
    pureMonthlyPayment,
    totalInterest,
    totalVat,
    totalPayment,
    installments
  }
}
