'use client'

import { useState } from 'react'
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
  ShoppingBag,
  Home,
  Coffee,
  Car,
  Plane,
  Zap,
  ArrowDownLeft,
  Plus,
  Trash2
} from 'lucide-react'
import { seedUserSpaceAction, skipWelcomeAction, type InitialAccountInput, type InitialCategoryInput } from '@/app/(protected)/welcome/actions'

const CURRENCIES = [
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
  { code: 'USD', symbol: '$', name: 'Dólar estadounidense', flag: '🇺🇸' },
  { code: 'AUD', symbol: '$', name: 'Dólar australiano', flag: '🇦🇺' },
  { code: 'UYU', symbol: '$', name: 'Peso uruguayo', flag: '🇺🇾' },
  { code: 'GBP', symbol: '£', name: 'Libra esterlina', flag: '🇬🇧' },
  { code: 'NZD', symbol: '$', name: 'Dólar neozelandés', flag: '🇳🇿' }
]

const DEFAULT_CATEGORIES: InitialCategoryInput[] = [
  { name: 'Supermercado', icon: 'shopping-bag', color: 'accent' },
  { name: 'Alquiler & Vivienda', icon: 'home', color: 'accent' },
  { name: 'Salidas & Café', icon: 'coffee', color: 'accent' },
  { name: 'Transporte', icon: 'car', color: 'accent' },
  { name: 'Vuelos & Viajes', icon: 'plane', color: 'accent' },
  { name: 'Servicios & Suscripciones', icon: 'zap', color: 'accent' },
  { name: 'Split Pay (Compartidos)', icon: 'users', color: 'accent' },
  { name: 'Sueldo & Honorarios', icon: 'arrow-down-left', color: 'income' }
]

type StarterPack = 'nomad' | 'classic' | 'custom'

export function WelcomeWizard() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [currency, setCurrency] = useState('EUR')
  const [pack, setPack] = useState<StarterPack>('nomad')
  const [customBankName, setCustomBankName] = useState('Mi Banco')
  const [selectedCategories, setSelectedCategories] = useState<InitialCategoryInput[]>(DEFAULT_CATEGORIES)
  const [customPeople, setCustomPeople] = useState<string[]>([])
  const [newPersonInput, setNewPersonInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleCategory(cat: InitialCategoryInput) {
    if (selectedCategories.some((c) => c.name === cat.name)) {
      setSelectedCategories(selectedCategories.filter((c) => c.name !== cat.name))
    } else {
      setSelectedCategories([...selectedCategories, cat])
    }
  }

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

  function buildAccounts(): InitialAccountInput[] {
    if (pack === 'nomad') {
      return [
        {
          institutionName: 'Wise',
          name: 'Everyday',
          type: 'checking',
          currencyNative: currency === 'USD' ? 'USD' : 'EUR'
        },
        {
          institutionName: customBankName.trim() || 'Banco Local',
          name: 'Checking',
          type: 'checking',
          currencyNative: currency
        },
        {
          institutionName: 'Billetera',
          name: 'Efectivo',
          type: 'cash',
          currencyNative: currency
        }
      ]
    }

    if (pack === 'classic') {
      return [
        {
          institutionName: customBankName.trim() || 'Banco Principal',
          name: 'Caja de Ahorro',
          type: 'checking',
          currencyNative: currency
        },
        {
          institutionName: customBankName.trim() || 'Banco Principal',
          name: 'Tarjeta de Crédito',
          type: 'credit_card',
          currencyNative: currency,
          creditLimit: 50000
        },
        {
          institutionName: 'Billetera',
          name: 'Efectivo',
          type: 'cash',
          currencyNative: currency
        }
      ]
    }

    // Custom pack
    return [
      {
        institutionName: customBankName.trim() || 'Mi Banco',
        name: 'Cuenta Principal',
        type: 'checking',
        currencyNative: currency
      },
      {
        institutionName: 'Billetera',
        name: 'Efectivo',
        type: 'cash',
        currencyNative: currency
      }
    ]
  }

  async function handleFinish() {
    setSubmitting(true)
    setError(null)
    try {
      const accounts = buildAccounts()
      await seedUserSpaceAction({
        displayCurrency: currency,
        accounts,
        categories: selectedCategories,
        people: ['Personal', ...customPeople]
      })
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Ocurrió un error al inicializar tus datos. Por favor intentá de nuevo.')
      setSubmitting(false)
    }
  }

  async function handleSkip() {
    setSubmitting(true)
    try {
      await skipWelcomeAction()
      router.push('/dashboard')
      router.refresh()
    } catch {
      router.push('/dashboard')
    }
  }

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
        <button
          type="button"
          onClick={handleSkip}
          disabled={submitting}
          className="text-xs text-text-muted hover:text-text-primary font-medium transition py-1 px-2.5 rounded-control hover:bg-surface-1"
        >
          Omitir y empezar en blanco →
        </button>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-3xl w-full mx-auto my-8 flex-1 flex flex-col justify-center">
        {/* Barra de Progreso */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                step >= 1 ? 'bg-accent text-[color:var(--on-accent)]' : 'bg-surface-2 text-text-muted'
              }`}
            >
              1
            </span>
            <span className={`text-xs font-medium ${step === 1 ? 'text-text-primary' : 'text-text-muted'}`}>
              Divisa Base
            </span>
            <div className="w-8 h-0.5 bg-border hidden sm:block" />
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                step >= 2 ? 'bg-accent text-[color:var(--on-accent)]' : 'bg-surface-2 text-text-muted'
              }`}
            >
              2
            </span>
            <span className={`text-xs font-medium ${step === 2 ? 'text-text-primary' : 'text-text-muted'}`}>
              Cuentas Iniciales
            </span>
            <div className="w-8 h-0.5 bg-border hidden sm:block" />
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                step === 3 ? 'bg-accent text-[color:var(--on-accent)]' : 'bg-surface-2 text-text-muted'
              }`}
            >
              3
            </span>
            <span className={`text-xs font-medium ${step === 3 ? 'text-text-primary' : 'text-text-muted'}`}>
              Categorías & Equipo
            </span>
          </div>
          <span className="text-xs font-mono text-text-muted">Paso {step} de 3</span>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-card bg-expense/10 border border-expense/20 text-expense text-sm font-medium">
            {error}
          </div>
        )}

        {/* PASO 1: Selección de Divisa Principal */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-text-primary">¿Cuál es tu divisa de referencia?</h2>
              <p className="text-sm text-text-secondary mt-1">
                Finance Nomad es multi-moneda nativo, pero consolidará tu patrimonio neto y métricas generales en esta
                moneda. Podés cambiarla cuando quieras desde Ajustes.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CURRENCIES.map((c) => {
                const isSelected = currency === c.code
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => setCurrency(c.code)}
                    className={`p-4 rounded-card border text-left transition relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-accent bg-accent/5 ring-1 ring-accent'
                        : 'border-border bg-surface-1 hover:border-text-secondary/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">{c.flag}</span>
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-accent" />}
                    </div>
                    <div>
                      <div className="font-mono text-lg font-bold text-text-primary">
                        {c.code} <span className="text-xs font-normal text-text-muted">({c.symbol})</span>
                      </div>
                      <div className="text-xs text-text-secondary truncate mt-0.5">{c.name}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* PASO 2: Selección de Cuentas Iniciales */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-text-primary">¿Cómo gestionás tu dinero habitualmente?</h2>
              <p className="text-sm text-text-secondary mt-1">
                Elegí el pack de inicio que mejor se adapte a tu estilo de vida. Crearemos las instituciones y cuentas base
                por vos.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Pack Nómada */}
              <button
                type="button"
                onClick={() => setPack('nomad')}
                className={`p-4 rounded-card border text-left transition flex flex-col justify-between ${
                  pack === 'nomad'
                    ? 'border-accent bg-accent/5 ring-1 ring-accent'
                    : 'border-border bg-surface-1 hover:border-text-secondary/30'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-control bg-accent/10 text-accent">
                      <Globe className="w-5 h-5" />
                    </div>
                    {pack === 'nomad' && <CheckCircle2 className="w-5 h-5 text-accent" />}
                  </div>
                  <h3 className="font-display text-base font-bold text-text-primary">Nómada Digital</h3>
                  <p className="text-xs text-text-secondary mt-1">
                    Ideal para freelancers y viajeros con cuentas en distintas monedas.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border/60 text-xs text-text-muted space-y-1">
                  <p className="flex items-center gap-1.5 font-mono">
                    <Check className="w-3.5 h-3.5 text-accent" /> Wise (EUR/USD)
                  </p>
                  <p className="flex items-center gap-1.5 font-mono">
                    <Check className="w-3.5 h-3.5 text-accent" /> Banco Local ({currency})
                  </p>
                  <p className="flex items-center gap-1.5 font-mono">
                    <Check className="w-3.5 h-3.5 text-accent" /> Billetera de Efectivo
                  </p>
                </div>
              </button>

              {/* Pack Clásico */}
              <button
                type="button"
                onClick={() => setPack('classic')}
                className={`p-4 rounded-card border text-left transition flex flex-col justify-between ${
                  pack === 'classic'
                    ? 'border-accent bg-accent/5 ring-1 ring-accent'
                    : 'border-border bg-surface-1 hover:border-text-secondary/30'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-control bg-income/10 text-income">
                      <Building2 className="w-5 h-5" />
                    </div>
                    {pack === 'classic' && <CheckCircle2 className="w-5 h-5 text-accent" />}
                  </div>
                  <h3 className="font-display text-base font-bold text-text-primary">Tradicional / Local</h3>
                  <p className="text-xs text-text-secondary mt-1">
                    Cuentas bancarias tradicionales, tarjeta de crédito y billetera de efectivo.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border/60 text-xs text-text-muted space-y-1">
                  <p className="flex items-center gap-1.5 font-mono">
                    <Check className="w-3.5 h-3.5 text-accent" /> Caja de Ahorro ({currency})
                  </p>
                  <p className="flex items-center gap-1.5 font-mono">
                    <Check className="w-3.5 h-3.5 text-accent" /> Tarjeta de Crédito
                  </p>
                  <p className="flex items-center gap-1.5 font-mono">
                    <Check className="w-3.5 h-3.5 text-accent" /> Billetera de Efectivo
                  </p>
                </div>
              </button>

              {/* Pack Custom */}
              <button
                type="button"
                onClick={() => setPack('custom')}
                className={`p-4 rounded-card border text-left transition flex flex-col justify-between ${
                  pack === 'custom'
                    ? 'border-accent bg-accent/5 ring-1 ring-accent'
                    : 'border-border bg-surface-1 hover:border-text-secondary/30'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-control bg-surface-2 text-text-primary">
                      <Wallet className="w-5 h-5" />
                    </div>
                    {pack === 'custom' && <CheckCircle2 className="w-5 h-5 text-accent" />}
                  </div>
                  <h3 className="font-display text-base font-bold text-text-primary">Personalizado</h3>
                  <p className="text-xs text-text-secondary mt-1">
                    Definí el nombre de tu banco principal y empezá con una estructura simple.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border/60 text-xs text-text-muted space-y-1">
                  <p className="flex items-center gap-1.5 font-mono">
                    <Check className="w-3.5 h-3.5 text-accent" /> Tu banco personalizado
                  </p>
                  <p className="flex items-center gap-1.5 font-mono">
                    <Check className="w-3.5 h-3.5 text-accent" /> Billetera de Efectivo
                  </p>
                </div>
              </button>
            </div>

            {/* Configuración del Banco */}
            <div className="bg-surface-1 border border-border rounded-card p-4">
              <label htmlFor="custom-bank-name" className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                Nombre de tu banco local o principal
              </label>
              <input
                id="custom-bank-name"
                type="text"
                value={customBankName}
                onChange={(e) => setCustomBankName(e.target.value)}
                placeholder="Ej. Commbank, Santander, Itaú, N26, Chase..."
                className="w-full bg-surface-0 border border-border rounded-control px-3.5 py-2.5 text-sm text-text-primary font-medium focus:border-accent outline-none"
              />
              <p className="text-xs text-text-muted mt-2">
                Podés crear cuentas adicionales y registrar compras en cuotas en cualquier momento desde Cuentas.
              </p>
            </div>
          </div>
        )}

        {/* PASO 3: Categorías y Contactos */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-text-primary">Categorías y división de gastos</h2>
              <p className="text-sm text-text-secondary mt-1">
                Dejamos seleccionadas las categorías estándar de vida nómada y crearemos tu usuario para división de gastos (Split Pay).
              </p>
            </div>

            {/* Categorías */}
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
                  {selectedCategories.length === DEFAULT_CATEGORIES.length ? 'Desmarcar todas' : 'Marcar todas'}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {DEFAULT_CATEGORIES.map((cat) => {
                  const isChecked = selectedCategories.some((c) => c.name === cat.name)
                  return (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                        isChecked
                          ? 'bg-accent/15 border-accent text-accent'
                          : 'bg-surface-2 border-border text-text-muted hover:border-text-secondary'
                      }`}
                    >
                      {isChecked ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>{cat.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Split Pay Contacts */}
            <div className="bg-surface-1 border border-border rounded-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Contactos para gastos compartidos (Split Pay)
                </span>
              </div>
              <p className="text-xs text-text-muted">
                Crearemos tu contacto principal <strong className="text-text-primary">Personal</strong>. Si solés dividir gastos con amigos, familiares o pareja, podés agregarlos ahora:
              </p>

              <form onSubmit={handleAddPerson} className="flex gap-2">
                <input
                  type="text"
                  value={newPersonInput}
                  onChange={(e) => setNewPersonInput(e.target.value)}
                  placeholder="Ej. Diego, Gladys, Romina..."
                  className="flex-1 bg-surface-0 border border-border rounded-control px-3 py-2 text-sm text-text-primary focus:border-accent outline-none"
                />
                <button
                  type="submit"
                  className="bg-surface-2 hover:bg-surface-0 border border-border text-text-primary px-4 py-2 rounded-control text-xs font-medium transition"
                >
                  Agregar
                </button>
              </form>

              <div className="flex flex-wrap gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-surface-2 text-text-primary border border-border">
                  <Users className="w-3.5 h-3.5 text-accent" /> Personal (Tus gastos propios)
                </span>
                {customPeople.map((person) => (
                  <span
                    key={person}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-surface-2 text-text-primary border border-border"
                  >
                    <span>{person}</span>
                    <button
                      type="button"
                      onClick={() => handleRemovePerson(person)}
                      className="text-text-muted hover:text-expense transition"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Barra de Navegación Inferior */}
      <footer className="max-w-3xl w-full mx-auto flex items-center justify-between pt-6 border-t border-border">
        {step > 1 ? (
          <button
            type="button"
            disabled={submitting}
            onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-control text-sm font-medium text-text-secondary hover:text-text-primary transition hover:bg-surface-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Atrás</span>
          </button>
        ) : (
          <div />
        )}

        {step < 3 ? (
          <button
            type="button"
            onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
            className="flex items-center gap-2 bg-accent text-[color:var(--on-accent)] px-6 py-2.5 rounded-control text-sm font-semibold hover:opacity-90 transition"
          >
            <span>Continuar</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled={submitting}
            onClick={handleFinish}
            className="flex items-center gap-2 bg-accent text-[color:var(--on-accent)] px-7 py-2.5 rounded-control text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{submitting ? 'Inicializando tu espacio...' : 'Inicializar mi espacio →'}</span>
          </button>
        )}
      </footer>
    </div>
  )
}
