'use client'

import { useState } from 'react'
import {
  getEnvironmentInfo,
  isUpdateAvailable,
  type RemoteVersionPayload
} from '@/lib/version'
import {
  reloadWithCleanCache,
  VERSION_DETECTED_EVENT
} from './VersionUpdateBanner'
import {
  Server,
  Database,
  Tag,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  RefreshCw,
  Sparkles
} from 'lucide-react'

export function SystemInfoCard() {
  const info = getEnvironmentInfo()
  const [checking, setChecking] = useState(false)
  const [checkStatus, setCheckStatus] = useState<'idle' | 'up-to-date' | 'update-available' | 'error'>('idle')
  const [remoteVersion, setRemoteVersion] = useState<RemoteVersionPayload | null>(null)
  const [reloading, setReloading] = useState(false)

  const handleCheckUpdate = async () => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setCheckStatus('error')
      return
    }

    setChecking(true)
    setCheckStatus('idle')
    try {
      const res = await fetch('/api/version', {
        method: 'GET',
        cache: 'no-store',
        headers: { Accept: 'application/json' }
      })
      if (!res.ok) {
        setCheckStatus('error')
        return
      }
      const data = (await res.json()) as RemoteVersionPayload
      if (isUpdateAvailable(info.version, info.commitSha, data)) {
        setRemoteVersion(data)
        setCheckStatus('update-available')
        window.dispatchEvent(new CustomEvent(VERSION_DETECTED_EVENT, { detail: data }))
      } else {
        setCheckStatus('up-to-date')
      }
    } catch {
      setCheckStatus('error')
    } finally {
      setChecking(false)
    }
  }

  const handleReload = async () => {
    setReloading(true)
    await reloadWithCleanCache()
  }

  return (
    <div className="bg-surface-1 border border-border rounded-card p-4 space-y-4">
      {/* Cabecera con título y badge de entorno */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Server size={18} className="text-text-secondary" />
          <h2 className="text-sm font-medium text-text-secondary">Sistema y entorno</h2>
        </div>

        {/* Badge visual según entorno */}
        {info.isProduction ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-income/15 text-income border border-income/30">
            <span className="w-1.5 h-1.5 rounded-full bg-income" />
            Producción
          </span>
        ) : info.isStaging ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-pending/15 text-pending border border-pending/30">
            <span className="w-1.5 h-1.5 rounded-full bg-pending animate-pulse" />
            Pre-producción
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-accent/15 text-accent border border-accent/30">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Desarrollo
          </span>
        )}
      </div>

      {/* Banner contextual según el entorno */}
      {info.isProduction ? (
        <div className="bg-surface-0 border border-border rounded-control p-3 text-xs flex items-start gap-2.5">
          <CheckCircle2 size={16} className="text-income shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-medium text-text-primary">Operando en producción</p>
            <p className="text-text-muted">{info.description}</p>
          </div>
        </div>
      ) : info.isStaging ? (
        <div className="bg-surface-0 border border-border rounded-control p-3 text-xs flex items-start gap-2.5">
          <ShieldAlert size={16} className="text-pending shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-medium text-text-primary">Entorno de staging</p>
            <p className="text-text-muted">{info.description}</p>
          </div>
        </div>
      ) : (
        <div className="bg-surface-0 border border-border rounded-control p-3 text-xs flex items-start gap-2.5">
          <AlertTriangle size={16} className="text-accent shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-medium text-text-primary">Modo desarrollo activo</p>
            <p className="text-text-muted">{info.description}</p>
          </div>
        </div>
      )}

      {/* Ficha técnica: versión y base de datos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
        <div className="bg-surface-0 border border-border rounded-control p-3 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-text-muted text-xs">
              <Tag size={13} />
              <span>Versión instalada</span>
            </div>
            <button
              type="button"
              onClick={handleCheckUpdate}
              disabled={checking || reloading}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:opacity-80 transition disabled:opacity-50"
            >
              <RefreshCw size={11} className={checking ? 'animate-spin' : ''} />
              {checking ? 'Verificando...' : 'Buscar actualización'}
            </button>
          </div>
          <p className="font-mono tabular-nums text-text-primary font-medium text-sm">
            v{info.version}
            {info.commitSha ? (
              <span className="text-xs text-text-muted font-normal ml-1.5">
                ({info.commitSha})
              </span>
            ) : null}
          </p>
          {checkStatus === 'up-to-date' && (
            <p className="text-[11px] text-income flex items-center gap-1">
              <CheckCircle2 size={12} />
              Tenés la última versión disponible.
            </p>
          )}
          {checkStatus === 'error' && (
            <p className="text-[11px] text-pending">
              No se pudo verificar la versión (revisá tu conexión).
            </p>
          )}
          {checkStatus === 'update-available' && (
            <div className="pt-1 flex items-center justify-between gap-2">
              <span className="text-[11px] text-accent font-medium flex items-center gap-1">
                <Sparkles size={12} />
                Nueva versión {remoteVersion?.version ? `v${remoteVersion.version}` : 'disponible'}
              </span>
              <button
                type="button"
                onClick={handleReload}
                disabled={reloading}
                className="px-2 py-1 rounded-control bg-accent text-[color:var(--on-accent)] text-[11px] font-medium hover:opacity-90 transition"
              >
                {reloading ? 'Actualizando...' : 'Actualizar / Recargar'}
              </button>
            </div>
          )}
        </div>

        <div className="bg-surface-0 border border-border rounded-control p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-text-muted text-xs">
            <Database size={13} />
            <span>Base de datos (Supabase)</span>
          </div>
          <p className="font-mono text-text-primary text-xs truncate" title={info.supabaseHost}>
            {info.supabaseHost}
          </p>
        </div>
      </div>

      <p className="text-xs text-text-muted">
        {info.isProduction
          ? 'Para cambios de configuración o mantenimiento, revisá el panel de control de Supabase y Vercel.'
          : 'Cuando pases a producción en tu plataforma de despliegue, asegurate de configurar las credenciales de la base de datos definitiva.'}
      </p>
    </div>
  )
}
