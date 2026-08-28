import { getRate } from './fx'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface AccountBalance {
  accountId: string
  currency: string
  balance: number // en moneda nativa de la cuenta
}

// Balance por cuenta = suma de amount_account hasta la fecha, con OUTCOME en
// negativo. TRANSFER y ADJUSTMENT se asumen ya firmados correctamente en la
// fila (ver fx-ledger-rules/SKILL.md) -- hoy el formulario solo genera
// INCOME/OUTCOME, así que ese caso se cubre completo.
export async function getAccountBalances(
  supabase: SupabaseClient,
  asOfDate: string
): Promise<AccountBalance[]> {
  const { data } = await supabase
    .from('master_transactions')
    .select('account_id, currency_account, amount_account, type')
    .lte('date', asOfDate)

  const balance = new Map<string, number>()
  const currency = new Map<string, string>()

  for (const t of data ?? []) {
    const sign = t.type === 'OUTCOME' ? -1 : 1
    balance.set(t.account_id, (balance.get(t.account_id) ?? 0) + sign * t.amount_account)
    currency.set(t.account_id, t.currency_account)
  }

  return [...balance.entries()].map(([accountId, bal]) => ({
    accountId,
    balance: bal,
    currency: currency.get(accountId)!
  }))
}

// Convierte una lista de balances en distintas monedas a una sola moneda de
// visualización, usando el tipo de cambio del día pedido.
export async function convertToDisplayCurrency(
  balances: AccountBalance[],
  displayCurrency: string,
  date: string
): Promise<number> {
  let total = 0
  for (const b of balances) {
    if (b.balance === 0) continue
    try {
      const rate = await getRate(date, b.currency, displayCurrency)
      total += b.balance * rate
    } catch {
      // Si la API de FX falla para esa moneda puntual, no rompemos todo el
      // dashboard -- se excluye del total y se podría avisar en UI más
      // adelante (ver error.rate_unavailable en el copy deck).
    }
  }
  return Math.round(total * 100) / 100
}
