import { FX_CACHE_TTL_MS } from '../storage/fx-cache'
import { calculateAccountAmount, splitInstallments, getRate } from '../fx'
import type { LedgerBundle } from './types'

export type RateFetcher = (date: string, from: string, to: string) => Promise<number>

/**
 * Verifica si un bundle requiere actualización de cotización cambiaria en el backend:
 * - Debe ser de tipo TRANSACTION o TRANSFER con divisas cruzadas.
 * - rate_overridden debe ser false (si el usuario la fijó a mano, se respeta 100%).
 * - La cotización guardada debe haber expirado (> 24h según rateFetchedAt o sin timestamp).
 */
export async function reconcileBundleFxRate(
  bundle: LedgerBundle,
  now: number = Date.now(),
  fetcher: RateFetcher = getRate
): Promise<LedgerBundle> {
  if (bundle.type !== 'TRANSACTION' && bundle.type !== 'TRANSFER') {
    return bundle
  }

  if (!bundle.rows || bundle.rows.length === 0) {
    return bundle
  }

  // Verificar si hay tasa manual o si todas las filas son en la misma divisa
  const hasCrossCurrency = bundle.rows.some(
    (row) => row.currency_original !== row.currency_account
  )
  if (!hasCrossCurrency) {
    return bundle
  }

  // Si cualquier fila tiene rate_overridden = true, respetamos el input del usuario 100%
  const isOverridden = bundle.rows.some((row) => row.rate_overridden === true)
  if (isOverridden) {
    return bundle
  }

  // Verificar si la tasa expiró (> 24 horas o inexistente)
  const fetchedAtTimestamp = bundle.rateFetchedAt ? new Date(bundle.rateFetchedAt).getTime() : 0
  const isExpired = !fetchedAtTimestamp || isNaN(fetchedAtTimestamp) || now - fetchedAtTimestamp > FX_CACHE_TTL_MS

  if (!isExpired) {
    return bundle
  }

  // Identificar el par de conversión
  // En TRANSFER: sourceRow debita en moneda de origen, destRow acredita en moneda de destino
  if (bundle.type === 'TRANSFER') {
    const sourceRow = bundle.rows.find((r) => r.parent_transaction_id === null) ?? bundle.rows[0]
    const destRow = bundle.rows.find((r) => r.parent_transaction_id !== null) ?? bundle.rows[1]

    if (!sourceRow || !destRow) return bundle

    const fromCurr = sourceRow.currency_account
    const toCurr = destRow.currency_account

    if (fromCurr === toCurr) return bundle

    try {
      const newRate = await fetcher(sourceRow.date, sourceRow.currency_original, toCurr)
      if (typeof newRate !== 'number' || newRate <= 0) return bundle

      // Recalcular montos de transferencia según moneda base
      const fee = sourceRow.fee_amount || 0

      if (sourceRow.currency_original === toCurr) {
        // Transferencia fijada en moneda de destino (ej: pago de tarjeta en UYU con EUR)
        const baseFrom = destRow.amount_original / newRate
        const amountFrom = Math.round((baseFrom + fee) * 100) / 100
        sourceRow.amount_account = -Math.abs(amountFrom)
        sourceRow.exchange_rate = newRate
        destRow.exchange_rate = newRate
      } else {
        // Transferencia estándar fijada en moneda de origen
        const net = Math.max(0, sourceRow.amount_original - fee)
        const amountTo = Math.round(net * newRate * 100) / 100
        destRow.amount_account = Math.abs(amountTo)
        sourceRow.exchange_rate = newRate
        destRow.exchange_rate = newRate
      }

      bundle.rateFetchedAt = new Date(now).toISOString()
    } catch {
      // Si la API de FX falla durante la sincronización, se preserva la cotización que traía el bundle
    }

    return bundle
  }

  // En TRANSACTION: gasto o ingreso (con 1 o más cuotas)
  const firstRow = bundle.rows[0]
  if (firstRow.currency_original === firstRow.currency_account) {
    return bundle
  }

  try {
    const newRate = await fetcher(firstRow.date, firstRow.currency_original, firstRow.currency_account)
    if (typeof newRate !== 'number' || newRate <= 0) return bundle

    const originalTotal = bundle.rows.reduce((sum, r) => sum + r.amount_original, 0)
    const fee = firstRow.fee_amount || 0
    const totalAccount = calculateAccountAmount(originalTotal, fee, newRate)

    if (bundle.rows.length === 1) {
      firstRow.exchange_rate = newRate
      firstRow.amount_account = totalAccount
    } else {
      const splitAccount = splitInstallments(totalAccount, bundle.rows.length)
      bundle.rows.forEach((r, idx) => {
        r.exchange_rate = newRate
        r.amount_account = splitAccount[idx]
      })
    }

    bundle.rateFetchedAt = new Date(now).toISOString()
  } catch {
    // Si la API falla, se preserva la cotización existente
  }

  return bundle
}
