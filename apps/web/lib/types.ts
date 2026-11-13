// Tipos mínimos alineados a supabase/migrations/0001_init_schema.sql
// (versión resumida a mano; cuando corras `supabase gen types typescript`
// reemplazá este archivo por el generado automático)

export type AccountType = 'checking' | 'savings' | 'investing' | 'credit_card' | 'cash'
export type TransactionType = 'INCOME' | 'OUTCOME' | 'TRANSFER' | 'ADJUSTMENT'
export type TransactionStatus = 'COMPLETED' | 'PENDING'

export interface Institution {
  id: string
  name: string
  is_active: boolean
}

export interface Account {
  id: string
  institution_id: string
  name: string
  type: AccountType
  currency_native: string
  credit_limit: number | null
  closing_day?: number | null
  is_active: boolean
}

export interface Category {
  id: string
  name: string
  icon?: string | null
  color?: string | null
  is_active?: boolean
  created_at?: string
}

export interface Person {
  id: string
  name: string
  phone: string | null
  is_active?: boolean
  created_at?: string
}

export type CurrencyRateMode = 'auto' | 'manual'

export interface ActiveCurrency {
  code: string
  symbol: string
  name: string
  flag?: string
  rate_mode: CurrencyRateMode
  custom_rate_against_global?: number
}

export interface UserSettings {
  user_id: string
  display_currency: string
  theme: 'system' | 'light' | 'dark'
  whatsapp_template?: string | null
  onboarding_completed?: boolean
  active_currencies?: ActiveCurrency[]
  updated_at?: string
}

export interface MasterTransaction {
  id: string
  parent_transaction_id: string | null
  date: string
  type: TransactionType
  amount_original: number
  currency_original: string
  fee_amount: number
  exchange_rate: number
  rate_overridden: boolean
  amount_account: number
  currency_account: string
  institution_id: string
  account_id: string
  category_id: string | null
  person_id: string | null
  installment_current: number
  installment_total: number
  status: TransactionStatus
  notes: string | null
  settled_at: string | null
  settled_amount?: number
  accounting_period?: string | null
  is_verified?: boolean
  verified_at?: string | null
}

export type LoanDirection = 'BORROWED' | 'LENT'
export type LoanStatus = 'ACTIVE' | 'PAID' | 'CANCELLED'

export interface Loan {
  id: string
  user_id?: string
  name: string
  principal: number
  currency: string
  direction: LoanDirection
  counterparty_institution_id?: string | null
  beneficiary_person_id?: string | null
  tea_rate: number
  includes_vat_22: boolean
  total_installments: number
  start_date: string
  due_day?: number | null
  disbursement_account_id?: string | null
  notes?: string | null
  status: LoanStatus
  is_active?: boolean
  created_at?: string
  institution?: Institution | null
  person?: Person | null
}

export interface LoanInstallment {
  id: string
  loan_id: string
  period: number
  installment_amount: number
  interest: number
  payment: number
  balance: number
  vat_amount?: number
  due_date: string | null
  paid: boolean
  paid_at?: string | null
  account_id?: string | null
  transaction_bundle_id?: string | null
}

export interface LoanWithInstallments extends Loan {
  installments: LoanInstallment[]
}

export type BudgetEstimateType = 'INCOME_ESTIMATE' | 'EXPENSE_ESTIMATE'

export interface BudgetEstimate {
  id: string
  user_id?: string
  name: string
  type: BudgetEstimateType
  estimated_amount: number
  currency: string
  category_id: string
  due_day: number | null
  preferred_account_id: string | null
  is_active: boolean
  created_at?: string
  categories?: { id?: string; name: string; icon?: string | null; color?: string | null } | null
  accounts?: { id?: string; name: string; currency_native: string; institution_id?: string } | null
}

export type PortfolioTransactionType = 'BUY' | 'SELL'
export type PortfolioAssetType = 'STOCK' | 'ETF' | 'CRYPTO' | 'FIXED_INCOME' | 'LOCAL'
export type PortfolioQuoteMode = 'auto' | 'manual'

export interface PortfolioTransaction {
  id: string
  user_id?: string
  ticker: string
  asset_name?: string | null
  asset_type: PortfolioAssetType
  type: PortfolioTransactionType
  units: number
  price_per_unit: number
  fee_amount: number
  currency: string
  quote_mode: PortfolioQuoteMode
  manual_price?: number | null
  funding_account_id?: string | null
  linked_transaction_id?: string | null
  notes?: string | null
  date: string
  created_at?: string
  account?: { id: string; name: string; currency_native: string } | null
}

export interface TickerQuote {
  ticker: string
  price: number
  currency: string
  changePercent?: number
  name?: string
  source: 'yahoo' | 'google' | 'coingecko' | 'manual' | 'fallback'
  updatedAt: string
}

export interface PortfolioPosition {
  ticker: string
  assetName: string
  assetType: PortfolioAssetType
  currency: string
  quoteMode: PortfolioQuoteMode
  units: number
  averageCost: number
  investedCapital: number
  currentPrice: number
  marketValue: number
  unrealizedPnL: number
  unrealizedPnLPct: number
  realizedPnL: number
  marketValueInDisplay: number
  investedInDisplay: number
  unrealizedPnLInDisplay: number
  realizedPnLInDisplay: number
  quoteSource: TickerQuote['source']
  quoteUpdatedAt?: string
  dayChangePct?: number
}

// Placeholder de Database para que createBrowserClient<Database> tipe bien.
// Se reemplaza por el tipo generado (`supabase gen types typescript`) cuando
// el proyecto ya esté linkeado — ver SETUP.md.
export type Database = any
