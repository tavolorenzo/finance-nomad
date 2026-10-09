export interface CachedRateEntry {
  rate: number
  timestamp: number
}

export type FxCacheMap = Record<string, CachedRateEntry>

export const FX_CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 horas (1 día)
const STORAGE_KEY = 'finance_nomad_fx_rates'

function getStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      return window.localStorage
    } catch {
      return null
    }
  }
  return null
}

function getPairKey(from: string, to: string): string {
  return `${from.toUpperCase()}_${to.toUpperCase()}`
}

export function getAllCachedRates(): FxCacheMap {
  const storage = getStorage()
  if (!storage) return {}
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as FxCacheMap
  } catch {
    return {}
  }
}

export function getCachedRate(
  from: string,
  to: string,
  now = Date.now()
): { rate: number; isExpired: boolean; timestamp: number } | null {
  if (from.toUpperCase() === to.toUpperCase()) {
    return { rate: 1, isExpired: false, timestamp: now }
  }

  const key = getPairKey(from, to)
  const all = getAllCachedRates()
  const entry = all[key]

  if (!entry || typeof entry.rate !== 'number' || entry.rate <= 0) {
    return null
  }

  const isExpired = now - entry.timestamp > FX_CACHE_TTL_MS
  return {
    rate: entry.rate,
    isExpired,
    timestamp: entry.timestamp
  }
}

export function setCachedRate(
  from: string,
  to: string,
  rate: number,
  timestamp = Date.now()
): void {
  if (from.toUpperCase() === to.toUpperCase() || rate <= 0) return

  const storage = getStorage()
  if (!storage) return

  try {
    const all = getAllCachedRates()
    const directKey = getPairKey(from, to)
    all[directKey] = { rate, timestamp }

    // Calcular e inferir inversa automáticamente si no existe o es más antigua
    const inverseKey = getPairKey(to, from)
    const inverseRate = Math.round((1 / rate) * 1000000) / 1000000
    if (!all[inverseKey] || all[inverseKey].timestamp < timestamp) {
      all[inverseKey] = { rate: inverseRate, timestamp }
    }

    storage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    // Si localStorage está lleno o deshabilitado, ignorar
  }
}

export function saveRatesMatrix(
  matrix: Record<string, number>,
  timestamp = Date.now()
): void {
  const storage = getStorage()
  if (!storage) return

  try {
    const all = getAllCachedRates()
    for (const [pair, rate] of Object.entries(matrix)) {
      if (typeof rate === 'number' && rate > 0) {
        all[pair.toUpperCase()] = { rate, timestamp }
      }
    }
    storage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    // Ignorar fallos de cuota
  }
}

export function clearFxCache(): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.removeItem(STORAGE_KEY)
  } catch {
    // Ignorar
  }
}
