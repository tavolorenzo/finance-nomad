'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Landmark,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  CheckCircle2,
  Users,
  Search
} from 'lucide-react'
import { LoanCard } from './LoanCard'
import { formatMoney } from '@/lib/currency'
import type { Account, LoanWithInstallments } from '@/lib/types'

interface LoansClientProps {
  loans: LoanWithInstallments[]
  accounts: (Account & { institutions?: { name: string } | null })[]
  displayCurrency: string
}

type FilterTab = 'ALL' | 'BORROWED' | 'LENT' | 'INTERMEDIATED' | 'PAID'

export function LoansClient({ loans, accounts, displayCurrency }: LoansClientProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  // Filtrado de préstamos
  const filteredLoans = useMemo(() => {
    return loans.filter((loan) => {
      // Búsqueda por texto
      if (searchTerm) {
        const query = searchTerm.toLowerCase()
        const matchesName = loan.name.toLowerCase().includes(query)
        const matchesInst = loan.institution?.name?.toLowerCase().includes(query)
        const matchesPerson = loan.person?.name?.toLowerCase().includes(query)
        if (!matchesName && !matchesInst && !matchesPerson) return false
      }

      if (activeTab === 'PAID') return loan.status === 'PAID'
      if (activeTab === 'BORROWED') return loan.direction === 'BORROWED' && loan.status !== 'PAID'
      if (activeTab === 'LENT') return loan.direction === 'LENT' && loan.status !== 'PAID'
      if (activeTab === 'INTERMEDIATED') {
        return !!loan.counterparty_institution_id && !!loan.beneficiary_person_id && loan.status !== 'PAID'
      }
      return loan.status !== 'PAID'
    })
  }, [loans, activeTab, searchTerm])

  // KPIs
  const kpis = useMemo(() => {
    let totalBorrowedRemaining = 0
    let totalLentRemaining = 0
    let nextDueInstallment: { date: string; amount: number; currency: string; loanName: string } | null = null

    for (const loan of loans) {
      if (loan.status === 'PAID') continue
      const installments = loan.installments || []
      const next = installments
        .filter((i) => !i.paid)
        .sort((a, b) => a.period - b.period)[0]

      const remaining = next
        ? next.balance + next.payment
        : loan.principal

      if (loan.direction === 'BORROWED') {
        totalBorrowedRemaining += remaining
      } else {
        totalLentRemaining += remaining
      }

      if (next?.due_date) {
        if (!nextDueInstallment || next.due_date < nextDueInstallment.date) {
          nextDueInstallment = {
            date: next.due_date,
            amount: next.installment_amount,
            currency: loan.currency,
            loanName: loan.name
          }
        }
      }
    }

    return {
      totalBorrowedRemaining,
      totalLentRemaining,
      nextDueInstallment
    }
  }, [loans])

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">
            Préstamos
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Gestión de deudas bancarias, préstamos otorgados y cronogramas de amortización
          </p>
        </div>

        <Link
          href="/loans/new"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-control text-xs font-semibold text-white bg-accent hover:brightness-110 transition self-start sm:self-auto shadow-sm"
        >
          <Plus size={15} /> Nuevo Préstamo
        </Link>
      </div>

      {/* Tarjetas KPI Superiores */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-1 border border-border rounded-panel p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Deuda Activa (Tomados)</span>
            <ArrowUpRight size={15} className="text-expense" />
          </div>
          <div className="font-mono tabular-nums amount text-xl font-bold text-expense">
            {formatMoney(kpis.totalBorrowedRemaining, displayCurrency)}
          </div>
          <p className="text-[11px] text-text-muted">Saldo deudor por amortizar</p>
        </div>

        <div className="bg-surface-1 border border-border rounded-panel p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Por Cobrar (Otorgados)</span>
            <ArrowDownLeft size={15} className="text-income" />
          </div>
          <div className="font-mono tabular-nums amount text-xl font-bold text-income">
            {formatMoney(kpis.totalLentRemaining, displayCurrency)}
          </div>
          <p className="text-[11px] text-text-muted">Acreencias pendientes de cobro</p>
        </div>

        <div className="bg-surface-1 border border-border rounded-panel p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Próximo Vencimiento</span>
            <Calendar size={15} className="text-pending" />
          </div>
          {kpis.nextDueInstallment ? (
            <div>
              <div className="font-mono tabular-nums amount text-lg font-bold text-text-primary">
                {formatMoney(kpis.nextDueInstallment.amount, kpis.nextDueInstallment.currency)}
              </div>
              <p className="text-[11px] text-text-muted truncate">
                {kpis.nextDueInstallment.date} · {kpis.nextDueInstallment.loanName}
              </p>
            </div>
          ) : (
            <div>
              <div className="text-sm font-semibold text-text-secondary">Al día</div>
              <p className="text-[11px] text-text-muted">No hay cuotas pendientes</p>
            </div>
          )}
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Tabs de Filtro */}
        <div className="flex items-center gap-1 p-1 bg-surface-1 border border-border rounded-control overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 rounded-control font-medium transition whitespace-nowrap ${
              activeTab === 'ALL'
                ? 'bg-accent/15 text-accent font-semibold'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Activos ({loans.filter((l) => l.status !== 'PAID').length})
          </button>
          <button
            onClick={() => setActiveTab('BORROWED')}
            className={`px-3 py-1.5 rounded-control font-medium transition whitespace-nowrap ${
              activeTab === 'BORROWED'
                ? 'bg-expense/15 text-expense font-semibold'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Mis Deudas
          </button>
          <button
            onClick={() => setActiveTab('LENT')}
            className={`px-3 py-1.5 rounded-control font-medium transition whitespace-nowrap ${
              activeTab === 'LENT'
                ? 'bg-income/15 text-income font-semibold'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Por Cobrar
          </button>
          <button
            onClick={() => setActiveTab('INTERMEDIATED')}
            className={`px-3 py-1.5 rounded-control font-medium transition whitespace-nowrap ${
              activeTab === 'INTERMEDIATED'
                ? 'bg-accent/15 text-accent font-semibold'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Intermediados
          </button>
          <button
            onClick={() => setActiveTab('PAID')}
            className={`px-3 py-1.5 rounded-control font-medium transition whitespace-nowrap ${
              activeTab === 'PAID'
                ? 'bg-surface-2 text-text-primary font-semibold'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Finalizados ({loans.filter((l) => l.status === 'PAID').length})
          </button>
        </div>

        {/* Búsqueda */}
        <div className="relative min-w-[200px]">
          <Search size={14} className="absolute left-3 top-2.5 text-text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar préstamo, banco o persona..."
            className="w-full bg-surface-1 border border-border rounded-control pl-8 pr-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Listado de Préstamos */}
      {filteredLoans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredLoans.map((loan) => (
            <LoanCard key={loan.id} loan={loan} accounts={accounts} />
          ))}
        </div>
      ) : (
        <div className="bg-surface-1 border border-border rounded-panel p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center mx-auto">
            <Landmark size={24} />
          </div>
          <h3 className="font-display text-base font-bold text-text-primary">
            No hay préstamos para mostrar
          </h3>
          <p className="text-xs text-text-muted max-w-sm mx-auto">
            {searchTerm
              ? 'No encontramos coincidencias para tu búsqueda. Probá con otro término.'
              : activeTab === 'PAID'
              ? 'Aún no tenés préstamos finalizados.'
              : 'Registrá tus deudas con bancos o préstamos a terceros para proyectar su amortización.'}
          </p>
          {!searchTerm && activeTab !== 'PAID' && (
            <div className="pt-2">
              <Link
                href="/loans/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-control text-xs font-semibold text-white bg-accent hover:brightness-110 transition shadow-sm"
              >
                <Plus size={14} /> Registrar Primer Préstamo
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
