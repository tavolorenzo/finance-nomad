import type { LedgerBundle, OutboxJob } from '../ledger/types'
import {
  deleteOutboxJob,
  getPendingOutboxJobs,
  saveOutboxJob
} from '../storage/outbox-db'

export interface SyncState {
  isSyncing: boolean
  pendingCount: number
  failedCount: number
  lastSyncAt: number | null
  lastError: string | null
}

type SyncListener = (state: SyncState) => void

class SyncEngine {
  private isSyncing = false
  private retryTimeoutId: ReturnType<typeof setTimeout> | null = null
  private listeners = new Set<SyncListener>()
  private state: SyncState = {
    isSyncing: false,
    pendingCount: 0,
    failedCount: 0,
    lastSyncAt: null,
    lastError: null
  }

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.dispatch())
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.dispatch()
        }
      })
      // Cargar conteo inicial de la cola
      this.refreshState()
    }
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener)
    listener(this.state)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.state)
    }
  }

  public async refreshState(): Promise<void> {
    try {
      const pendingJobs = await getPendingOutboxJobs()
      const failedCount = pendingJobs.filter((j) => j.status === 'FAILED').length
      this.state = {
        ...this.state,
        pendingCount: pendingJobs.length,
        failedCount,
        isSyncing: this.isSyncing
      }
      this.notify()
    } catch {
      // Ignorar en entornos sin IndexedDB
    }
  }

  // Encola un nuevo bundle en el Outbox y dispara la sincronización en background
  public async enqueue(bundle: LedgerBundle): Promise<void> {
    const job: OutboxJob = {
      id: bundle.id,
      bundle,
      status: 'PENDING',
      attempts: 0,
      createdAt: Date.now()
    }

    await saveOutboxJob(job)
    await this.refreshState()

    // Disparar sincronización silenciosa
    this.dispatch().catch(() => {})
  }

  // Procesa los elementos pendientes de la cola
  public async dispatch(): Promise<void> {
    if (this.isSyncing) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return
    }

    const jobs = await getPendingOutboxJobs()
    if (jobs.length === 0) {
      await this.refreshState()
      return
    }

    this.isSyncing = true
    this.state = { ...this.state, isSyncing: true, lastError: null }
    this.notify()

    try {
      // Marcar trabajos como SYNCING
      for (const job of jobs) {
        job.status = 'SYNCING'
        await saveOutboxJob(job)
      }

      const res = await fetch('/api/ledger/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bundles: jobs.map((j) => j.bundle)
        })
      })

      if (!res.ok) {
        throw new Error(`Error en servidor de sincronización (${res.status})`)
      }

      const result = await res.json()
      const processedSet = new Set<string>(result.processedBundleIds || [])

      for (const job of jobs) {
        if (processedSet.has(job.bundle.id)) {
          // Confirmado: borrar del Outbox local
          await deleteOutboxJob(job.id)
        } else {
          // Falló individualmente
          job.status = 'FAILED'
          job.attempts += 1
          job.lastAttemptAt = Date.now()
          await saveOutboxJob(job)
        }
      }

      this.state.lastSyncAt = Date.now()
      this.state.lastError = null
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Fallo de conexión'
      this.state.lastError = errMsg

      // Revertir a FAILED e incrementar intentos
      for (const job of jobs) {
        job.status = 'FAILED'
        job.attempts += 1
        job.lastAttemptAt = Date.now()
        job.errorMessage = errMsg
        await saveOutboxJob(job)
      }

      // Programar reintento con backoff exponencial (máx 30s)
      this.scheduleRetry(jobs[0]?.attempts || 1)
    } finally {
      this.isSyncing = false
      await this.refreshState()
    }
  }

  private scheduleRetry(attempt: number) {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }

    const delayMs = Math.min(30000, 1000 * Math.pow(2, Math.min(attempt, 5)))
    this.retryTimeoutId = setTimeout(() => {
      this.dispatch().catch(() => {})
    }, delayMs)
  }

  public getState(): SyncState {
    return this.state
  }
}

export const syncEngine = new SyncEngine()
