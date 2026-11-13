import { redirect } from 'next/navigation'
import { rethrowIfRedirect } from '@/lib/next/rethrow-redirect'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth-helper'
import { getMultipleTickerQuotes } from '@/lib/portfolio/quotes'
import { normalizeTicker } from '@/lib/portfolio/calculations'
import { PortfolioDashboard } from '@/components/portfolio/PortfolioDashboard'
import type { Account, PortfolioTransaction, TickerQuote, UserSettings } from '@/lib/types'

export default async function PortfolioPage() {
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)
  if (!user) redirect('/login')

  let displayCurrency = 'EUR'
  let transactions: PortfolioTransaction[] = []
  let accounts: (Account & { institutions: { name: string } })[] = []
  let quotes: Record<string, TickerQuote> = {}
  const customRates: Record<string, number> = {}

  try {
    const [settingsRes, portfolioRes, accountsRes] = await Promise.all([
      supabase
        .from('user_settings')
        .select('display_currency, active_currencies')
        .eq('user_id', user.id)
        .maybeSingle<Pick<UserSettings, 'display_currency' | 'active_currencies'>>(),
      supabase
        .from('portfolio_transactions')
        .select(`
          *,
          account:funding_account_id (id, name, currency_native)
        `)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .returns<PortfolioTransaction[]>(),
      supabase
        .from('accounts')
        .select('id, institution_id, name, type, currency_native, credit_limit, closing_day, is_active, institutions!inner(name)')
        .eq('is_active', true)
        .eq('institutions.is_active', true)
        .order('name')
        .returns<(Account & { institutions: { name: string } })[]>()
    ])

    displayCurrency = settingsRes.data?.display_currency ?? 'EUR'
    transactions = portfolioRes.data ?? []
    accounts = accountsRes.data ?? []

    if (settingsRes.data?.active_currencies && Array.isArray(settingsRes.data.active_currencies)) {
      for (const c of settingsRes.data.active_currencies) {
        if (
          c.rate_mode === 'manual' &&
          typeof c.custom_rate_against_global === 'number' &&
          c.custom_rate_against_global > 0
        ) {
          const globalToCustom = `${displayCurrency.toUpperCase()}_${c.code.toUpperCase()}`
          const customToGlobal = `${c.code.toUpperCase()}_${displayCurrency.toUpperCase()}`
          customRates[globalToCustom] = c.custom_rate_against_global
          customRates[customToGlobal] =
            Math.round((1 / c.custom_rate_against_global) * 1000000) / 1000000
        }
      }
    }

    // Obtener cotizaciones de los tickers con modo 'auto'
    const autoTickers = Array.from(
      new Set(
        transactions
          .filter((t) => (t.quote_mode || 'auto') === 'auto')
          .map((t) => normalizeTicker(t.ticker))
          .filter(Boolean)
      )
    )

    if (autoTickers.length > 0) {
      quotes = await getMultipleTickerQuotes(autoTickers)
    }
  } catch (err) {
    rethrowIfRedirect(err)
    // Si está offline, PortfolioDashboard se hidrata automáticamente desde LedgerContext (IndexedDB)
  }

  return (
    <PortfolioDashboard
      initialTransactions={transactions}
      initialQuotes={quotes}
      initialAccounts={accounts}
      initialCustomRates={customRates}
      displayCurrency={displayCurrency}
    />
  )
}

