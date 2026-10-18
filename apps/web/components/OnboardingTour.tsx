'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Sparkles,
  Globe,
  Wallet,
  Zap,
  BarChart3,
  ArrowRight,
  ArrowLeft,
  Check,
  X
} from 'lucide-react'

interface OnboardingTourProps {
  isOpen: boolean
  onClose: () => void
  currentCurrency?: string
  onCurrencyChange?: (currency: string) => void
}

const CURRENCIES = [
  { code: 'EUR', label: 'Euro (€)', flag: '🇪🇺' },
  { code: 'USD', label: 'Dólar USA ($)', flag: '🇺🇸' },
  { code: 'AUD', label: 'Dólar Australiano ($)', flag: '🇦🇺' },
  { code: 'UYU', label: 'Peso Uruguayo ($)', flag: '🇺🇾' },
  { code: 'NZD', label: 'Dólar Neozelandés ($)', flag: '🇳🇿' }
]

export function OnboardingTour({
  isOpen,
  onClose,
  currentCurrency = 'EUR',
  onCurrencyChange
}: OnboardingTourProps) {
  const [step, setStep] = useState(0)
  const [selectedCurrency, setSelectedCurrency] = useState(currentCurrency)

  const markCompleted = useCallback(() => {
    try {
      localStorage.setItem('finance_nomad_tour_completed', 'true')
    } catch {
      // Ignore storage errors
    }
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        markCompleted()
      } else if (e.key === 'ArrowRight' && step < 4) {
        setStep((prev) => prev + 1)
      } else if (e.key === 'ArrowLeft' && step > 0) {
        setStep((prev) => prev - 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, step, markCompleted])

  if (!isOpen) return null

  const steps = [
    {
      icon: Sparkles,
      tag: 'Bienvenido',
      title: '¡Te damos la bienvenida a Finance Nomad!',
      subtitle:
        'Tu sistema de finanzas personales, presupuestos y control de deudas diseñado para nómadas digitales y viajeros con alta movilidad.',
      content: (
        <div className="space-y-3 py-2 text-sm text-text-secondary">
          <div className="flex items-start gap-3 p-3 bg-surface-2/60 rounded-control border border-border-subtle">
            <span className="p-1.5 rounded-full bg-accent/15 text-accent mt-0.5">
              <Globe size={16} />
            </span>
            <div>
              <p className="font-semibold text-text-primary">Multi-moneda nativo sin fricción</p>
              <p className="text-xs text-text-muted mt-0.5">
                Manejá gastos y cuentas en EUR, USD, AUD, UYU y NZD con conversión de patrimonio en vivo.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-surface-2/60 rounded-control border border-border-subtle">
            <span className="p-1.5 rounded-full bg-income/15 text-income mt-0.5">
              <Zap size={16} />
            </span>
            <div>
              <p className="font-semibold text-text-primary">Zero-Wait UI y 100% Offline</p>
              <p className="text-xs text-text-muted mt-0.5">
                Cargá movimientos en menos de 3 segundos aunque estés en un vuelo o sin señal. Sincroniza solo al reconectar.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      icon: Globe,
      tag: 'Divisa Principal',
      title: 'Tu moneda global de referencia',
      subtitle:
        'Elegí la divisa con la que querés visualizar tu patrimonio neto consolidado y los análisis generales en el dashboard.',
      content: (
        <div className="space-y-3 py-2">
          <p className="text-xs text-text-muted">
            Podés cambiarla en cualquier momento desde Ajustes sin alterar los saldos nativos de tus cuentas.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CURRENCIES.map((c) => {
              const isSelected = selectedCurrency === c.code
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    setSelectedCurrency(c.code)
                    if (onCurrencyChange) onCurrencyChange(c.code)
                  }}
                  className={`flex items-center justify-between p-3 rounded-control border text-left transition ${
                    isSelected
                      ? 'border-accent bg-accent/10 text-accent font-medium'
                      : 'border-border bg-surface-2/50 text-text-secondary hover:border-text-muted'
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm">
                    <span className="text-base">{c.flag}</span>
                    <span>{c.label}</span>
                  </span>
                  {isSelected && <Check size={16} className="text-accent" />}
                </button>
              )
            })}
          </div>
        </div>
      )
    },
    {
      icon: Wallet,
      tag: 'Bancos y Cuentas',
      title: 'Tus cuentas, tarjetas y efectivo',
      subtitle:
        'Cada banco o billetera mantiene su divisa nativa. Tenés total claridad de lo que tenés en cada país.',
      content: (
        <div className="space-y-2.5 py-2 text-sm text-text-secondary">
          <div className="p-3 bg-surface-2/60 rounded-control border border-border-subtle">
            <p className="font-semibold text-text-primary text-xs uppercase tracking-wider text-accent mb-1">
              Jerarquía por Institución
            </p>
            <p className="text-xs text-text-muted">
              Agrupá tus cuentas por entidad (ej. Wise, CommBank, Itaú, N26) y visualizá saldos corrientes, de ahorro e inversiones.
            </p>
          </div>
          <div className="p-3 bg-surface-2/60 rounded-control border border-border-subtle">
            <p className="font-semibold text-text-primary text-xs uppercase tracking-wider text-income mb-1">
              Cuenta Efectivo (Cash)
            </p>
            <p className="text-xs text-text-muted">
              Viene lista por defecto. Cuando retirás dinero de un cajero (ATM), simplemente registrás una transferencia desde tu banco hacia Efectivo.
            </p>
          </div>
          <div className="p-3 bg-surface-2/60 rounded-control border border-border-subtle">
            <p className="font-semibold text-text-primary text-xs uppercase tracking-wider text-pending mb-1">
              Tarjetas y Pagos
            </p>
            <p className="text-xs text-text-muted">
              Pagá tu resumen con 1 clic usando el modal de liquidación inter-cuenta para mantener tu saldo contable impecable.
            </p>
          </div>
        </div>
      )
    },
    {
      icon: Zap,
      tag: 'Cuotas y Terceros',
      title: 'Carga rápida, cuotas y extensiones',
      subtitle:
        'El formulario universal te permite asentar gastos en cuotas y consumos compartidos con amigos o familia.',
      content: (
        <div className="space-y-2.5 py-2 text-sm text-text-secondary">
          <div className="p-3 bg-surface-2/60 rounded-control border border-border-subtle">
            <p className="font-semibold text-text-primary text-xs text-accent uppercase tracking-wider mb-1">
              Cuotas distribuidas mes a mes
            </p>
            <p className="text-xs text-text-muted">
              Si comprás en 6 cuotas, se genera la cuota 1 hoy y las cuotas 2 a 6 quedan programadas a futuro sin descontar saldo anticipado.
            </p>
          </div>
          <div className="p-3 bg-surface-2/60 rounded-control border border-border-subtle">
            <p className="font-semibold text-text-primary text-xs text-income uppercase tracking-wider mb-1">
              Gastos compartidos & WhatsApp
            </p>
            <p className="text-xs text-text-muted">
              Asigná compras a otras personas, llevales el saldo por cobrar y mandales el detalle por WhatsApp con plantillas dinámicas en 1 toque.
            </p>
          </div>
        </div>
      )
    },
    {
      icon: BarChart3,
      tag: 'Control Total',
      title: 'Categorías y análisis de datos',
      subtitle:
        'Clasificá tus consumos y descubrí patrones de gasto con gráficos interactivos y métricas en tiempo real.',
      content: (
        <div className="space-y-3 py-2 text-sm text-text-secondary">
          <div className="p-3 bg-surface-2/60 rounded-control border border-border-subtle">
            <p className="font-semibold text-text-primary text-xs text-accent uppercase tracking-wider mb-1">
              Catálogo de Categorías
            </p>
            <p className="text-xs text-text-muted">
              Creá y personalizá tus categorías (Alquiler, Supermercado, Transporte, Ocio) con colores semánticos e iconos.
            </p>
          </div>
          <div className="p-3 bg-surface-2/60 rounded-control border border-border-subtle">
            <p className="font-semibold text-text-primary text-xs text-income uppercase tracking-wider mb-1">
              Dashboard de Análisis
            </p>
            <p className="text-xs text-text-muted">
              Explorá tu flujo de caja mensual, distribución porcentual por categoría, tasa de ahorro y gastos por divisa original.
            </p>
          </div>
          <div className="p-3 bg-accent/10 rounded-control border border-accent/20 text-center">
            <p className="text-xs font-semibold text-accent">
              ¡Todo listo! Ya podés empezar a tomar el control de tus finanzas nómadas.
            </p>
          </div>
        </div>
      )
    }
  ]

  const currentStepData = steps[step]
  const IconComponent = currentStepData.icon

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
    >
      <div className="relative w-full max-w-lg bg-surface-1 border border-border rounded-card shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header con Badge de Paso y Botón Cerrar */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-full bg-accent/15 text-accent">
              <IconComponent size={16} />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-accent">
              {currentStepData.tag} · Paso {step + 1} de {steps.length}
            </span>
          </div>
          <button
            onClick={markCompleted}
            className="text-text-muted hover:text-text-primary transition p-1 rounded-control"
            aria-label="Cerrar tour"
          >
            <X size={18} />
          </button>
        </div>

        {/* Barra de progreso */}
        <div className="h-1 bg-surface-2 w-full">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Contenido del paso */}
        <div className="px-6 py-5 overflow-y-auto flex-1 space-y-3">
          <h2 id="tour-title" className="font-display text-xl font-bold text-text-primary">
            {currentStepData.title}
          </h2>
          <p className="text-xs text-text-muted leading-relaxed">
            {currentStepData.subtitle}
          </p>

          <div className="pt-1">{currentStepData.content}</div>
        </div>

        {/* Footer con Controles */}
        <div className="flex items-center justify-between px-6 py-4 bg-surface-2/40 border-t border-border">
          <button
            type="button"
            onClick={markCompleted}
            className="text-xs font-medium text-text-muted hover:text-text-primary transition"
          >
            Omitir tour
          </button>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((prev) => prev - 1)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-control text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-2 transition border border-border"
              >
                <ArrowLeft size={14} />
                Anterior
              </button>
            )}

            {step < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => prev + 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-control text-xs font-medium bg-accent text-[color:var(--on-accent)] hover:opacity-95 transition"
              >
                Siguiente
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={markCompleted}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-control text-xs font-medium bg-income text-[color:var(--on-accent)] hover:opacity-95 transition font-semibold"
              >
                ¡Comenzar ahora!
                <Check size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
