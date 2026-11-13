'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshCw, Sparkles, X } from 'lucide-react'
import {
  getAppVersion,
  getCommitSha,
  isUpdateAvailable,
  type RemoteVersionPayload
} from '@/lib/version'

const FOCUS_COOLDOWN_MS = 5 * 60 * 1000 // 5 minutos entre chequeos por foco
const POLL_INTERVAL_MS = 30 * 60 * 1000 // 30 minutos en segundo plano
export const VERSION_DETECTED_EVENT = 'fn:version-detected'

export async function reloadWithCleanCache(reloadFn?: () => void): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    if ('caches' in window && window.caches) {
      const keys = await window.caches.keys()
      await Promise.all(
        keys.filter((key) => key.startsWith('fn-')).map((key) => window.caches.delete(key))
      )
    }
  } catch {
    // Ignorar fallos de Cache Storage en contextos restringidos
  }

  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker?.getRegistration) {
      const reg = await navigator.serviceWorker.getRegistration()
      await reg?.update()
    }
  } catch {
    // Ignorar si no hay Service Worker activo
  }

  if (reloadFn) {
    reloadFn()
  } else {
    window.location.reload()
  }
}

export interface VersionUpdateBannerProps {
  clientVersion?: string
  clientCommitSha?: string | null
  cooldownMs?: number
  pollIntervalMs?: number
  onReload?: () => void
}

export function VersionUpdateBanner({
  clientVersion = getAppVersion(),
  clientCommitSha = getCommitSha(),
  cooldownMs = FOCUS_COOLDOWN_MS,
  pollIntervalMs = POLL_INTERVAL_MS,
  onReload
}: VersionUpdateBannerProps = {}) {
  const [remoteUpdate, setRemoteUpdate] = useState<RemoteVersionPayload | null>(null)
  const [dismissedKey, setDismissedKey] = useState<string | null>(null)
  const [isReloading, setIsReloading] = useState(false)
  const lastCheckAtRef = useRef<number>(0)

  const checkVersion = useCallback(
    async (force = false) => {
      if (typeof window === 'undefined') return
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return

      const now = Date.now()
      if (!force && lastCheckAtRef.current > 0 && now - lastCheckAtRef.current < cooldownMs) {
        return
      }
      lastCheckAtRef.current = now

      try {
        const res = await fetch('/api/version', {
          method: 'GET',
          cache: 'no-store',
          headers: { Accept: 'application/json' }
        })
        if (!res.ok) return

        const data = (await res.json()) as RemoteVersionPayload
        if (isUpdateAvailable(clientVersion, clientCommitSha, data)) {
          setRemoteUpdate(data)
        }
      } catch {
        // Silencioso en caso de corte de red o modo offline
      }
    },
    [clientVersion, clientCommitSha, cooldownMs]
  )

  useEffect(() => {
    checkVersion(true)

    const handleVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return
      }
      checkVersion(false)
    }

    const handleManualDetection = (event: Event) => {
      const customEvent = event as CustomEvent<RemoteVersionPayload>
      if (customEvent.detail) {
        setRemoteUpdate(customEvent.detail)
        setDismissedKey(null)
      }
    }

    window.addEventListener('focus', handleVisibilityOrFocus)
    document.addEventListener('visibilitychange', handleVisibilityOrFocus)
    window.addEventListener(VERSION_DETECTED_EVENT, handleManualDetection)

    const intervalId = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return
      }
      checkVersion(true)
    }, pollIntervalMs)

    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus)
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus)
      window.removeEventListener(VERSION_DETECTED_EVENT, handleManualDetection)
      window.clearInterval(intervalId)
    }
  }, [checkVersion, pollIntervalMs])

  if (!remoteUpdate) return null

  const updateKey = `${remoteUpdate.version ?? ''}:${remoteUpdate.commitSha ?? ''}`
  if (dismissedKey === updateKey) return null

  const handleRefresh = async () => {
    setIsReloading(true)
    await reloadWithCleanCache(onReload)
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-surface-1 border-b border-accent/30 px-4 py-2.5 text-xs text-text-primary"
    >
      <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-accent/15 text-accent shrink-0">
            <Sparkles size={13} />
          </span>
          <p className="text-text-primary">
            <span className="font-medium">Nueva versión disponible</span>
            {remoteUpdate.version ? (
              <span className="font-mono tabular-nums text-accent ml-1">
                (v{remoteUpdate.version})
              </span>
            ) : null}
            <span className="text-text-secondary ml-1">
              · Recargá la app para aplicar las últimas mejoras.
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isReloading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-control bg-accent text-[color:var(--on-accent)] font-medium text-xs hover:opacity-90 transition disabled:opacity-60"
          >
            <RefreshCw size={12} className={isReloading ? 'animate-spin' : ''} />
            {isReloading ? 'Actualizando...' : 'Actualizar / Recargar'}
          </button>
          <button
            type="button"
            onClick={() => setDismissedKey(updateKey)}
            aria-label="Posponer actualización"
            className="p-1 rounded-control text-text-muted hover:text-text-primary transition"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

