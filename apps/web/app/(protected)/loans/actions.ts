'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { calculateItauSchedule } from '@/lib/loans/itau-amortization'
import { getRate, calculateAccountAmount } from '@/lib/fx'
import type { LoanDirection } from '@/lib/types'

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No hay sesión activa')
  return { supabase, user }
}

export async function ensureLoanInterestCategory(): Promise<string> {
  const { supabase, user } = await requireUser()
  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', user.id)
    .ilike('name', 'Intereses de Préstamos')
    .maybeSingle()

  if (existing) return existing.id

  const { data: created, error } = await supabase
    .from('categories')
    .insert({
      user_id: user.id,
      name: 'Intereses de Préstamos',
      icon: 'percent',
      color: 'expense'
    })
    .select('id')
    .single()

  if (error || !created) throw new Error('No se pudo inicializar la categoría de intereses')
  return created.id
}

export async function createLoanAction(formData: FormData) {
  const { supabase, user } = await requireUser()

  const name = String(formData.get('name') ?? '').trim()
  if (!name) throw new Error('Ingresá un nombre o descripción para el préstamo.')

  const direction = (formData.get('direction') as LoanDirection) || 'BORROWED'
  const principal = parseFloat(String(formData.get('principal') ?? '0'))
  if (isNaN(principal) || principal <= 0) {
    throw new Error('El monto de capital debe ser mayor a 0.')
  }

  const currency = String(formData.get('currency') ?? 'USD').trim().toUpperCase()
  const rawTeaRate = parseFloat(String(formData.get('tea_rate') ?? '0'))
  const teaRate = isNaN(rawTeaRate) ? 0 : rawTeaRate / 100 // Viene como porcentaje ej. 28.5 -> 0.285
  const includesVat22 = formData.get('includes_vat_22') === 'true' || formData.get('includes_vat_22') === 'on'

  const totalInstallments = parseInt(String(formData.get('total_installments') ?? '1'), 10)
  if (isNaN(totalInstallments) || totalInstallments < 1) {
    throw new Error('El plazo debe tener al menos 1 cuota.')
  }

  const startDate = String(formData.get('start_date') ?? new Date().toISOString().slice(0, 10))
  const rawDueDay = parseInt(String(formData.get('due_day') ?? ''), 10)
  const dueDay = !isNaN(rawDueDay) && rawDueDay >= 1 && rawDueDay <= 31 ? rawDueDay : null

  const counterpartyInstitutionId = String(formData.get('counterparty_institution_id') ?? '').trim() || null
  const beneficiaryPersonId = String(formData.get('beneficiary_person_id') ?? '').trim() || null
  const disbursementAccountId = String(formData.get('disbursement_account_id') ?? '').trim() || null
  const recordDisbursement = formData.get('record_disbursement') === 'true' || formData.get('record_disbursement') === 'on'
  const notes = String(formData.get('notes') ?? '').trim() || null

  // 1. Insertar préstamo en 'loans'
  const { data: loan, error: loanErr } = await supabase
    .from('loans')
    .insert({
      user_id: user.id,
      name,
      direction,
      principal,
      currency,
      tea_rate: teaRate,
      includes_vat_22: includesVat22,
      total_installments: totalInstallments,
      start_date: startDate,
      due_day: dueDay,
      counterparty_institution_id: counterpartyInstitutionId,
      beneficiary_person_id: beneficiaryPersonId,
      disbursement_account_id: disbursementAccountId,
      notes,
      status: 'ACTIVE',
      is_active: true
    })
    .select('id')
    .single()

  if (loanErr || !loan) {
    throw new Error('Error al registrar el préstamo en la base de datos.')
  }

  // 2. Generar el cuadro de amortización (Itaú Uruguay Sistema Francés)
  const schedule = calculateItauSchedule({
    principal,
    teaRate,
    totalInstallments,
    startDate,
    dueDay,
    includesVat22
  })

  // 3. Insertar las cuotas proyectadas en 'loan_installments'
  const installmentRows = schedule.installments.map((inst) => ({
    loan_id: loan.id,
    period: inst.period,
    installment_amount: inst.installmentAmount,
    interest: inst.interestAmount,
    payment: inst.principalAmount,
    balance: inst.balance,
    vat_amount: inst.vatAmount,
    due_date: inst.dueDate,
    paid: false
  }))

  const { error: instErr } = await supabase
    .from('loan_installments')
    .insert(installmentRows)

  if (instErr) {
    // Si falla la inserción de cuotas, limpiamos el préstamo creado para mantener atomicidad
    await supabase.from('loans').delete().eq('id', loan.id)
    throw new Error('No se pudieron generar las cuotas del préstamo.')
  }

  // 4. Si el usuario eligió registrar el desembolso inicial en una cuenta bancaria
  if (recordDisbursement && disbursementAccountId) {
    const { data: account } = await supabase
      .from('accounts')
      .select('id, institution_id, currency_native')
      .eq('id', disbursementAccountId)
      .eq('user_id', user.id)
      .single()

    if (account) {
      let exchangeRate = 1
      if (currency !== account.currency_native) {
        try {
          exchangeRate = await getRate(startDate, currency, account.currency_native)
        } catch {
          exchangeRate = 1
        }
      }

      const amountAccount = calculateAccountAmount(principal, 0, exchangeRate)
      const isBorrowed = direction === 'BORROWED'

      await supabase.from('master_transactions').insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        date: startDate,
        type: isBorrowed ? 'INCOME' : 'OUTCOME',
        amount_original: principal,
        currency_original: currency,
        fee_amount: 0,
        exchange_rate: exchangeRate,
        rate_overridden: false,
        amount_account: amountAccount,
        currency_account: account.currency_native,
        institution_id: account.institution_id,
        account_id: account.id,
        person_id: !isBorrowed ? beneficiaryPersonId : null,
        installment_current: 1,
        installment_total: 1,
        status: 'COMPLETED',
        notes: isBorrowed
          ? `Desembolso préstamo: ${name}`
          : `Préstamo otorgado: ${name}`
      })
    }
  }

  revalidatePath('/loans')
  revalidatePath('/accounts')
  revalidatePath('/dashboard')

  return { success: true, loanId: loan.id }
}

export async function deleteLoanAction(id: string) {
  const { supabase, user } = await requireUser()

  const { error } = await supabase
    .from('loans')
    .update({ is_active: false })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error('No se pudo desactivar el préstamo.')

  revalidatePath('/loans')
  revalidatePath('/dashboard')
}

export async function payLoanInstallmentAction({
  loanId,
  installmentId,
  accountId,
  paidDate,
  exchangeRateOverride
}: {
  loanId: string
  installmentId: string
  accountId: string
  paidDate?: string
  exchangeRateOverride?: number
}) {
  const { supabase, user } = await requireUser()

  // 1. Obtener préstamo y cuota
  const { data: loan, error: loanErr } = await supabase
    .from('loans')
    .select('*')
    .eq('id', loanId)
    .eq('user_id', user.id)
    .single()

  if (loanErr || !loan) throw new Error('Préstamo no encontrado.')

  const { data: installment, error: instErr } = await supabase
    .from('loan_installments')
    .select('*')
    .eq('id', installmentId)
    .eq('loan_id', loanId)
    .single()

  if (instErr || !installment) throw new Error('Cuota no encontrada.')
  if (installment.paid) throw new Error('Esta cuota ya se encuentra pagada.')

  // 2. Validación secuencial estricta (no pagos extraordinarios ni salteados)
  const { data: previousUnpaid } = await supabase
    .from('loan_installments')
    .select('period')
    .eq('loan_id', loanId)
    .eq('paid', false)
    .lt('period', installment.period)
    .order('period', { ascending: true })
    .limit(1)

  if (previousUnpaid && previousUnpaid.length > 0) {
    throw new Error(
      `Debés pagar las cuotas en orden correlativo. La cuota ${previousUnpaid[0].period} sigue pendiente.`
    )
  }

  // 3. Obtener cuenta de pago/cobro
  const { data: account, error: accErr } = await supabase
    .from('accounts')
    .select('id, institution_id, currency_native')
    .eq('id', accountId)
    .eq('user_id', user.id)
    .single()

  if (accErr || !account) throw new Error('Cuenta de pago no encontrada.')

  const dateToUse = paidDate || new Date().toISOString().slice(0, 10)

  // Tipo de cambio si difiere la divisa
  let exchangeRate = exchangeRateOverride || 1
  if (!exchangeRateOverride && loan.currency !== account.currency_native) {
    try {
      exchangeRate = await getRate(dateToUse, loan.currency, account.currency_native)
    } catch {
      exchangeRate = 1
    }
  }

  const isBorrowed = loan.direction === 'BORROWED'
  const isOutcome = isBorrowed // Si tomé préstamo, pagar cuota es OUTCOME. Si presté, cobrar es INCOME.

  const bundleId = crypto.randomUUID()
  const capitalRowId = crypto.randomUUID()
  const rowsToInsert = []

  // Fila 1: Amortización de Capital (Opción B)
  const capitalOriginal = installment.payment // Amortización principal
  const capitalAccount = calculateAccountAmount(capitalOriginal, 0, exchangeRate)

  rowsToInsert.push({
    id: capitalRowId,
    user_id: user.id,
    date: dateToUse,
    type: isOutcome ? 'OUTCOME' : 'INCOME',
    amount_original: capitalOriginal,
    currency_original: loan.currency,
    fee_amount: 0,
    exchange_rate: exchangeRate,
    rate_overridden: !!exchangeRateOverride,
    amount_account: capitalAccount,
    currency_account: account.currency_native,
    institution_id: account.institution_id,
    account_id: account.id,
    person_id: loan.beneficiary_person_id || null,
    installment_current: installment.period,
    installment_total: loan.total_installments,
    status: 'COMPLETED',
    notes: `Cuota ${installment.period}/${loan.total_installments} (Capital) - ${loan.name}`
  })

  // Fila 2: Intereses y costos financieros (Opción B, si hay intereses o IVA)
  const interestPlusVat = Math.round(
    ((installment.interest || 0) + (installment.vat_amount || 0)) * 100
  ) / 100

  if (interestPlusVat > 0) {
    const interestCategoryId = await ensureLoanInterestCategory()
    const interestAccount = calculateAccountAmount(interestPlusVat, 0, exchangeRate)

    rowsToInsert.push({
      id: crypto.randomUUID(),
      parent_transaction_id: capitalRowId,
      user_id: user.id,
      date: dateToUse,
      type: isOutcome ? 'OUTCOME' : 'INCOME',
      amount_original: interestPlusVat,
      currency_original: loan.currency,
      fee_amount: 0,
      exchange_rate: exchangeRate,
      rate_overridden: !!exchangeRateOverride,
      amount_account: interestAccount,
      currency_account: account.currency_native,
      institution_id: account.institution_id,
      account_id: account.id,
      category_id: interestCategoryId,
      person_id: loan.beneficiary_person_id || null,
      installment_current: installment.period,
      installment_total: loan.total_installments,
      status: 'COMPLETED',
      notes: `Cuota ${installment.period}/${loan.total_installments} (Interés) - ${loan.name}`
    })
  }

  // 4. Insertar movimientos en el Ledger
  const { error: txErr } = await supabase
    .from('master_transactions')
    .insert(rowsToInsert)

  if (txErr) {
    throw new Error('No se pudo asentar el pago en el libro contable.')
  }

  // 5. Actualizar la cuota a pagada
  const { error: updateInstErr } = await supabase
    .from('loan_installments')
    .update({
      paid: true,
      paid_at: new Date().toISOString(),
      account_id: account.id,
      transaction_bundle_id: bundleId
    })
    .eq('id', installmentId)

  if (updateInstErr) {
    throw new Error('Se registró la transacción pero falló la actualización de la cuota.')
  }

  // 6. Verificar si se completaron todas las cuotas
  const { count: unpaidCount } = await supabase
    .from('loan_installments')
    .select('id', { count: 'exact', head: true })
    .eq('loan_id', loanId)
    .eq('paid', false)

  if (unpaidCount === 0) {
    await supabase
      .from('loans')
      .update({ status: 'PAID' })
      .eq('id', loanId)
  }

  revalidatePath('/loans')
  revalidatePath(`/loans/${loanId}`)
  revalidatePath('/accounts')
  revalidatePath('/transactions')
  revalidatePath('/dashboard')

  return { success: true }
}
