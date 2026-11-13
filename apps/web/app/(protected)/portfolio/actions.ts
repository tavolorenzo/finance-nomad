'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getRate } from '@/lib/fx'
import { normalizeTicker } from '@/lib/portfolio/calculations'
import type { PortfolioAssetType, PortfolioQuoteMode, PortfolioTransactionType } from '@/lib/types'

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No hay sesión activa.')
  return { supabase, user }
}

export async function createPortfolioOperationAction(formData: FormData) {
  const { supabase, user } = await requireUser()

  const rawTicker = String(formData.get('ticker') ?? '')
  const ticker = normalizeTicker(rawTicker)
  if (!ticker) {
    throw new Error('Ingresá el ticker o código del activo.')
  }

  const assetName = String(formData.get('asset_name') ?? '').trim() || ticker
  const assetType = (String(formData.get('asset_type') ?? 'STOCK') as PortfolioAssetType) || 'STOCK'
  const type = (String(formData.get('type') ?? 'BUY') as PortfolioTransactionType) || 'BUY'

  const units = parseFloat(String(formData.get('units') ?? '0'))
  if (isNaN(units) || units <= 0) {
    throw new Error('La cantidad de unidades debe ser mayor a 0.')
  }

  const pricePerUnit = parseFloat(String(formData.get('price_per_unit') ?? '0'))
  if (isNaN(pricePerUnit) || pricePerUnit <= 0) {
    throw new Error('El precio unitario debe ser mayor a 0.')
  }

  const rawFee = parseFloat(String(formData.get('fee_amount') ?? '0'))
  const feeAmount = isNaN(rawFee) || rawFee < 0 ? 0 : rawFee

  const currency = String(formData.get('currency') ?? 'USD').trim().toUpperCase()
  const quoteMode = (String(formData.get('quote_mode') ?? 'auto') as PortfolioQuoteMode) || 'auto'
  const rawManualPrice = parseFloat(String(formData.get('manual_price') ?? ''))
  const manualPrice =
    quoteMode === 'manual'
      ? !isNaN(rawManualPrice) && rawManualPrice > 0
        ? rawManualPrice
        : pricePerUnit
      : !isNaN(rawManualPrice) && rawManualPrice > 0
      ? rawManualPrice
      : null

  const date = String(formData.get('date') ?? new Date().toISOString().slice(0, 10))
  const notes = String(formData.get('notes') ?? '').trim() || null

  const impactAccount =
    formData.get('impact_account') === 'true' || formData.get('impact_account') === 'on'
  const fundingAccountId = String(formData.get('funding_account_id') ?? '').trim() || null

  let linkedTransactionId: string | null = null

  // Si el usuario eligió impactar el movimiento en una cuenta bancaria/broker
  if (impactAccount && fundingAccountId) {
    const { data: account } = await supabase
      .from('accounts')
      .select('id, institution_id, currency_native')
      .eq('id', fundingAccountId)
      .eq('user_id', user.id)
      .single()

    if (!account) {
      throw new Error('No se encontró la cuenta seleccionada para impactar el saldo.')
    }

    const totalTradeAmount =
      type === 'BUY'
        ? Math.round((units * pricePerUnit + feeAmount) * 100) / 100
        : Math.max(0, Math.round((units * pricePerUnit - feeAmount) * 100) / 100)

    let exchangeRate = 1
    if (currency !== account.currency_native.toUpperCase()) {
      try {
        exchangeRate = await getRate(date, currency, account.currency_native)
      } catch {
        exchangeRate = 1
      }
    }

    const absAccountAmount = Math.round(totalTradeAmount * exchangeRate * 100) / 100
    // Usamos ADJUSTMENT con signo negativo en BUY y positivo en SELL para impactar el saldo de la cuenta
    // sin contaminar los gastos de consumo (OUTCOME) en Presupuesto y Análisis.
    const signedAccountAmount = type === 'BUY' ? -absAccountAmount : absAccountAmount
    const signedOriginalAmount = type === 'BUY' ? -totalTradeAmount : totalTradeAmount

    const txLabel =
      type === 'BUY'
        ? `Inversión (Compra): ${units} ${ticker} @ ${pricePerUnit} ${currency}`
        : `Inversión (Venta): ${units} ${ticker} @ ${pricePerUnit} ${currency}`

    const { data: ledgerRow, error: ledgerErr } = await supabase
      .from('master_transactions')
      .insert({
        user_id: user.id,
        date,
        type: 'ADJUSTMENT',
        amount_original: signedOriginalAmount,
        currency_original: currency,
        fee_amount: feeAmount,
        exchange_rate: exchangeRate,
        rate_overridden: false,
        amount_account: signedAccountAmount,
        currency_account: account.currency_native,
        institution_id: account.institution_id,
        account_id: account.id,
        installment_current: 1,
        installment_total: 1,
        status: 'COMPLETED',
        accounting_period: date.slice(0, 7),
        notes: notes ? `${txLabel} · ${notes}` : txLabel
      })
      .select('id')
      .single()

    if (!ledgerErr && ledgerRow) {
      linkedTransactionId = ledgerRow.id
    }
  }

  const { error } = await supabase.from('portfolio_transactions').insert({
    user_id: user.id,
    ticker,
    asset_name: assetName,
    asset_type: assetType,
    type,
    units,
    price_per_unit: pricePerUnit,
    fee_amount: feeAmount,
    currency,
    quote_mode: quoteMode,
    manual_price: manualPrice,
    funding_account_id: impactAccount ? fundingAccountId : null,
    linked_transaction_id: linkedTransactionId,
    notes,
    date
  })

  if (error) {
    if (linkedTransactionId) {
      await supabase.from('master_transactions').delete().eq('id', linkedTransactionId)
    }
    throw new Error(
      'No se pudo guardar la operación de portafolio. Verificá que la migración 0016 esté aplicada en Supabase.'
    )
  }

  // Si se definió un precio manual o modo de cotización, sincronizarlo en las demás filas del mismo ticker
  if (manualPrice != null) {
    await supabase
      .from('portfolio_transactions')
      .update({ quote_mode: quoteMode, manual_price: manualPrice })
      .eq('user_id', user.id)
      .eq('ticker', ticker)
  }

  revalidatePath('/portfolio')
  revalidatePath('/dashboard')
  revalidatePath('/accounts')
}

export async function updateTickerManualPriceAction(
  rawTicker: string,
  manualPrice: number,
  quoteMode: PortfolioQuoteMode = 'manual'
) {
  const { supabase, user } = await requireUser()
  const ticker = normalizeTicker(rawTicker)
  if (!ticker) throw new Error('Ticker inválido.')
  if (isNaN(manualPrice) || manualPrice <= 0) {
    throw new Error('El precio manual debe ser mayor a 0.')
  }

  const { error } = await supabase
    .from('portfolio_transactions')
    .update({
      quote_mode: quoteMode,
      manual_price: manualPrice
    })
    .eq('user_id', user.id)
    .eq('ticker', ticker)

  if (error) {
    throw new Error('No se pudo actualizar el valor manual del activo.')
  }

  revalidatePath('/portfolio')
  revalidatePath('/dashboard')
}

export async function deletePortfolioOperationAction(operationId: string) {
  const { supabase, user } = await requireUser()

  const { data: existing } = await supabase
    .from('portfolio_transactions')
    .select('id, linked_transaction_id')
    .eq('id', operationId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!existing) {
    throw new Error('Operación no encontrada.')
  }

  if (existing.linked_transaction_id) {
    await supabase
      .from('master_transactions')
      .delete()
      .eq('id', existing.linked_transaction_id)
      .eq('user_id', user.id)
  }

  const { error } = await supabase
    .from('portfolio_transactions')
    .delete()
    .eq('id', operationId)
    .eq('user_id', user.id)

  if (error) {
    throw new Error('No se pudo eliminar la operación del portafolio.')
  }

  revalidatePath('/portfolio')
  revalidatePath('/dashboard')
  revalidatePath('/accounts')
}

