// Tipo de cambio via frankfurter.app (gratis, sin API key, actualiza diario).
// Ver .claude/skills/fx-ledger-rules/SKILL.md para las reglas de negocio.

interface FrankfurterResponse {
  amount: number
  base: string
  date: string
  rates: Record<string, number>
}

const cache = new Map<string, number>()

export async function getRate(date: string, from: string, to: string): Promise<number> {
  if (from === to) return 1

  const key = `${date}_${from}_${to}`
  if (cache.has(key)) return cache.get(key)!

  try {
    const res = await fetch(`https://api.frankfurter.app/${date}?from=${from}&to=${to}`)
    if (!res.ok) throw new Error(`FX API respondió ${res.status}`)
    const data: FrankfurterResponse = await res.json()
    const rate = data.rates[to]
    if (!rate) throw new Error(`Sin cotización para ${from} -> ${to}`)
    cache.set(key, rate)
    return rate
  } catch (err) {
    // Ver error.rate_unavailable en el copy deck — el componente que llama
    // esto debe capturar el throw y dejar el campo de tipo de cambio editable
    // a mano en vez de romper el formulario.
    throw err
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
