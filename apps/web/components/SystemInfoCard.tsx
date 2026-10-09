import { getEnvironmentInfo } from '@/lib/version'
import { Server, Database, Tag, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react'

export function SystemInfoCard() {
  const info = getEnvironmentInfo()

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
        <div className="bg-surface-0 border border-border rounded-control p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-text-muted text-xs">
            <Tag size={13} />
            <span>Versión instalada</span>
          </div>
          <p className="font-mono tabular-nums text-text-primary font-medium text-sm">
            v{info.version}
          </p>
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
