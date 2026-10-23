'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { Account, Category, MasterTransaction, Person, UserSettings } from '../types'
import type {
  AccountBalance,
  BuildPersonSettlementInput,
  BuildTransactionInput,
  BuildTransferInput,
  LedgerBundle
} from './types'
import { buildTransactionBundle, buildTransferBundle } from './builder'
import { buildPersonSettlementBundle } from './settlement'
import { applyBundleDelta, applyDeletionDelta, applyConfirmationDelta } from './balance'
import { syncEngine, type SyncState } from '../sync/sync-engine'
import { getCachedSnapshot, saveCachedSnapshot } from '../storage/outbox-db'

interface BootstrapData {
  userId: string
  asOfDate: string
  settings: UserSettings
  accounts: Account[]
  categories: Category[]
  people: Person[]
  estimates: unknown[]
  balances: AccountBalance[]
  recentTransactions: MasterTransaction[]
  fxRates?: Record<string, number>
}

interface LedgerContextType {
  isInitialized: boolean
  isLoading: boolean
  settings: UserSettings | null
  accounts: Account[]
  balances: AccountBalance[]
  recentTransactions: MasterTransaction[]
  categories: Category[]
  people: Person[]
  syncState: SyncState
  hasMoreTransactions: boolean
  getBalance: (accountId: string) => number
  addTransaction: (input: BuildTransactionInput) => Promise<LedgerBundle>
  addTransfer: (input: BuildTransferInput) => Promise<LedgerBundle>
  addPersonSettlement: (input: BuildPersonSettlementInput) => Promise<LedgerBundle>
  deleteTransaction: (transactionId: string) => Promise<void>
  confirmTransaction: (transactionId: string) => Promise<void>
  loadMoreTransactions: () => Promise<void>
  retrySync: () => Promise<void>
  refresh: () => Promise<void>
  seedInitialData: (data: {
    accounts?: Account[]
    balances?: AccountBalance[]
    recentTransactions?: MasterTransaction[]
    settings?: UserSettings | null
    categories?: Category[]
    people?: Person[]
  }) => void
}

const LedgerContext = createContext<LedgerContextType | null>(null)

export function LedgerProvider({
  children,
  initialData
}: {
  children: React.ReactNode
  initialData?: BootstrapData
}) {
  const [isInitialized, setIsInitialized] = useState(!!initialData)
  const [isLoading, setIsLoading] = useState(!initialData)
  const [settings, setSettings] = useState<UserSettings | null>(initialData?.settings ?? null)
  const [accounts, setAccounts] = useState<Account[]>(initialData?.accounts ?? [])
  const [balances, setBalances] = useState<AccountBalance[]>(initialData?.balances ?? [])
  const [recentTransactions, setRecentTransactions] = useState<MasterTransaction[]>(
    initialData?.recentTransactions ?? []
  )
  const [categories, setCategories] = useState<Category[]>(initialData?.categories ?? [])
  const [people, setPeople] = useState<Person[]>(initialData?.people ?? [])
  const [syncState, setSyncState] = useState<SyncState>(syncEngine.getState())
  const [hasMoreTransactions, setHasMoreTransactions] = useState(true)

  // Suscribirse al motor de sincronización
  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((state) => {
      setSyncState(state)
    })
    return () => unsubscribe()
  }, [])

  // Carga inicial o reconciliación
  const loadBootstrap = useCallback(async () => {
    try {
      // 1. Intentar cargar desde IndexedDB para 0ms si no vino en initialData
      if (!initialData) {
        const cached = await getCachedSnapshot<BootstrapData>()
        if (cached) {
          setSettings((prev) => prev ?? cached.settings)
          setAccounts((prev) => (prev.length === 0 ? cached.accounts : prev))
          setBalances((prev) => (prev.length === 0 ? cached.balances : prev))
          setRecentTransactions((prev) => (prev.length === 0 ? cached.recentTransactions : prev))
          setCategories((prev) => (prev.length === 0 ? cached.categories : prev))
          setPeople((prev) => (prev.length === 0 ? cached.people : prev))
          setIsInitialized(true)
          setIsLoading(false)
        }
      }

      // 2. Traer snapshot fresco de /api/bootstrap
      const res = await fetch('/api/bootstrap')
      if (res.ok) {
        const fresh: BootstrapData = await res.json()
        setSettings(fresh.settings)
        setAccounts(fresh.accounts)
        setCategories(fresh.categories)
        setPeople(fresh.people)

        // Combinar con cualquier mutación del Outbox que aún no haya sincronizado
        const { getPendingOutboxJobs } = await import('../storage/outbox-db')
        const pendingJobs = await getPendingOutboxJobs()
        let mergedBalances = fresh.balances
        let pendingRows: MasterTransaction[] = []
        for (const job of pendingJobs) {
          mergedBalances = applyBundleDelta(mergedBalances, job.bundle)
          pendingRows = [...job.bundle.rows, ...pendingRows]
        }

        setBalances(mergedBalances)
        setRecentTransactions([
          ...pendingRows,
          ...fresh.recentTransactions.filter((t) => !pendingRows.some((p) => p.id === t.id))
        ])

        setIsInitialized(true)
        setIsLoading(false)

        // Guardar tasas FX en la caché local para disponibilidad offline (24h TTL)
        if (fresh.fxRates) {
          const { saveRatesMatrix, setCachedRate } = await import('../storage/fx-cache')
          saveRatesMatrix(fresh.fxRates)

          // Registrar explícitamente las cotizaciones manuales del usuario como isManual
          if (fresh.settings?.active_currencies && Array.isArray(fresh.settings.active_currencies)) {
            const displayCurr = fresh.settings.display_currency || 'EUR'
            for (const c of fresh.settings.active_currencies) {
              if (
                c.rate_mode === 'manual' &&
                typeof c.custom_rate_against_global === 'number' &&
                c.custom_rate_against_global > 0
              ) {
                setCachedRate(displayCurr, c.code, c.custom_rate_against_global, Date.now(), true)
              }
            }
          }
        }

        // Guardar snapshot actualizado en IndexedDB para la próxima sesión
        saveCachedSnapshot(fresh).catch(() => {})
      }
    } catch {
      // Fallback silencioso: si falla la red, la app opera con el estado en caché
      setIsLoading(false)
      setIsInitialized(true)
    }
  }, [initialData])

  useEffect(() => {
    if (!initialData) {
      loadBootstrap()
    }
  }, [initialData, loadBootstrap])

  const getBalance = useCallback(
    (accountId: string): number => {
      const match = balances.find((b) => b.accountId === accountId)
      return match ? match.balance : 0
    },
    [balances]
  )

  // Registrar un gasto, ingreso o ajuste en < 16ms
  const addTransaction = useCallback(
    async (input: BuildTransactionInput): Promise<LedgerBundle> => {
      const bundle = buildTransactionBundle(input)

      // Actualizar inmediatamente en memoria:
      // 1. Aplicar delta contable al saldo
      setBalances((prev) => applyBundleDelta(prev, bundle))
      // 2. Colocar filas al inicio de la lista de transacciones recientes
      setRecentTransactions((prev) => [...bundle.rows, ...prev])

      // 3. Encolar en background para persistencia en Supabase
      syncEngine.enqueue(bundle).catch(() => {})

      return bundle
    },
    []
  )

  // Registrar una transferencia o pago de tarjeta en < 16ms
  const addTransfer = useCallback(
    async (input: BuildTransferInput): Promise<LedgerBundle> => {
      const bundle = buildTransferBundle(input)

      // Actualizar inmediatamente en memoria
      setBalances((prev) => applyBundleDelta(prev, bundle))
      setRecentTransactions((prev) => [...bundle.rows, ...prev])

      // Encolar en background
      syncEngine.enqueue(bundle).catch(() => {})

      return bundle
    },
    []
  )

  // Registrar cobro/liquidación a persona en < 16ms
  const addPersonSettlement = useCallback(
    async (input: BuildPersonSettlementInput): Promise<LedgerBundle> => {
      const { bundle, allocationResult } = buildPersonSettlementBundle(input)

      // Actualizar inmediatamente en memoria:
      // 1. Aplicar delta contable al saldo de la cuenta receptora
      setBalances((prev) => applyBundleDelta(prev, bundle))

      // 2. Actualizar lista de transacciones en memoria
      const updatedMap = new Map(allocationResult.updatedTransactions.map((t) => [t.id, t]))
      setRecentTransactions((prev) => {
        const incomeRow = bundle.rows[0]
        const merged = prev.map((t) => updatedMap.get(t.id) ?? t)
        return [incomeRow, ...merged]
      })

      // 3. Encolar en background para persistencia en Supabase
      syncEngine.enqueue(bundle).catch(() => {})

      return bundle
    },
    []
  )

  // Cargar más movimientos históricos
  const loadMoreTransactions = useCallback(async () => {
    if (recentTransactions.length === 0) return

    const oldest = recentTransactions[recentTransactions.length - 1]
    const beforeDate = oldest.date

    try {
      const res = await fetch(`/api/transactions?beforeDate=${beforeDate}&limit=30`)
      if (!res.ok) return

      const data = await res.json()
      if (Array.isArray(data.transactions) && data.transactions.length > 0) {
        setRecentTransactions((prev) => {
          const existingIds = new Set(prev.map((t) => t.id))
          const fresh = data.transactions.filter((t: MasterTransaction) => !existingIds.has(t.id))
          return [...prev, ...fresh]
        })
        setHasMoreTransactions(data.hasMore)
      } else {
        setHasMoreTransactions(false)
      }
    } catch {
      // Ignorar fallos de red temporales
    }
  }, [recentTransactions])

  const seedInitialData = useCallback(
    (data: {
      accounts?: Account[]
      balances?: AccountBalance[]
      recentTransactions?: MasterTransaction[]
      settings?: UserSettings | null
      categories?: Category[]
      people?: Person[]
    }) => {
      if (data.accounts && data.accounts.length > 0) {
        setAccounts((prev) => (prev.length === 0 ? data.accounts! : prev))
      }
      if (data.balances && data.balances.length > 0) {
        setBalances((prev) => (prev.length === 0 ? data.balances! : prev))
      }
      if (data.recentTransactions && data.recentTransactions.length > 0) {
        setRecentTransactions((prev) => (prev.length === 0 ? data.recentTransactions! : prev))
      }
      if (data.categories && data.categories.length > 0) {
        setCategories((prev) => (prev.length === 0 ? data.categories! : prev))
      }
      if (data.people && data.people.length > 0) {
        setPeople((prev) => (prev.length === 0 ? data.people! : prev))
      }
      if (data.settings) {
        setSettings((prev) => prev ?? data.settings!)
      }
      setIsInitialized(true)
    },
    []
  )

  // Eliminar transacción con reversión optimista inmediata en memoria y eliminación en DB
  const deleteTransaction = useCallback(
    async (transactionId: string): Promise<void> => {
      // 1. Identificar en memoria las filas a eliminar (incluyendo transferencias vinculadas)
      let rowsToDelete: MasterTransaction[] = []
      const target = recentTransactions.find((t) => t.id === transactionId)

      if (target) {
        if (target.parent_transaction_id) {
          const parentId = target.parent_transaction_id
          rowsToDelete = recentTransactions.filter(
            (t) => t.id === parentId || t.parent_transaction_id === parentId || t.id === target.id
          )
        } else {
          rowsToDelete = recentTransactions.filter(
            (t) => t.id === target.id || t.parent_transaction_id === target.id
          )
        }
      }

      // 2. Reversión instantánea en memoria (0 ms)
      if (rowsToDelete.length > 0) {
        const idsSet = new Set(rowsToDelete.map((r) => r.id))
        setBalances((prev) => applyDeletionDelta(prev, rowsToDelete))
        setRecentTransactions((prev) => prev.filter((r) => !idsSet.has(r.id)))
      }

      // 3. Si estaba encolada en Outbox local, removerla
      try {
        const { getPendingOutboxJobs, deleteOutboxJob } = await import('../storage/outbox-db')
        const pendingJobs = await getPendingOutboxJobs()
        for (const job of pendingJobs) {
          const hasTx = job.bundle.rows.some(
            (r) => r.id === transactionId || (target && r.id === target.parent_transaction_id)
          )
          if (hasTx) {
            await deleteOutboxJob(job.id)
          }
        }
      } catch {}

      // 4. Ejecutar la acción en el servidor
      const { deleteTransaction: deleteAction } = await import(
        '@/app/(protected)/transactions/new/actions'
      )
      await deleteAction(transactionId)

      // 5. Reconciliar snapshot fresco en background
      loadBootstrap().catch(() => {})
    },
    [recentTransactions, loadBootstrap]
  )

  // Confirmar una transacción de PENDING a COMPLETED impactando saldo nominal
  const confirmTransaction = useCallback(
    async (transactionId: string): Promise<void> => {
      const target = recentTransactions.find((t) => t.id === transactionId)

      if (target && target.status === 'PENDING') {
        setBalances((prev) => applyConfirmationDelta(prev, target))
        setRecentTransactions((prev) =>
          prev.map((t) => (t.id === transactionId ? { ...t, status: 'COMPLETED' as const } : t))
        )
      }

      const { confirmTransaction: confirmAction } = await import(
        '@/app/(protected)/transactions/new/actions'
      )
      await confirmAction(transactionId)

      loadBootstrap().catch(() => {})
    },
    [recentTransactions, loadBootstrap]
  )

  const retrySync = useCallback(async () => {
    await syncEngine.dispatch()
  }, [])

  return (
    <LedgerContext.Provider
      value={{
        isInitialized,
        isLoading,
        settings,
        accounts,
        balances,
        recentTransactions,
        categories,
        people,
        syncState,
        hasMoreTransactions,
        getBalance,
        addTransaction,
        addTransfer,
        addPersonSettlement,
        deleteTransaction,
        confirmTransaction,
        loadMoreTransactions,
        retrySync,
        refresh: loadBootstrap,
        seedInitialData
      }}
    >
      {children}
    </LedgerContext.Provider>
  )
}

export function useLedger() {
  const context = useContext(LedgerContext)
  if (!context) {
    throw new Error('useLedger debe ser utilizado dentro de un LedgerProvider')
  }
  return context
}

export function useOptionalLedger() {
  return useContext(LedgerContext)
}

