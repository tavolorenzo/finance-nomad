import type { OutboxJob } from '../ledger/types'

const DB_NAME = 'finance_nomad_ledger'
const DB_VERSION = 1
const STORE_OUTBOX = 'outbox_jobs'
const STORE_SNAPSHOT = 'app_snapshot'

function isIndexedDBAvailable(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window
}

export function openLedgerDb(): Promise<IDBDatabase | null> {
  if (!isIndexedDBAvailable()) return Promise.resolve(null)

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_OUTBOX)) {
        const store = db.createObjectStore(STORE_OUTBOX, { keyPath: 'id' })
        store.createIndex('status', 'status', { unique: false })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORE_SNAPSHOT)) {
        db.createObjectStore(STORE_SNAPSHOT)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Guardar o actualizar un trabajo en la cola de salida
export async function saveOutboxJob(job: OutboxJob): Promise<void> {
  const db = await openLedgerDb()
  if (!db) return

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_OUTBOX, 'readwrite')
    const store = tx.objectStore(STORE_OUTBOX)
    const req = store.put(job)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

// Obtener todos los trabajos pendientes o que fallaron para reintentar
export async function getPendingOutboxJobs(): Promise<OutboxJob[]> {
  const db = await openLedgerDb()
  if (!db) return []

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_OUTBOX, 'readonly')
    const store = tx.objectStore(STORE_OUTBOX)
    const req = store.getAll()
    req.onsuccess = () => {
      const all: OutboxJob[] = req.result || []
      // Filtrar aquellos que no están confirmados (PENDING o FAILED)
      const pending = all
        .filter((j) => j.status === 'PENDING' || j.status === 'FAILED')
        .sort((a, b) => a.createdAt - b.createdAt)
      resolve(pending)
    }
    req.onerror = () => reject(req.error)
  })
}

// Eliminar un trabajo una vez que fue confirmado por el servidor
export async function deleteOutboxJob(id: string): Promise<void> {
  const db = await openLedgerDb()
  if (!db) return

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_OUTBOX, 'readwrite')
    const store = tx.objectStore(STORE_OUTBOX)
    const req = store.delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

// Obtener conteo de trabajos pendientes en cola
export async function getOutboxPendingCount(): Promise<number> {
  const pending = await getPendingOutboxJobs()
  return pending.length
}

// Guardar snapshot de bootstrap en IndexedDB para arranque en 0ms
export async function saveCachedSnapshot(snapshot: unknown): Promise<void> {
  const db = await openLedgerDb()
  if (!db) return

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SNAPSHOT, 'readwrite')
    const store = tx.objectStore(STORE_SNAPSHOT)
    const req = store.put(snapshot, 'bootstrap')
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

// Obtener snapshot en caché
export async function getCachedSnapshot<T = unknown>(): Promise<T | null> {
  const db = await openLedgerDb()
  if (!db) return null

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SNAPSHOT, 'readonly')
    const store = tx.objectStore(STORE_SNAPSHOT)
    const req = store.get('bootstrap')
    req.onsuccess = () => resolve(req.result || null)
    req.onerror = () => reject(req.error)
  })
}

// Limpiar base de datos local (útil al cerrar sesión)
export async function clearLedgerDb(): Promise<void> {
  const db = await openLedgerDb()
  if (!db) return

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORE_OUTBOX, STORE_SNAPSHOT], 'readwrite')
      tx.objectStore(STORE_OUTBOX).clear()
      tx.objectStore(STORE_SNAPSHOT).clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    } catch {
      resolve()
    }
  })
}
