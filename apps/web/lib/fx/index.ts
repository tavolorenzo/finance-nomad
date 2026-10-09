// Tipo de cambio via Google Finance con fallback a frankfurter.app.
// Ver .claude/skills/fx-ledger-rules/SKILL.md para las reglas de negocio.

interface FrankfurterResponse {
  amount: number
  base: string
  date: string
  rates: Record<string, number>
}

interface OpenErResponse {
  result: string
  base_code: string
  rates: Record<string, number>
}

interface CacheEntry {
  rate: number
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()
const TTL_MS = 60 * 60 * 1000 // 1 hora de caché en memoria

export async function getOpenErRate(from: string, to: string): Promise<number> {
  if (from === to) return 1

  const key = `er_${from}_${to}`
  const hit = cache.get(key)
  if (hit && hit.expiresAt > Date.now()) return hit.rate

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 3500)

  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${from}`, {
      signal: controller.signal,
      next: { revalidate: 3600 }
    })
    if (!res.ok) throw new Error(`Open Exchange Rates respondió ${res.status}`)
    const data: OpenErResponse = await res.json()
    if (data.result !== 'success' || !data.rates) {
      throw new Error(`Respuesta inválida de Open Exchange Rates para ${from}`)
    }

    const now = Date.now()
    // Poblar caché para todas las cotizaciones del par base
    for (const [targetCurrency, rateValue] of Object.entries(data.rates)) {
      if (typeof rateValue === 'number' && rateValue > 0) {
        cache.set(`er_${from}_${targetCurrency}`, {
          rate: rateValue,
          expiresAt: now + TTL_MS
        })
      }
    }

    const rate = data.rates[to]
    if (!rate || typeof rate !== 'number' || rate <= 0) {
      throw new Error(`Sin cotización para ${from} -> ${to}`)
    }
    return rate
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function getFrankfurterRate(date: string, from: string, to: string): Promise<number> {
  if (from === to) return 1

  const key = `ff_${date}_${from}_${to}`
  const hit = cache.get(key)
  if (hit && hit.expiresAt > Date.now()) return hit.rate

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 3500)

  try {
    const res = await fetch(`https://api.frankfurter.app/${date}?from=${from}&to=${to}`, {
      signal: controller.signal,
      next: { revalidate: 3600 }
    })
    if (!res.ok) throw new Error(`Frankfurter respondió ${res.status}`)
    const data: FrankfurterResponse = await res.json()
    const rate = data.rates[to]
    if (!rate) throw new Error(`Sin cotización en Frankfurter para ${from} -> ${to}`)
    cache.set(key, { rate, expiresAt: Date.now() + TTL_MS })
    return rate
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function getRate(date: string, from: string, to: string): Promise<number> {
  if (from === to) return 1

  // 1. Intentar Open Exchange Rates (soporta UYU, AUD, EUR, USD, NZD con respuesta JSON inmediata)
  try {
    return await getOpenErRate(from, to)
  } catch (err) {
    // 2. Si falla, intentar Frankfurter (para histórico y monedas del BCE)
    try {
      return await getFrankfurterRate(date, from, to)
    } catch {
      throw err instanceof Error ? err : new Error(`Sin cotización para ${from} -> ${to}`)
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
