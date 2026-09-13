// Tipo de cambio via Google Finance con fallback a frankfurter.app.
// Ver .claude/skills/fx-ledger-rules/SKILL.md para las reglas de negocio.

interface FrankfurterResponse {
  amount: number
  base: string
  date: string
  rates: Record<string, number>
}

const cache = new Map<string, number>()

export async function getGoogleFinanceRate(from: string, to: string): Promise<number> {
  if (from === to) return 1

  const key = `gf_${from}_${to}`
  if (cache.has(key)) return cache.get(key)!

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 6000)

  try {
    const res = await fetch(`https://www.google.com/finance/quote/${from}-${to}`, {
      signal: controller.signal,
      next: { revalidate: 3600 }
    })
    if (!res.ok) throw new Error(`Google Finance respondió ${res.status}`)
    const html = await res.text()
    const match = html.match(/data-last-price="([^"]+)"/)
    if (!match || !match[1]) throw new Error(`Sin cotización en Google Finance para ${from} -> ${to}`)
    const rate = parseFloat(match[1])
    if (isNaN(rate) || rate <= 0) throw new Error(`Cotización inválida para ${from} -> ${to}`)
    cache.set(key, rate)
    return rate
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function getFrankfurterRate(date: string, from: string, to: string): Promise<number> {
  if (from === to) return 1

  const key = `ff_${date}_${from}_${to}`
  if (cache.has(key)) return cache.get(key)!

  const res = await fetch(`https://api.frankfurter.app/${date}?from=${from}&to=${to}`)
  if (!res.ok) throw new Error(`Frankfurter respondió ${res.status}`)
  const data: FrankfurterResponse = await res.json()
  const rate = data.rates[to]
  if (!rate) throw new Error(`Sin cotización en Frankfurter para ${from} -> ${to}`)
  cache.set(key, rate)
  return rate
}

export async function getRate(date: string, from: string, to: string): Promise<number> {
  if (from === to) return 1

  // 1. Intentar primero Google Finance (soporta UYU, AUD, EUR, USD, NZD en tiempo real)
  try {
    return await getGoogleFinanceRate(from, to)
  } catch (gfErr) {
    // 2. Si Google Finance falla, intentar Frankfurter (para monedas ECB / histórico)
    try {
      return await getFrankfurterRate(date, from, to)
    } catch {
      throw gfErr instanceof Error ? gfErr : new Error(`Sin cotización para ${from} -> ${to}`)
    }
  }
}

// amount_account = (amount_original - fee_amount) * exchange_rate
export function calculateAccountAmount(
  amountOriginal: number,
  feeAmount: number,
  exchangeRate: number
): number {
  return Math.round((amountOriginal - feeAmount) * exchangeRate * 100) / 100
}

// Genera N cuotas cuyo total exacto suma amountTotal, ajustando el resto
// en la última cuota en vez de repartirlo parejo si no divide exacto.
export function splitInstallments(amountTotal: number, count: number): number[] {
  const base = Math.floor((amountTotal / count) * 100) / 100
  const installments = new Array(count).fill(base)
  const distributed = base * count
  const remainder = Math.round((amountTotal - distributed) * 100) / 100
  installments[count - 1] = Math.round((base + remainder) * 100) / 100
  return installments
}
