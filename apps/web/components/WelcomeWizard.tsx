'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sparkles,
  Check,
  CheckCircle2,
  Wallet,
  CreditCard,
  Building2,
  Coins,
  Globe,
  Users,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  WifiOff,
  Tag,
  ShieldCheck,
  Info,
  Loader2,
  Search,
  X
} from 'lucide-react'
import { useOnlineStatus } from '@/lib/hooks/use-online-status'
import {
  seedUserSpaceAction,
  skipWelcomeAction,
  type InitialAccountInput,
  type InitialCategoryInput
} from '@/app/welcome/actions'
import {
  CURRENCY_CATALOG,
  searchCurrencies,
  getCurrencyInfo,
  type CurrencyCatalogItem
} from '@/lib/currency-catalog'
import { setCachedRate } from '@/lib/storage/fx-cache'
import { formatMoney } from '@/lib/currency'
import type { ActiveCurrency } from '@/lib/types'

export const CURRENCIES: CurrencyCatalogItem[] = [
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺', popular: true },
  { code: 'USD', symbol: '$', name: 'Dólar estadounidense', flag: '🇺🇸', popular: true },
  { code: 'ARS', symbol: '$', name: 'Peso argentino', flag: '🇦🇷', popular: true },
  { code: 'UYU', symbol: '$', name: 'Peso uruguayo', flag: '🇺🇾', popular: true },
  { code: 'AUD', symbol: '$', name: 'Dólar australiano', flag: '🇦🇺', popular: true },
  { code: 'NZD', symbol: '$', name: 'Dólar neozelandés', flag: '🇳🇿', popular: true },
  { code: 'GBP', symbol: '£', name: 'Libra esterlina', flag: '🇬🇧', popular: true },
  { code: 'BRL', symbol: 'R$', name: 'Real brasileño', flag: '🇧🇷', popular: true }
]

export function detectRecommendedCurrency(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    if (
      tz.includes('Buenos_Aires') ||
      tz.includes('Argentina') ||
      tz.includes('Cordoba') ||
      tz.includes('Rosario') ||
      tz.includes('Mendoza')
    ) {
      return 'ARS'
    }
    if (tz.includes('Montevideo') || tz.includes('Uruguay')) return 'UYU'
    if (
      tz.includes('Sydney') ||
      tz.includes('Melbourne') ||
      tz.includes('Brisbane') ||
      tz.includes('Perth') ||
      tz.includes('Australia') ||
      tz.includes('Hobart') ||
      tz.includes('Adelaide')
    ) {
      return 'AUD'
    }
    if (tz.includes('Auckland') || tz.includes('New_Zealand') || tz.includes('Pacific/Auckland')) return 'NZD'
    if (tz.includes('London') || tz.includes('Europe/Belfast')) return 'GBP'
    if (
      tz.includes('Europe') ||
      tz.includes('Paris') ||
      tz.includes('Madrid') ||
      tz.includes('Berlin') ||
      tz.includes('Rome')
    ) {
      return 'EUR'
    }
    if (
      tz.includes('America') ||
      tz.includes('US') ||
      tz.includes('New_York') ||
      tz.includes('Los_Angeles') ||
      tz.includes('Chicago')
    ) {
      return 'USD'
    }

    if (typeof navigator !== 'undefined') {
      const lang = navigator.language || ''
      if (lang.includes('es-AR')) return 'ARS'
      if (lang.includes('es-UY')) return 'UYU'
      if (lang.includes('en-AU')) return 'AUD'
      if (lang.includes('en-NZ')) return 'NZD'
      if (lang.includes('en-GB')) return 'GBP'
      if (lang.includes('es-ES') || lang.includes('de') || lang.includes('fr') || lang.includes('it')) return 'EUR'
    }
  } catch {
    // fallback seguro
  }
  return 'EUR'
}

export const DEFAULT_CATEGORIES: InitialCategoryInput[] = [
  { name: 'Supermercado', icon: 'shopping-bag', color: 'accent' },
  { name: 'Alquiler & Vivienda', icon: 'home', color: 'accent' },
  { name: 'Salidas & Café', icon: 'coffee', color: 'accent' },
  { name: 'Transporte', icon: 'car', color: 'accent' },
  { name: 'Vuelos & Viajes', icon: 'plane', color: 'accent' },
  { name: 'Servicios & Suscripciones', icon: 'zap', color: 'accent' },
  { name: 'Split Pay (Compartidos)', icon: 'users', color: 'accent' },
  { name: 'Sueldo & Honorarios', icon: 'arrow-down-left', color: 'income' }
]

export interface DraftAccount {
  id: string
  name: string
  type: 'checking' | 'savings' | 'credit_card' | 'cash'
  currencyNative: string
  initialBalance: string
  creditLimit: string
}

export interface DraftInstitution {
  id: string
  name: string
  accounts: DraftAccount[]
}

export function WelcomeWizard() {
  const router = useRouter()
  const isOnline = useOnlineStatus()

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1)
  const [recommendedCurrency, setRecommendedCurrency] = useState('EUR')
  const [currency, setCurrency] = useState('EUR')

  // Catálogo y divisas activas en el wizard
  const [availableCurrencies, setAvailableCurrencies] = useState<CurrencyCatalogItem[]>(CURRENCIES)
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false)
  const [currencySearchQuery, setCurrencySearchQuery] = useState('')
  const [modalTargetAccount, setModalTargetAccount] = useState<{ instId: string; accId: string } | null>(null)
  const [directRates, setDirectRates] = useState<Record<string, { mode: 'auto' | 'manual'; rate: number }>>({})

  // Instituciones y cuentas dinámicas
  const [institutions, setInstitutions] = useState<DraftInstitution[]>([
    {
      id: 'inst-1',
      name: 'Mi Banco Principal',
      accounts: [
        {
          id: 'acc-1',
          name: 'Caja de Ahorro',
          type: 'checking',
          currencyNative: 'EUR',
          initialBalance: '',
          creditLimit: ''
        }
      ]
    },
    {
      id: 'inst-2',
      name: 'Billetera',
      accounts: [
        {
          id: 'acc-2',
          name: 'Efectivo en mano',
          type: 'cash',
          currencyNative: 'EUR',
          initialBalance: '',
          creditLimit: ''
        }
      ]
    }
  ])

  // Categorías
  const [selectedCategories, setSelectedCategories] = useState<InitialCategoryInput[]>(DEFAULT_CATEGORIES)
  const [newCategoryName, setNewCategoryName] = useState('')

  // Contactos Split Pay
  const [customPeople, setCustomPeople] = useState<string[]>([])
  const [newPersonInput, setNewPersonInput] = useState('')

  // Estado de sumisión y animación de transición
  const [submitting, setSubmitting] = useState(false)
  const [transitionStage, setTransitionStage] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Detección automática de moneda regional al montar
  useEffect(() => {
    const detected = detectRecommendedCurrency()
    setRecommendedCurrency(detected)
    setCurrency(detected)
    setInstitutions((prev) =>
      prev.map((inst) => ({
        ...inst,
        accounts: inst.accounts.map((acc) => ({
          ...acc,
          currencyNative: detected
        }))
      }))
    )
  }, [])

  // Helper para consultar cotización en vivo entre moneda global y secundaria
  const fetchRateForCurrency = async (base: string, target: string): Promise<number> => {
    if (base === target) return 1
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${base}`)
      if (res.ok) {
        const data = await res.json()
        if (data.result === 'success' && data.rates && typeof data.rates[target] === 'number') {
          return Math.round(data.rates[target] * 10000) / 10000
        }
      }
    } catch {
      // Silencioso
    }
    return 1
  }

  // Efecto para buscar cotizaciones directas automáticas para cuentas que difieran de la global
  useEffect(() => {
    institutions.forEach((inst) => {
      inst.accounts.forEach((acc) => {
        if (acc.currencyNative !== currency && !directRates[acc.currencyNative]) {
          fetchRateForCurrency(currency, acc.currencyNative).then((r) => {
            setDirectRates((prev) => {
              if (prev[acc.currencyNative]) return prev
              return { ...prev, [acc.currencyNative]: { mode: 'auto', rate: r } }
            })
          })
        }
      })
    })
    // Solo reconsultar cuando cambian las instituciones configuradas o la divisa principal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutions, currency])

  function toggleCustomRate(code: string) {
    const current = directRates[code]
    if (!current || current.mode === 'auto') {
      setDirectRates((prev) => ({
        ...prev,
        [code]: { mode: 'manual', rate: current?.rate ?? 1 }
      }))
    } else {
      fetchRateForCurrency(currency, code).then((freshRate) => {
        setDirectRates((prev) => ({
          ...prev,
          [code]: { mode: 'auto', rate: freshRate }
        }))
      })
    }
  }

  function updateCustomRate(code: string, newRate: number) {
    setDirectRates((prev) => ({
      ...prev,
      [code]: { mode: 'manual', rate: newRate }
    }))
  }

  function handleCurrencySelect(newCur: string) {
    setCurrency(newCur)
    // Sincronizar cuentas que aún tengan la moneda anterior
    setInstitutions((prev) =>
      prev.map((inst) => ({
        ...inst,
        accounts: inst.accounts.map((acc) => ({
          ...acc,
          currencyNative: acc.currencyNative === currency ? newCur : acc.currencyNative
        }))
      }))
    )
  }

  // Manejo de Instituciones y Cuentas
  function handleAddInstitution() {
    const newId = `inst-${Date.now()}`
    setInstitutions([
      ...institutions,
      {
        id: newId,
        name: 'Otro Banco o Billetera',
        accounts: [
          {
            id: `acc-${Date.now()}-1`,
            name: 'Cuenta Corriente',
            type: 'checking',
            currencyNative: currency,
            initialBalance: '',
            creditLimit: ''
          }
        ]
      }
    ])
  }

  function handleRemoveInstitution(instId: string) {
    if (institutions.length <= 1) return
    setInstitutions(institutions.filter((i) => i.id !== instId))
  }

  function handleInstitutionNameChange(instId: string, name: string) {
    setInstitutions(institutions.map((i) => (i.id === instId ? { ...i, name } : i)))
  }

  function handleAddAccount(instId: string) {
    setInstitutions(
      institutions.map((i) => {
        if (i.id !== instId) return i
        return {
          ...i,
          accounts: [
            ...i.accounts,
            {
              id: `acc-${Date.now()}`,
              name: 'Tarjeta de Crédito',
              type: 'credit_card',
              currencyNative: currency,
              initialBalance: '',
              creditLimit: ''
            }
          ]
        }
      })
    )
  }

  function handleRemoveAccount(instId: string, accId: string) {
    setInstitutions(
      institutions.map((i) => {
        if (i.id !== instId) return i
        if (i.accounts.length <= 1) return i
        return {
          ...i,
          accounts: i.accounts.filter((a) => a.id !== accId)
        }
      })
    )
  }

  function handleAccountChange(
    instId: string,
    accId: string,
    field: keyof DraftAccount,
    value: string
  ) {
    setInstitutions(
      institutions.map((i) => {
        if (i.id !== instId) return i
        return {
          ...i,
          accounts: i.accounts.map((a) => {
            if (a.id !== accId) return a
            if (field === 'type') {
              const newType = value as DraftAccount['type']
              return {
                ...a,
                type: newType,
                initialBalance: newType === 'credit_card' ? '' : a.initialBalance,
                creditLimit: newType === 'credit_card' ? a.creditLimit : ''
              }
            }
            return { ...a, [field]: value }
          })
        }
      })
    )
  }

  // Manejo de Categorías
  function toggleCategory(cat: InitialCategoryInput) {
    if (selectedCategories.some((c) => c.name === cat.name)) {
      setSelectedCategories(selectedCategories.filter((c) => c.name !== cat.name))
    } else {
      setSelectedCategories([...selectedCategories, cat])
    }
  }

  function handleAddCustomCategory(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = newCategoryName.trim()
    if (!trimmed) return
    if (!selectedCategories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setSelectedCategories([...selectedCategories, { name: trimmed, icon: 'tag', color: 'accent' }])
    }
    setNewCategoryName('')
  }

  // Manejo de Personas (Split Pay)
  function handleAddPerson(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = newPersonInput.trim()
    if (!trimmed) return
    if (!customPeople.includes(trimmed) && trimmed !== 'Personal') {
      setCustomPeople([...customPeople, trimmed])
    }
    setNewPersonInput('')
  }

  function handleRemovePerson(name: string) {
    setCustomPeople(customPeople.filter((p) => p !== name))
  }

  // Finalizar configuración con animación
  async function handleFinish() {
    if (!isOnline) {
      setError('No tenés conexión a internet. Conectate para inicializar tu espacio.')
      return
    }

    setSubmitting(true)
    setError(null)
    setTransitionStage(1)

    const t1 = setTimeout(() => setTransitionStage(2), 600)
    const t2 = setTimeout(() => setTransitionStage(3), 1200)

    try {
      const flattenedAccounts: InitialAccountInput[] = []
      institutions.forEach((inst) => {
        inst.accounts.forEach((acc) => {
          if (acc.name.trim()) {
            const isCredit = acc.type === 'credit_card'
            const bal = parseFloat(acc.initialBalance)
            const limit = parseFloat(acc.creditLimit)
            flattenedAccounts.push({
              institutionName: inst.name.trim() || 'Mi Banco',
              name: acc.name.trim(),
              type: acc.type,
              currencyNative: acc.currencyNative,
              initialBalance: !isCredit && !isNaN(bal) ? bal : undefined,
              creditLimit: isCredit && !isNaN(limit) ? limit : undefined
            })
          }
        })
      })

      const usedCurrencies = Array.from(
        new Set([currency, ...flattenedAccounts.map((a) => a.currencyNative)])
      )

      const activeCurrencies: ActiveCurrency[] = usedCurrencies.map((code) => {
        const info = getCurrencyInfo(code)
        const isGlobal = code === currency
        const rateInfo = directRates[code]
        return {
          code,
          name: info?.name ?? code,
          symbol: info?.symbol ?? code,
          flag: info?.flag,
          rate_mode: !isGlobal && rateInfo?.mode === 'manual' ? 'manual' : 'auto',
          custom_rate_against_global: !isGlobal && rateInfo?.mode === 'manual' ? rateInfo.rate : undefined
        }
      })

      // Precargar en caché local para disponibilidad instantánea 0ms
      if (typeof window !== 'undefined') {
        for (const ac of activeCurrencies) {
          if (ac.code !== currency) {
            const r = directRates[ac.code]?.rate
            if (r && r > 0) {
              setCachedRate(currency, ac.code, r, Date.now(), ac.rate_mode === 'manual')
            }
          }
        }
      }

      await seedUserSpaceAction({
        displayCurrency: currency,
        accounts: flattenedAccounts,
        categories: selectedCategories,
        people: ['Personal', ...customPeople],
        activeCurrencies
      })

      setTransitionStage(4)

      setTimeout(() => {
        // Conexión futura a wizard secundario:
        // (Cargar compromisos actuales si configuró TC, cargar primer movimiento, presupuesto)
        router.push('/dashboard')
        router.refresh()
      }, 700)
    } catch {
      clearTimeout(t1)
      clearTimeout(t2)
      setError('Ocurrió un error al inicializar tus datos. Por favor intentá de nuevo.')
      setSubmitting(false)
      setTransitionStage(0)
    }
  }

  async function handleSkip() {
    if (!isOnline) {
      setError('No tenés conexión a internet. Conectate para continuar.')
      return
    }
    setSubmitting(true)
    try {
      await skipWelcomeAction()
      router.push('/dashboard')
      router.refresh()
    } catch {
      router.push('/dashboard')
    }
  }

  // Conteo de cuentas para resumen
  const totalAccountsCount = institutions.reduce((sum, inst) => sum + inst.accounts.length, 0)

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Cabecera */}
      <header className="max-w-3xl w-full mx-auto flex items-center justify-between pb-6 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-control bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-text-primary tracking-tight">Finance Nomad</h1>
            <p className="text-xs text-text-muted">Asistente de configuración inicial</p>
          </div>
        </div>
        {!submitting && (
          <button
            type="button"
            onClick={handleSkip}
            disabled={submitting || !isOnline}
            className="text-xs text-text-muted hover:text-text-primary font-medium transition py-1 px-2.5 rounded-control hover:bg-surface-1 disabled:opacity-50"
          >
            Omitir y empezar en blanco →
          </button>
        )}
      </header>

      {/* Contenido Principal */}
      <main className="max-w-3xl w-full mx-auto my-8 flex-1 flex flex-col justify-center">
        {/* Banner preventivo offline */}
        {!isOnline && (
          <div className="mb-6 p-4 rounded-card bg-pending/10 border border-pending/20 text-pending flex items-center gap-3 text-sm font-medium">
            <WifiOff className="w-5 h-5 flex-shrink-0" />
            <span>Estás sin conexión a internet. Para inicializar tu espacio necesitás estar online.</span>
          </div>
        )}

        {/* Barra de Progreso de 5 Pasos */}
        {!submitting && (
          <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2 sm:pb-0">
            <div className="flex items-center gap-2 sm:gap-3">
              {[
                { s: 1, label: 'Moneda' },
                { s: 2, label: 'Cuentas' },
                { s: 3, label: 'Categorías' },
                { s: 4, label: 'Personas' },
                { s: 5, label: 'Confirmar' }
              ].map((item, idx) => (
                <div key={item.s} className="flex items-center gap-2 sm:gap-3">
                  {idx > 0 && <div className="w-4 sm:w-6 h-0.5 bg-border hidden xs:block" />}
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                      step >= item.s
                        ? 'bg-accent text-[color:var(--on-accent)]'
                        : 'bg-surface-2 text-text-muted'
                    }`}
                  >
                    {item.s}
                  </span>
                  <span
                    className={`text-xs font-medium whitespace-nowrap hidden sm:inline ${
                      step === item.s ? 'text-text-primary font-semibold' : 'text-text-muted'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
            <span className="text-xs font-mono text-text-muted whitespace-nowrap ml-2">Paso {step} de 5</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-card bg-expense/10 border border-expense/20 text-expense text-sm font-medium">
            {error}
          </div>
        )}

        {/* PANTALLA DE ANIMACIÓN DE TRANSICIÓN */}
        {submitting && (
          <div className="bg-surface-1 border border-border rounded-card p-8 sm:p-12 text-center space-y-6 animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-full bg-accent/15 border border-accent/30 text-accent flex items-center justify-center mx-auto shadow-sm">
              {transitionStage >= 4 ? (
                <Check className="w-8 h-8 animate-bounce text-accent" />
              ) : (
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
              )}
            </div>

            <div>
              <h2 className="font-display text-2xl font-bold text-text-primary">
                {transitionStage >= 4 ? '¡Tu espacio está listo!' : 'Configurando tu espacio financiero...'}
              </h2>
              <p className="text-sm text-text-secondary mt-1">
                Escribiendo tu configuración inicial y preparando tus libros contables.
              </p>
            </div>

            <div className="max-w-md mx-auto space-y-3 pt-2 text-left text-xs font-medium">
              <div
                className={`flex items-center gap-3 p-2.5 rounded-control border transition ${
                  transitionStage >= 1
                    ? 'border-accent/40 bg-accent/5 text-text-primary'
                    : 'border-border text-text-muted'
                }`}
              >
                {transitionStage >= 1 ? (
                  <CheckCircle2 className="w-4 h-4 text-accent" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-border" />
                )}
                <span>Configurando tu moneda de consolidación ({currency})</span>
              </div>

              <div
                className={`flex items-center gap-3 p-2.5 rounded-control border transition ${
                  transitionStage >= 2
                    ? 'border-accent/40 bg-accent/5 text-text-primary'
                    : 'border-border text-text-muted'
                }`}
              >
                {transitionStage >= 2 ? (
                  <CheckCircle2 className="w-4 h-4 text-accent" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-border" />
                )}
                <span>Creando {institutions.length} instituciones y {totalAccountsCount} cuentas</span>
              </div>

              <div
                className={`flex items-center gap-3 p-2.5 rounded-control border transition ${
                  transitionStage >= 3
                    ? 'border-accent/40 bg-accent/5 text-text-primary'
                    : 'border-border text-text-muted'
                }`}
              >
                {transitionStage >= 3 ? (
                  <CheckCircle2 className="w-4 h-4 text-accent" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-border" />
                )}
                <span>Asentando saldos iniciales en el ledger contable</span>
              </div>

              <div
                className={`flex items-center gap-3 p-2.5 rounded-control border transition ${
                  transitionStage >= 4
                    ? 'border-accent/40 bg-accent/5 text-text-primary'
                    : 'border-border text-text-muted'
                }`}
              >
                {transitionStage >= 4 ? (
                  <CheckCircle2 className="w-4 h-4 text-accent" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-border" />
                )}
                <span>¡Todo listo para despegar! Entrando al Dashboard...</span>
              </div>
            </div>
          </div>
        )}

        {/* PASO 1: Moneda Universal */}
        {!submitting && step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-text-primary">¿Cuál es tu moneda de referencia?</h2>
              <p className="text-sm text-text-secondary mt-1">
                Finance Nomad es multi-moneda nativo (podés tener cuentas en USD, EUR, AUD, etc.), pero consolidará tu
                patrimonio neto y métricas generales en esta divisa. Podés cambiarla cuando quieras desde Ajustes.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {availableCurrencies.map((c) => {
                const isSelected = currency === c.code
                const isRecommended = recommendedCurrency === c.code
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleCurrencySelect(c.code)}
                    className={`p-4 rounded-card border text-left transition relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-accent bg-accent/5 ring-1 ring-accent'
                        : 'border-border bg-surface-1 hover:border-text-secondary/30'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-2xl">{c.flag}</span>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-accent" />}
                      </div>
                      <div className="font-mono text-lg font-bold text-text-primary">
                        {c.code} <span className="text-xs font-normal text-text-muted">({c.symbol})</span>
                      </div>
                      <div className="text-xs text-text-secondary truncate mt-0.5">{c.name}</div>
                    </div>
                    {isRecommended && (
                      <span className="inline-block mt-3 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent/15 text-accent border border-accent/20">
                        Sugerida por tu región
                      </span>
                    )}
                  </button>
                )
              })}

              <button
                type="button"
                onClick={() => {
                  setModalTargetAccount(null)
                  setCurrencyModalOpen(true)
                }}
                className="p-4 rounded-card border-2 border-dashed border-border hover:border-accent/50 bg-surface-1/40 flex flex-col items-center justify-center gap-2 text-center transition"
              >
                <div className="p-2 rounded-full bg-accent/10 text-accent">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-text-primary block">Más monedas</span>
                  <span className="text-[10px] text-text-muted">Catálogo mundial</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* PASO 2: Instituciones, Cuentas y Saldo Inicial */}
        {!submitting && step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-text-primary">Instituciones y Cuentas</h2>
              <p className="text-sm text-text-secondary mt-1">
                Una <strong>Institución</strong> representa la entidad o billetera donde tenés tu dinero (ej. tu banco local, Wise o tu billetera).
                Dentro de cada una, podés tener una o varias <strong>Cuentas</strong> con sus respectivas monedas nativas, saldos reales o límites de crédito.
              </p>
            </div>

            <div className="space-y-4">
              {institutions.map((inst, instIdx) => (
                <div key={inst.id} className="bg-surface-1 border border-border rounded-card p-4 sm:p-5 space-y-4">
                  {/* Encabezado de la Institución */}
                  <div className="flex items-center justify-between gap-3 pb-3 border-b border-border">
                    <div className="flex-1 flex items-center gap-2">
                      <div className="p-1.5 rounded-control bg-accent/10 text-accent">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={inst.name}
                        onChange={(e) => handleInstitutionNameChange(inst.id, e.target.value)}
                        placeholder="Nombre de la institución (ej. Santander, Wise, Brou...)"
                        className="flex-1 bg-surface-0 border border-border rounded-control px-3 py-1.5 text-sm font-semibold text-text-primary focus:border-accent outline-none"
                      />
                    </div>
                    {institutions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveInstitution(inst.id)}
                        className="text-text-muted hover:text-expense p-1 rounded-control hover:bg-surface-2 transition"
                        title="Eliminar institución"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Cuentas de la Institución */}
                  <div className="space-y-3">
                    <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                      Cuentas y saldos en {inst.name || 'esta institución'}
                    </p>

                    {inst.accounts.map((acc) => (
                      <div key={acc.id} className="space-y-1.5">
                        <div
                          className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 p-3 rounded-control bg-surface-0 border border-border items-center"
                        >
                        {/* Nombre de cuenta */}
                        <div className="sm:col-span-4">
                          <label className="block text-[10px] text-text-muted mb-0.5">Nombre de la cuenta</label>
                          <input
                            type="text"
                            value={acc.name}
                            onChange={(e) => handleAccountChange(inst.id, acc.id, 'name', e.target.value)}
                            placeholder="Ej. Caja de Ahorro, Efectivo..."
                            className="w-full bg-surface-1 border border-border rounded-control px-2.5 py-1.5 text-xs text-text-primary focus:border-accent outline-none"
                          />
                        </div>

                        {/* Tipo de cuenta */}
                        <div className="sm:col-span-3">
                          <label className="block text-[10px] text-text-muted mb-0.5">Tipo</label>
                          <select
                            value={acc.type}
                            onChange={(e) =>
                              handleAccountChange(inst.id, acc.id, 'type', e.target.value as DraftAccount['type'])
                            }
                            className="w-full bg-surface-1 border border-border rounded-control px-2.5 py-1.5 text-xs text-text-primary focus:border-accent outline-none"
                          >
                            <option value="checking">Caja de Ahorro / Corriente</option>
                            <option value="savings">Ahorro</option>
                            <option value="credit_card">Tarjeta de Crédito</option>
                            <option value="cash">Efectivo (Cash)</option>
                          </select>
                        </div>

                        {/* Divisa nativa */}
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] text-text-muted mb-0.5">Divisa</label>
                          <select
                            value={acc.currencyNative}
                            onChange={(e) => {
                              if (e.target.value === '__add_more__') {
                                setModalTargetAccount({ instId: inst.id, accId: acc.id })
                                setCurrencyModalOpen(true)
                              } else {
                                handleAccountChange(inst.id, acc.id, 'currencyNative', e.target.value)
                              }
                            }}
                            className="w-full bg-surface-1 border border-border rounded-control px-2 py-1.5 text-xs font-mono text-text-primary focus:border-accent outline-none"
                          >
                            {availableCurrencies.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.code} ({c.symbol})
                              </option>
                            ))}
                            <option value="__add_more__">+ Otra divisa...</option>
                          </select>
                        </div>

                        {/* Saldo inicial actual / Límite de crédito según tipo */}
                        <div className="sm:col-span-2">
                          {acc.type === 'credit_card' ? (
                            <>
                              <label htmlFor={`credit-limit-${acc.id}`} className="block text-[10px] text-text-muted mb-0.5">
                                Límite de crédito
                              </label>
                              <input
                                id={`credit-limit-${acc.id}`}
                                type="number"
                                step="any"
                                value={acc.creditLimit}
                                onChange={(e) => handleAccountChange(inst.id, acc.id, 'creditLimit', e.target.value)}
                                placeholder="0.00"
                                className="w-full bg-surface-1 border border-border rounded-control px-2 py-1.5 text-xs font-mono tabular-nums text-text-primary focus:border-accent outline-none"
                              />
                            </>
                          ) : (
                            <>
                              <label htmlFor={`balance-${acc.id}`} className="block text-[10px] text-text-muted mb-0.5">
                                Saldo real actual
                              </label>
                              <input
                                id={`balance-${acc.id}`}
                                type="number"
                                step="any"
                                value={acc.initialBalance}
                                onChange={(e) => handleAccountChange(inst.id, acc.id, 'initialBalance', e.target.value)}
                                placeholder="0.00"
                                className="w-full bg-surface-1 border border-border rounded-control px-2 py-1.5 text-xs font-mono tabular-nums text-text-primary focus:border-accent outline-none"
                              />
                            </>
                          )}
                        </div>

                        {/* Borrar cuenta */}
                        <div className="sm:col-span-1 flex justify-end">
                          {inst.accounts.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveAccount(inst.id, acc.id)}
                              className="text-text-muted hover:text-expense p-1 transition"
                              title="Eliminar cuenta"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Asistente de Cotización Directa si difiere de la Moneda Global */}
                      {acc.currencyNative !== currency && (
                        <div className="mt-2 p-2.5 rounded-control bg-surface-1 border border-border/80 text-xs space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-text-secondary">
                              <span className="inline-flex items-center gap-1 font-semibold text-accent">
                                <Sparkles className="w-3.5 h-3.5" />
                                Tipo de cambio directo:
                              </span>
                              <span className="font-mono font-medium text-text-primary">
                                1 {currency} = {directRates[acc.currencyNative]?.rate ?? 1} {acc.currencyNative}
                              </span>
                              <span className="text-[10px] text-text-muted">
                                ({directRates[acc.currencyNative]?.mode === 'manual' ? 'Personalizada / Mercado' : 'En vivo'})
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => toggleCustomRate(acc.currencyNative)}
                              className="text-xs text-accent hover:underline font-medium"
                            >
                              {directRates[acc.currencyNative]?.mode === 'manual'
                                ? 'Restablecer a oficial'
                                : 'Ajustar cotización manual'}
                            </button>
                          </div>

                          {directRates[acc.currencyNative]?.mode === 'manual' && (
                            <div className="flex items-center gap-2 pt-1 border-t border-border-subtle">
                              <label className="text-[11px] text-text-secondary">
                                1 {currency} equivale a:
                              </label>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  step="any"
                                  value={directRates[acc.currencyNative]?.rate ?? ''}
                                  onChange={(e) =>
                                    updateCustomRate(acc.currencyNative, parseFloat(e.target.value) || 0)
                                  }
                                  placeholder="Ej. 1280"
                                  className="w-24 bg-surface-0 border border-border rounded-control px-2 py-1 text-xs font-mono text-text-primary focus:border-accent outline-none"
                                />
                                <span className="font-mono text-xs text-text-secondary">{acc.currencyNative}</span>
                              </div>
                              <span className="text-[10px] text-text-muted">
                                (Se usará en el Dashboard para consolidar tu patrimonio)
                              </span>
                            </div>
                          )}

                          {/* Previsualización del Saldo Convertido */}
                          {acc.initialBalance && !isNaN(parseFloat(acc.initialBalance)) && parseFloat(acc.initialBalance) > 0 && (
                            <div className="text-[11px] text-text-secondary pt-0.5">
                              Saldo nominal: <span className="font-mono font-medium">{formatMoney(parseFloat(acc.initialBalance), acc.currencyNative)}</span>
                              {' '}≈{' '}
                              <span className="font-mono font-semibold text-accent">
                                {formatMoney(
                                  parseFloat(acc.initialBalance) / (directRates[acc.currencyNative]?.rate || 1),
                                  currency
                                )}
                              </span>
                              {' '}<span className="text-text-muted">(en tu moneda de referencia {currency})</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                    <button
                      type="button"
                      onClick={() => handleAddAccount(inst.id)}
                      className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline font-medium pt-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar otra cuenta a {inst.name || 'esta institución'}</span>
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddInstitution}
                className="w-full py-3 border-2 border-dashed border-border hover:border-accent/50 rounded-card flex items-center justify-center gap-2 text-xs font-semibold text-text-secondary hover:text-text-primary transition bg-surface-1/50"
              >
                <Plus className="w-4 h-4 text-accent" />
                <span>Agregar otra institución (banco o billetera)</span>
              </button>
            </div>
          </div>
        )}

        {/* PASO 3: Categorías */}
        {!submitting && step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-text-primary">Categorías de gastos e ingresos</h2>
              <p className="text-sm text-text-secondary mt-1">
                Dejamos seleccionadas las categorías estándar de vida nómada y podés agregar tus propias categorías para personalizar tu presupuesto.
              </p>
            </div>

            {/* Categorías actuales */}
            <div className="bg-surface-1 border border-border rounded-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Categorías iniciales ({selectedCategories.length} activas)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedCategories(
                      selectedCategories.length === DEFAULT_CATEGORIES.length ? [] : DEFAULT_CATEGORIES
                    )
                  }
                  className="text-xs text-accent hover:underline font-medium"
                >
                  {selectedCategories.length === DEFAULT_CATEGORIES.length ? 'Desmarcar todas' : 'Marcar sugeridas'}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedCategories.map((cat) => (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition bg-accent/15 border-accent text-accent"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Agregar categoría personalizada */}
            <div className="bg-surface-1 border border-border rounded-card p-4 space-y-3">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Agregar categoría personalizada
              </span>
              <form onSubmit={handleAddCustomCategory} className="flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Ej. Gimnasio, Mascotas, Educación..."
                  className="flex-1 bg-surface-0 border border-border rounded-control px-3.5 py-2 text-sm text-text-primary focus:border-accent outline-none"
                />
                <button
                  type="submit"
                  className="bg-accent text-[color:var(--on-accent)] px-4 py-2 rounded-control text-xs font-semibold hover:opacity-90 transition"
                >
                  Agregar
                </button>
              </form>
            </div>
          </div>
        )}

        {/* PASO 4: Personas (Split Pay y Extensiones) */}
        {!submitting && step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-text-primary">Personas y gastos compartidos</h2>
              <p className="text-sm text-text-secondary mt-1">
                En Finance Nomad, las <strong>Personas</strong> te permiten registrar gastos que compartís con amigos,
                familiares o pareja (Split Pay), o gestionar extensiones de tarjetas de crédito sin inflar tus propios consumos.
              </p>
            </div>

            <div className="bg-surface-1 border border-border rounded-card p-4 sm:p-5 space-y-4">
              <div className="p-3 bg-surface-2/60 rounded-control border border-border-subtle flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-accent/15 text-accent mt-0.5">
                  <Info className="w-4 h-4" />
                </div>
                <div className="text-xs text-text-secondary space-y-1">
                  <p className="font-semibold text-text-primary">¿Cómo funciona?</p>
                  <p>
                    Cuando pagues una cena, un alquiler o un vuelo grupal, podés asociar a tus amigos para que el sistema
                    lleve automáticamente la cuenta de lo que te deben, sin tener que hacer planillas aparte.
                  </p>
                </div>
              </div>

              <form onSubmit={handleAddPerson} className="flex gap-2">
                <input
                  type="text"
                  value={newPersonInput}
                  onChange={(e) => setNewPersonInput(e.target.value)}
                  placeholder="Nombre del contacto (ej. Diego, Romina, Gladys, Mamá...)"
                  className="flex-1 bg-surface-0 border border-border rounded-control px-3.5 py-2 text-sm text-text-primary focus:border-accent outline-none"
                />
                <button
                  type="submit"
                  className="bg-accent text-[color:var(--on-accent)] px-4 py-2 rounded-control text-xs font-semibold hover:opacity-90 transition"
                >
                  Agregar
                </button>
              </form>

              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block">
                  Contactos configurados
                </span>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-2 text-text-primary border border-border">
                    <Users className="w-3.5 h-3.5 text-accent" />
                    <span>Personal (Tus consumos propios)</span>
                  </span>
                  {customPeople.map((person) => (
                    <span
                      key={person}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-2 text-text-primary border border-border"
                    >
                      <span>{person}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePerson(person)}
                        className="text-text-muted hover:text-expense transition ml-1"
                        title="Remover contacto"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PASO 5: Cierre, Transición y Confirmación */}
        {!submitting && step === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-text-primary">¡Todo listo para arrancar!</h2>
              <p className="text-sm text-text-secondary mt-1">
                Revisá el resumen de tu configuración antes de inicializar tu espacio financiero.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Tarjeta 1: Moneda */}
              <div className="bg-surface-1 border border-border rounded-card p-4 space-y-2">
                <div className="flex items-center gap-2 text-accent">
                  <Globe className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    Moneda de consolidación
                  </span>
                </div>
                <p className="font-mono text-xl font-bold text-text-primary">{currency}</p>
                <p className="text-xs text-text-muted">
                  Tus saldos y patrimonio se mostrarán convertidos a esta divisa en el Dashboard.
                </p>
              </div>

              {/* Tarjeta 2: Cuentas */}
              <div className="bg-surface-1 border border-border rounded-card p-4 space-y-2">
                <div className="flex items-center gap-2 text-accent">
                  <Building2 className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    Instituciones y Cuentas
                  </span>
                </div>
                <p className="font-mono text-xl font-bold text-text-primary">
                  {institutions.length} inst. / {totalAccountsCount} cuentas
                </p>
                <p className="text-xs text-text-muted truncate">
                  {institutions.map((i) => i.name).filter(Boolean).join(', ')}
                </p>
              </div>

              {/* Tarjeta 3: Categorías */}
              <div className="bg-surface-1 border border-border rounded-card p-4 space-y-2">
                <div className="flex items-center gap-2 text-accent">
                  <Tag className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    Categorías activas
                  </span>
                </div>
                <p className="font-mono text-xl font-bold text-text-primary">{selectedCategories.length}</p>
                <p className="text-xs text-text-muted">Listas para clasificar tus gastos e ingresos.</p>
              </div>

              {/* Tarjeta 4: Personas */}
              <div className="bg-surface-1 border border-border rounded-card p-4 space-y-2">
                <div className="flex items-center gap-2 text-accent">
                  <Users className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    División de gastos
                  </span>
                </div>
                <p className="font-mono text-xl font-bold text-text-primary">{customPeople.length + 1} perfiles</p>
                <p className="text-xs text-text-muted">
                  Personal{customPeople.length > 0 ? ` + ${customPeople.join(', ')}` : ''}
                </p>
              </div>
            </div>

            <div className="p-4 bg-surface-1 border border-border rounded-card text-xs text-text-secondary space-y-1">
              <p className="font-semibold text-text-primary flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-accent" />
                <span>Libros contables transparentes</span>
              </p>
              <p>
                Si indicaste saldos iniciales, se registrarán como asientos automáticos de ajuste en el ledger sin afectar
                tus estadísticas de consumo ni tu presupuesto del mes.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Barra de Navegación Inferior */}
      {!submitting && (
        <footer className="max-w-3xl w-full mx-auto flex items-center justify-between pt-6 border-t border-border">
          {step > 1 ? (
            <button
              type="button"
              disabled={submitting}
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3 | 4 | 5)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-control text-sm font-medium text-text-secondary hover:text-text-primary transition hover:bg-surface-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Atrás</span>
            </button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3 | 4 | 5)}
              className="flex items-center gap-2 bg-accent text-[color:var(--on-accent)] px-6 py-2.5 rounded-control text-sm font-semibold hover:opacity-90 transition"
            >
              <span>Continuar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting || !isOnline}
              onClick={handleFinish}
              className="flex items-center gap-2 bg-accent text-[color:var(--on-accent)] px-7 py-2.5 rounded-control text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>Configurá mi espacio →</span>
            </button>
          )}
        </footer>
      )}

      {/* Modal de Búsqueda de Moneda */}
      {currencyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface-0 border border-border rounded-card max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-text-primary">Elegí una divisa</h3>
              <button
                type="button"
                onClick={() => {
                  setCurrencyModalOpen(false)
                  setCurrencySearchQuery('')
                }}
                className="text-text-muted hover:text-text-primary p-1 rounded-control hover:bg-surface-1 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={currencySearchQuery}
                onChange={(e) => setCurrencySearchQuery(e.target.value)}
                placeholder="Buscá por nombre, código o país (ej. ARS, Real, Chile...)"
                className="w-full bg-surface-1 border border-border rounded-control pl-9 pr-3 py-2 text-xs text-text-primary focus:border-accent outline-none"
                autoFocus
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1 divide-y divide-border/40">
              {searchCurrencies(currencySearchQuery).map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    if (!availableCurrencies.some((ac) => ac.code === c.code)) {
                      setAvailableCurrencies([...availableCurrencies, c])
                    }
                    if (modalTargetAccount) {
                      handleAccountChange(
                        modalTargetAccount.instId,
                        modalTargetAccount.accId,
                        'currencyNative',
                        c.code
                      )
                    } else {
                      handleCurrencySelect(c.code)
                    }
                    setCurrencyModalOpen(false)
                    setCurrencySearchQuery('')
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-surface-1 rounded-control transition flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{c.flag}</span>
                    <div>
                      <span className="font-mono font-bold text-text-primary">{c.code}</span>
                      <span className="text-text-secondary ml-1.5">{c.name}</span>
                    </div>
                  </div>
                  <span className="font-mono text-text-muted font-medium">({c.symbol})</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
