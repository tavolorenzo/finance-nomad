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
  is_active: boolean
}

export interface Category {
  id: string
  name: string
}

export interface Person {
  id: string
  name: string
  phone: string | null
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
}

// Placeholder de Database para que createBrowserClient<Database> tipe bien.
// Se reemplaza por el tipo generado (`supabase gen types typescript`) cuando
// el proyecto ya esté linkeado — ver SETUP.md.
export type Database = any
