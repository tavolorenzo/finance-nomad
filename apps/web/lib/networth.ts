import { getRate } from './fx'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface AccountBalance {
  accountId: string
  currency: string
  balance: number // en moneda nativa de la cuenta
}

// Balance por cuenta = suma de amount_account hasta la fecha.
// OUTCOME resta, INCOME suma, ADJUSTMENT y TRANSFER aplican el signo directo de la fila.
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
    let delta = Number(t.amount_account)
    if (t.type === 'OUTCOME') {
      delta = -Math.abs(delta)
    } else if (t.type === 'INCOME') {
      delta = Math.abs(delta)
    }
    balance.set(t.account_id, Math.round(((balance.get(t.account_id) ?? 0) + delta) * 100) / 100)
    currency.set(t.account_id, t.currency_account)
  }

  return [...balance.entries()].map(([accountId, bal]) => ({
    accountId,
    balance: bal,
    currency: currency.get(accountId)!
  }))
}

// Obtiene el saldo y moneda de una cuenta individual a una fecha dada.
export async function getSingleAccountBalance(
  supabase: SupabaseClient,
  accountId: string,
  asOfDate: string
): Promise<number> {
  const { data } = await supabase
    .from('master_transactions')
    .select('amount_account, type')
    .eq('account_id', accountId)
    .lte('date', asOfDate)

  let balance = 0
  for (const t of data ?? []) {
    let delta = Number(t.amount_account)
    if (t.type === 'OUTCOME') {
      delta = -Math.abs(delta)
    } else if (t.type === 'INCOME') {
      delta = Math.abs(delta)
    }
    balance += delta
  }

  return Math.round(balance * 100) / 100
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
