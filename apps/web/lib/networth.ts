import { getRate } from './fx'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface AccountBalance {
  accountId: string
  currency: string
  balance: number // en moneda nativa de la cuenta
}

// Balance por cuenta = suma de amount_account completadas hasta la fecha.
// OUTCOME resta, INCOME suma, ADJUSTMENT y TRANSFER aplican el signo directo de la fila.
// Solo transacciones en estado COMPLETED afectan el saldo nominal.
export async function getAccountBalances(
  supabase: SupabaseClient,
  asOfDate: string
): Promise<AccountBalance[]> {
  // 1. Intento rápido vía RPC optimizada en PostgreSQL indexada
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    'get_account_balances_summary',
    { p_as_of_date: asOfDate }
  )

  if (!rpcError && Array.isArray(rpcData)) {
    return rpcData.map((r: { account_id: string; currency: string; balance: number | string }) => ({
      accountId: r.account_id,
      currency: r.currency,
      balance: Number(r.balance)
    }))
  }

  // 2. Fallback de compatibilidad si la RPC aún no fue migrada
  const { data } = await supabase
    .from('master_transactions')
    .select('account_id, currency_account, amount_account, type')
    .eq('status', 'COMPLETED')
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

// Obtiene el saldo y moneda de una cuenta individual a una fecha dada considerando solo transacciones COMPLETED.
export async function getSingleAccountBalance(
  supabase: SupabaseClient,
  accountId: string,
  asOfDate: string
): Promise<number> {
  const balances = await getAccountBalances(supabase, asOfDate)
  const match = balances.find((b) => b.accountId === accountId)
  return match ? match.balance : 0
}

// Obtiene el total de compromisos diferidos/pendientes (status = PENDING) de una cuenta.
// Utilizado para calcular la retención de línea de crédito en tarjetas y proyectar flujos futuros.
export async function getAccountPendingAmount(
  supabase: SupabaseClient,
  accountId: string
): Promise<number> {
  const { data } = await supabase
    .from('master_transactions')
    .select('amount_account, type')
    .eq('account_id', accountId)
    .eq('status', 'PENDING')

  let pending = 0
  for (const t of data ?? []) {
    let delta = Number(t.amount_account)
    if (t.type === 'OUTCOME') {
      delta = Math.abs(delta)
    } else if (t.type === 'INCOME') {
      delta = -Math.abs(delta)
    } else {
      delta = delta < 0 ? Math.abs(delta) : 0
    }
    pending += delta
  }

  return Math.round(pending * 100) / 100
}


// Convierte una lista de balances en distintas monedas a una sola moneda de
// visualización, usando el tipo de cambio del día pedido en paralelo.
// Soporta tasas manuales personalizadas (customRates) definidas por el usuario.
export async function convertToDisplayCurrency(
  balances: AccountBalance[],
  displayCurrency: string,
  date: string,
  customRates?: Record<string, number>
): Promise<number> {
  const converted = await Promise.all(
    balances.map(async (b) => {
      if (b.balance === 0) return 0
      if (b.currency.toUpperCase() === displayCurrency.toUpperCase()) {
        return b.balance
      }
      const pairKey = `${b.currency.toUpperCase()}_${displayCurrency.toUpperCase()}`
      if (customRates && typeof customRates[pairKey] === 'number') {
        return b.balance * customRates[pairKey]
      }
      try {
        const rate = await getRate(date, b.currency, displayCurrency)
        return b.balance * rate
      } catch {
        // Si la API de FX falla para esa moneda puntual, no rompemos todo el
        // dashboard -- se excluye del total.
        return 0
      }
    })
  )

  const total = converted.reduce((sum, val) => sum + val, 0)
  return Math.round(total * 100) / 100
}
