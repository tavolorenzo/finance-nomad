import type { MasterTransaction, AccountType } from '../types'

export type LedgerBundleType = 'TRANSACTION' | 'TRANSFER' | 'ADJUSTMENT' | 'SETTLEMENT'

export interface LedgerBundle {
  id: string
  type: LedgerBundleType
  createdAt: string
  rateFetchedAt?: string | null
  description?: string
  rows: MasterTransaction[]
}

export interface BuildTransactionInput {
  userId?: string
  type: 'INCOME' | 'OUTCOME' | 'ADJUSTMENT'
  amountOriginal: number
  currencyOriginal: string
  feeAmount?: number
  exchangeRate?: number
  rateOverridden?: boolean
  rateFetchedAt?: string | null
  amountAccount?: number
  currencyAccount: string
  date: string
  institutionId: string
  accountId: string
  categoryId?: string | null
  personId?: string | null
  installmentCurrent?: number
  installmentTotal?: number
  notes?: string | null
  today?: string
}

export interface AccountSummaryForTransfer {
  id: string
  name: string
  currency_native: string
  institution_id: string
  type?: AccountType
}

export interface BuildTransferInput {
  userId?: string
  fromAccount: AccountSummaryForTransfer
  toAccount: AccountSummaryForTransfer
  amountOriginal: number
  currencyOriginal: string
  amountFrom?: number
  amountTo?: number
  feeAmount?: number
  exchangeRate?: number
  rateOverridden?: boolean
  rateFetchedAt?: string | null
  date: string
  notes?: string | null
  today?: string
}

export interface BuildPersonSettlementInput {
  userId?: string
  personId: string
  personName: string
  destinationAccount: AccountSummaryForTransfer
  amountOriginal: number
  currencyOriginal: string
  amountAccount?: number
  currencyAccount: string
  exchangeRate?: number
  rateOverridden?: boolean
  rateFetchedAt?: string | null
  date: string
  categoryId?: string | null
  notes?: string | null
  today?: string
  pendingTransactions: MasterTransaction[]
}

export interface AccountBalance {
  accountId: string
  currency: string
  balance: number
}

export type OutboxJobStatus = 'PENDING' | 'SYNCING' | 'FAILED' | 'SYNCED'

export interface OutboxJob {
  id: string
  bundle: LedgerBundle
  status: OutboxJobStatus
  attempts: number
  createdAt: number
  lastAttemptAt?: number
  errorMessage?: string
}
