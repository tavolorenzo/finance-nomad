'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Landmark,
  User,
  Calendar,
  Percent,
  DollarSign,
  ArrowLeft,
  AlertCircle,
  Eye,
  CheckCircle2,
  WifiOff
} from 'lucide-react'
import { createLoanAction } from '@/app/(protected)/loans/actions'
import { calculateItauSchedule } from '@/lib/loans/itau-amortization'
import { formatMoney } from '@/lib/currency'
import { useOnlineStatus } from '@/lib/hooks/use-online-status'
import type { Account, Institution, Person, LoanDirection } from '@/lib/types'

interface LoanFormProps {
  institutions: Institution[]
  people: Person[]
  accounts: (Account & { institutions?: { name: string } | null })[]
}

const COMMON_CURRENCIES = ['USD', 'UYU', 'EUR', 'ARS', 'AUD', 'NZD', 'BRL']

export function LoanForm({ institutions, people, accounts }: LoanFormProps) {
  const router = useRouter()
  const isOnline = useOnlineStatus()

  // Form State
  const [name, setName] = useState('')
  const [direction, setDirection] = useState<LoanDirection>('BORROWED')
  const [principal, setPrincipal] = useState('10000')
  const [currency, setCurrency] = useState('USD')
  const [teaRateStr, setTeaRateStr] = useState('28.5') // 28.5% TEA
  const [includesVat22, setIncludesVat22] = useState(false)
  const [totalInstallments, setTotalInstallments] = useState('12')
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [dueDay, setDueDay] = useState('10')
  const [counterpartyInstitutionId, setCounterpartyInstitutionId] = useState('')
  const [beneficiaryPersonId, setBeneficiaryPersonId] = useState('')
  const [recordDisbursement, setRecordDisbursement] = useState(false)
  const [disbursementAccountId, setDisbursementAccountId] = useState(accounts[0]?.id || '')
  const [notes, setNotes] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSchedulePreview, setShowSchedulePreview] = useState(false)

  // Live Amortization Schedule Calculation
  const schedule = useMemo(() => {
    const p = parseFloat(principal) || 0
    const tea = (parseFloat(teaRateStr) || 0) / 100
    const n = parseInt(totalInstallments, 10) || 1
    const day = parseInt(dueDay, 10) || null

    return calculateItauSchedule({
      principal: p,
      teaRate: tea,
      totalInstallments: n,
      startDate,
      dueDay: day,
      includesVat22
    })
  }, [principal, teaRateStr, totalInstallments, startDate, dueDay, includesVat22])

  const isBorrowed = direction === 'BORROWED'

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!isOnline) {
      setError('Estás sin conexión. Para crear un préstamo conectate a internet.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('direction', direction)
      formData.append('principal', principal)
      formData.append('currency', currency)
      formData.append('tea_rate', teaRateStr)
      if (includesVat22) formData.append('includes_vat_22', 'true')
      formData.append('total_installments', totalInstallments)
      formData.append('start_date', startDate)
      if (dueDay) formData.append('due_day', dueDay)
      if (counterpartyInstitutionId) formData.append('counterparty_institution_id', counterpartyInstitutionId)
      if (beneficiaryPersonId) formData.append('beneficiary_person_id', beneficiaryPersonId)
      if (recordDisbursement) {
        formData.append('record_disbursement', 'true')
        if (disbursementAccountId) formData.append('disbursement_account_id', disbursementAccountId)
      }
      if (notes) formData.append('notes', notes)

      const result = await createLoanAction(formData)
      if (result.success) {
        router.push(`/loans/${result.loanId}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el préstamo.')
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/loans"
          className="inline-flex items-center justify-center w-8 h-8 rounded-control border border-border bg-surface-1 text-text-secondary hover:text-text-primary transition"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">
            Nuevo Préstamo
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Sistema de amortización francés de Banco Itaú Uruguay y multi-moneda
          </p>
        </div>
      </div>

      {!isOnline && (
        <div className="flex items-center gap-2 p-3 bg-pending/10 border border-pending/20 rounded-control text-pending text-xs">
          <WifiOff size={16} className="shrink-0" />
          <span>Estás sin conexión. La creación de préstamos requiere conexión a internet.</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 bg-expense/10 border border-expense/20 rounded-control text-expense text-xs">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda: Formulario Principal */}
        <div className="lg:col-span-7 space-y-5 bg-surface-1 border border-border rounded-panel p-5">
          {/* Sentido del préstamo */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Tipo de Operación
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDirection('BORROWED')}
                className={`py-2 px-3 rounded-control text-xs font-semibold border transition text-center ${
                  isBorrowed
                    ? 'border-expense bg-expense/10 text-expense'
                    : 'border-border bg-surface-2 text-text-secondary hover:text-text-primary'
                }`}
              >
                Tomé prestado (Mi Deuda)
              </button>
              <button
                type="button"
                onClick={() => setDirection('LENT')}
                className={`py-2 px-3 rounded-control text-xs font-semibold border transition text-center ${
                  !isBorrowed
                    ? 'border-income bg-income/10 text-income'
                    : 'border-border bg-surface-2 text-text-secondary hover:text-text-primary'
                }`}
              >
                Presté dinero (Por Cobrar)
              </button>
            </div>
          </div>

          {/* Nombre / Concepto */}
          <div>
            <label htmlFor="loan-name" className="block text-xs font-medium text-text-secondary mb-1">
              Nombre o Concepto
            </label>
            <input
              id="loan-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ej. Préstamo Personal Itaú o Préstamo viaje Diego"
              required
              className="w-full bg-surface-2 border border-border rounded-control px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
            />
          </div>

          {/* Capital y Divisa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="loan-principal" className="block text-xs font-medium text-text-secondary mb-1">
                Capital Prestado
              </label>
              <div className="relative">
                <DollarSign size={14} className="absolute left-3 top-2.5 text-text-muted" />
                <input
                  id="loan-principal"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={principal}
                  onChange={(e) => setPrincipal(e.target.value)}
                  required
                  className="w-full bg-surface-2 border border-border rounded-control pl-8 pr-3 py-2 text-sm text-text-primary font-mono tabular-nums focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="loan-currency" className="block text-xs font-medium text-text-secondary mb-1">
                Moneda
              </label>
              <select
                id="loan-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-control px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              >
                {COMMON_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Parámetros Financieros Itaú: TEA %, Plazo y IVA */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="loan-tea" className="block text-xs font-medium text-text-secondary mb-1">
                Tasa TEA (%)
              </label>
              <div className="relative">
                <Percent size={13} className="absolute right-3 top-2.5 text-text-muted" />
                <input
                  id="loan-tea"
                  type="number"
                  step="0.01"
                  min="0"
                  value={teaRateStr}
                  onChange={(e) => setTeaRateStr(e.target.value)}
                  placeholder="28.5"
                  className="w-full bg-surface-2 border border-border rounded-control px-3 py-2 text-sm text-text-primary font-mono tabular-nums focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="loan-installments" className="block text-xs font-medium text-text-secondary mb-1">
                Plazo (Cuotas)
              </label>
              <input
                id="loan-installments"
                type="number"
                min="1"
                max="240"
                value={totalInstallments}
                onChange={(e) => setTotalInstallments(e.target.value)}
                required
                className="w-full bg-surface-2 border border-border rounded-control px-3 py-2 text-sm text-text-primary font-mono tabular-nums focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label htmlFor="loan-due-day" className="block text-xs font-medium text-text-secondary mb-1">
                Día de Vto. Mensual
              </label>
              <input
                id="loan-due-day"
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                placeholder="10"
                className="w-full bg-surface-2 border border-border rounded-control px-3 py-2 text-sm text-text-primary font-mono tabular-nums focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* IVA 22% sobre intereses (Uruguay) */}
          <div className="flex items-center gap-2 pt-1">
            <input
              id="loan-vat"
              type="checkbox"
              checked={includesVat22}
              onChange={(e) => setIncludesVat22(e.target.checked)}
              className="w-4 h-4 rounded text-accent focus:ring-accent border-border"
            />
            <label htmlFor="loan-vat" className="text-xs text-text-secondary cursor-pointer">
              Aplica IVA 22% sobre intereses (Préstamos al consumo en Uruguay)
            </label>
          </div>

          {/* Fecha de desembolso */}
          <div>
            <label htmlFor="loan-start-date" className="block text-xs font-medium text-text-secondary mb-1">
              Fecha de Inicio / Desembolso
            </label>
            <input
              id="loan-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full bg-surface-2 border border-border rounded-control px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
            />
          </div>

          {/* Contrapartes: Banco y/o Persona */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border-subtle">
            <div>
              <label htmlFor="loan-inst" className="block text-xs font-medium text-text-secondary mb-1">
                Institución Financiera (Opcional)
              </label>
              <select
                id="loan-inst"
                value={counterpartyInstitutionId}
                onChange={(e) => setCounterpartyInstitutionId(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-control px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              >
                <option value="">Ninguna / Préstamo Privado</option>
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="loan-person" className="block text-xs font-medium text-text-secondary mb-1">
                Persona Asignada (Intermediación o Prestatario)
              </label>
              <select
                id="loan-person"
                value={beneficiaryPersonId}
                onChange={(e) => setBeneficiaryPersonId(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-control px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              >
                <option value="">Consumo Propio (Sin intermediario)</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Desembolso inicial en cuenta */}
          <div className="p-3 bg-surface-2 rounded-control border border-border-subtle space-y-2">
            <div className="flex items-center gap-2">
              <input
                id="record-disbursement"
                type="checkbox"
                checked={recordDisbursement}
                onChange={(e) => setRecordDisbursement(e.target.checked)}
                className="w-4 h-4 rounded text-accent focus:ring-accent border-border"
              />
              <label htmlFor="record-disbursement" className="text-xs font-medium text-text-primary cursor-pointer">
                {isBorrowed
                  ? 'Acreditar el capital en mi cuenta bancaria ahora (INCOME)'
                  : 'Debitar el capital de mi cuenta bancaria ahora (OUTCOME)'}
              </label>
            </div>

            {recordDisbursement && (
              <div className="pl-6 pt-1">
                <label htmlFor="disbursement-acc" className="block text-xs text-text-muted mb-1">
                  Cuenta de acreditación / débito
                </label>
                <select
                  id="disbursement-acc"
                  value={disbursementAccountId}
                  onChange={(e) => setDisbursementAccountId(e.target.value)}
                  className="w-full bg-surface-1 border border-border rounded-control px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency_native}) {acc.institutions?.name ? `· ${acc.institutions.name}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Notas */}
          <div>
            <label htmlFor="loan-notes" className="block text-xs font-medium text-text-secondary mb-1">
              Notas u Observaciones
            </label>
            <textarea
              id="loan-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Condiciones adicionales, número de contrato o destino del dinero..."
              className="w-full bg-surface-2 border border-border rounded-control px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
            />
          </div>

          {/* Botones */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Link
              href="/loans"
              className="px-4 py-2 border border-border rounded-control text-xs font-medium text-text-secondary hover:bg-surface-2 transition"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving || !isOnline}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-control text-xs font-semibold text-white bg-accent hover:brightness-110 transition disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Crear Préstamo'}
            </button>
          </div>
        </div>

        {/* Columna Derecha: Live Schedule Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-surface-1 border border-border rounded-panel p-5 space-y-4 sticky top-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold text-text-primary flex items-center gap-1.5">
                <Landmark size={15} className="text-accent" /> Simulación de Cuotas (Itaú)
              </h2>
              <span className="text-[11px] text-text-muted font-mono">
                i = {(schedule.monthlyRate * 100).toFixed(2)}% m
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-surface-2 rounded-control border border-border-subtle">
                <span className="text-text-muted block text-[11px]">Cuota Nivelada</span>
                <span className="font-mono tabular-nums amount font-bold text-sm text-text-primary">
                  {formatMoney(schedule.pureMonthlyPayment, currency)}
                </span>
              </div>
              <div className="p-3 bg-surface-2 rounded-control border border-border-subtle">
                <span className="text-text-muted block text-[11px]">Total Intereses</span>
                <span className="font-mono tabular-nums amount font-bold text-sm text-text-secondary">
                  {formatMoney(schedule.totalInterest, currency)}
                </span>
              </div>
              {includesVat22 && (
                <div className="p-3 bg-surface-2 rounded-control border border-border-subtle">
                  <span className="text-text-muted block text-[11px]">IVA 22%</span>
                  <span className="font-mono tabular-nums amount font-bold text-sm text-text-muted">
                    {formatMoney(schedule.totalVat, currency)}
                  </span>
                </div>
              )}
              <div className="p-3 bg-accent/10 rounded-control border border-accent/20">
                <span className="text-accent block text-[11px]">Total a Pagar</span>
                <span className="font-mono tabular-nums amount font-bold text-sm text-accent">
                  {formatMoney(schedule.totalPayment, currency)}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowSchedulePreview(!showSchedulePreview)}
                className="w-full py-1.5 text-xs text-text-secondary hover:text-text-primary border border-border rounded-control transition flex items-center justify-center gap-1.5"
              >
                <Eye size={13} /> {showSchedulePreview ? 'Ocultar Cuadro de Marcha' : 'Ver Cuadro de Marcha Completo'}
              </button>
            </div>

            {showSchedulePreview && (
              <div className="max-h-60 overflow-y-auto border border-border-subtle rounded-control bg-surface-2 text-[11px]">
                <table className="w-full text-left">
                  <thead className="bg-surface-0 border-b border-border-subtle text-text-muted sticky top-0">
                    <tr>
                      <th className="p-1.5">#</th>
                      <th className="p-1.5">Vto</th>
                      <th className="p-1.5 text-right">Cuota</th>
                      <th className="p-1.5 text-right">Capital</th>
                      <th className="p-1.5 text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {schedule.installments.map((inst) => (
                      <tr key={inst.period}>
                        <td className="p-1.5 font-mono text-text-muted">{inst.period}</td>
                        <td className="p-1.5 text-text-secondary whitespace-nowrap">{inst.dueDate}</td>
                        <td className="p-1.5 text-right font-mono tabular-nums amount font-medium text-text-primary">
                          {formatMoney(inst.installmentAmount, currency)}
                        </td>
                        <td className="p-1.5 text-right font-mono tabular-nums amount text-text-secondary">
                          {formatMoney(inst.principalAmount, currency)}
                        </td>
                        <td className="p-1.5 text-right font-mono tabular-nums amount text-text-muted">
                          {formatMoney(inst.balance, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
