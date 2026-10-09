import { describe, it, expect, vi } from 'vitest'
import { reconcileBundleFxRate } from './reconcile-fx'
import type { LedgerBundle } from './types'

describe('reconcileBundleFxRate', () => {
  const BASE_TIME = 1_700_000_000_000 // Timestamp de referencia
  const ONE_HOUR = 60 * 60 * 1000
  const ONE_DAY = 24 * 60 * 60 * 1000

  it('no modifica bundles que no son TRANSACTION o TRANSFER', async () => {
    const bundle: LedgerBundle = {
      id: 'adj-1',
      type: 'ADJUSTMENT',
      createdAt: new Date(BASE_TIME).toISOString(),
      rows: []
    }

    const fetcher = vi.fn()
    const result = await reconcileBundleFxRate(bundle, BASE_TIME, fetcher)
    expect(result).toBe(bundle)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('no modifica transacciones donde la moneda original coincide con la de la cuenta', async () => {
    const bundle: LedgerBundle = {
      id: 'tx-1',
      type: 'TRANSACTION',
      createdAt: new Date(BASE_TIME).toISOString(),
      rateFetchedAt: new Date(BASE_TIME - 2 * ONE_DAY).toISOString(), // Expirada pero misma moneda
      rows: [
        {
          id: 'row-1',
          parent_transaction_id: null,
          date: '2026-10-10',
          type: 'OUTCOME',
          amount_original: 100,
          currency_original: 'USD',
          fee_amount: 0,
          exchange_rate: 1,
          rate_overridden: false,
          amount_account: 100,
          currency_account: 'USD',
          institution_id: 'inst-1',
          account_id: 'acc-1',
          category_id: null,
          person_id: null,
          installment_current: 1,
          installment_total: 1,
          status: 'COMPLETED',
          notes: null,
          settled_at: null
        }
      ]
    }

    const fetcher = vi.fn()
    const result = await reconcileBundleFxRate(bundle, BASE_TIME, fetcher)
    expect(fetcher).not.toHaveBeenCalled()
    expect(result.rows[0].exchange_rate).toBe(1)
  })

  it('respeta 100% la tasa ingresada manualmente por el usuario (rate_overridden: true)', async () => {
    const bundle: LedgerBundle = {
      id: 'tx-custom',
      type: 'TRANSACTION',
      createdAt: new Date(BASE_TIME).toISOString(),
      rateFetchedAt: new Date(BASE_TIME - 3 * ONE_DAY).toISOString(), // Muy antigua
      rows: [
        {
          id: 'row-custom',
          parent_transaction_id: null,
          date: '2026-10-10',
          type: 'OUTCOME',
          amount_original: 100,
          currency_original: 'USD',
          fee_amount: 0,
          exchange_rate: 42.5, // Ingresada manualmente por el usuario
          rate_overridden: true,
          amount_account: 4250,
          currency_account: 'UYU',
          institution_id: 'inst-1',
          account_id: 'acc-1',
          category_id: null,
          person_id: null,
          installment_current: 1,
          installment_total: 1,
          status: 'COMPLETED',
          notes: null,
          settled_at: null
        }
      ]
    }

    const fetcher = vi.fn().mockResolvedValue(39.0) // Cotización del mercado diferente
    const result = await reconcileBundleFxRate(bundle, BASE_TIME, fetcher)

    expect(fetcher).not.toHaveBeenCalled()
    expect(result.rows[0].exchange_rate).toBe(42.5)
    expect(result.rows[0].amount_account).toBe(4250)
  })

  it('no llama a la API si la tasa en caché sigue vigente (< 24 horas)', async () => {
    const bundle: LedgerBundle = {
      id: 'tx-fresh',
      type: 'TRANSACTION',
      createdAt: new Date(BASE_TIME).toISOString(),
      rateFetchedAt: new Date(BASE_TIME - 12 * ONE_HOUR).toISOString(), // 12 horas (vigente)
      rows: [
        {
          id: 'row-1',
          parent_transaction_id: null,
          date: '2026-10-10',
          type: 'OUTCOME',
          amount_original: 50,
          currency_original: 'USD',
          fee_amount: 0,
          exchange_rate: 40.0,
          rate_overridden: false,
          amount_account: 2000,
          currency_account: 'UYU',
          institution_id: 'inst-1',
          account_id: 'acc-1',
          category_id: null,
          person_id: null,
          installment_current: 1,
          installment_total: 1,
          status: 'COMPLETED',
          notes: null,
          settled_at: null
        }
      ]
    }

    const fetcher = vi.fn().mockResolvedValue(41.5)
    const result = await reconcileBundleFxRate(bundle, BASE_TIME, fetcher)

    expect(fetcher).not.toHaveBeenCalled()
    expect(result.rows[0].exchange_rate).toBe(40.0)
    expect(result.rows[0].amount_account).toBe(2000)
  })

  it('reconcilia y recalcula transacción al contado si la tasa expiró (> 24 horas)', async () => {
    const bundle: LedgerBundle = {
      id: 'tx-expired',
      type: 'TRANSACTION',
      createdAt: new Date(BASE_TIME).toISOString(),
      rateFetchedAt: new Date(BASE_TIME - 25 * ONE_HOUR).toISOString(), // 25 horas (expirada)
      rows: [
        {
          id: 'row-1',
          parent_transaction_id: null,
          date: '2026-10-10',
          type: 'OUTCOME',
          amount_original: 100,
          currency_original: 'USD',
          fee_amount: 2,
          exchange_rate: 40.0,
          rate_overridden: false,
          amount_account: 3920, // (100 - 2) * 40
          currency_account: 'UYU',
          institution_id: 'inst-1',
          account_id: 'acc-1',
          category_id: null,
          person_id: null,
          installment_current: 1,
          installment_total: 1,
          status: 'COMPLETED',
          notes: null,
          settled_at: null
        }
      ]
    }

    const fetcher = vi.fn().mockResolvedValue(41.0)
    const result = await reconcileBundleFxRate(bundle, BASE_TIME, fetcher)

    expect(fetcher).toHaveBeenCalledWith('2026-10-10', 'USD', 'UYU')
    expect(result.rows[0].exchange_rate).toBe(41.0)
    // (100 - 2) * 41 = 98 * 41 = 4018
    expect(result.rows[0].amount_account).toBe(4018)
    expect(result.rateFetchedAt).toBe(new Date(BASE_TIME).toISOString())
  })

  it('recalcula cuotas proporcionales cuando la tasa expiró', async () => {
    const bundle: LedgerBundle = {
      id: 'tx-cuotas',
      type: 'TRANSACTION',
      createdAt: new Date(BASE_TIME).toISOString(),
      rateFetchedAt: new Date(BASE_TIME - 30 * ONE_HOUR).toISOString(),
      rows: [
        {
          id: 'c1',
          parent_transaction_id: null,
          date: '2026-10-10',
          type: 'OUTCOME',
          amount_original: 50,
          currency_original: 'USD',
          fee_amount: 0,
          exchange_rate: 40.0,
          rate_overridden: false,
          amount_account: 2000,
          currency_account: 'UYU',
          institution_id: 'inst-1',
          account_id: 'acc-1',
          category_id: null,
          person_id: null,
          installment_current: 1,
          installment_total: 2,
          status: 'COMPLETED',
          notes: null,
          settled_at: null
        },
        {
          id: 'c2',
          parent_transaction_id: 'c1',
          date: '2026-11-10',
          type: 'OUTCOME',
          amount_original: 50,
          currency_original: 'USD',
          fee_amount: 0,
          exchange_rate: 40.0,
          rate_overridden: false,
          amount_account: 2000,
          currency_account: 'UYU',
          institution_id: 'inst-1',
          account_id: 'acc-1',
          category_id: null,
          person_id: null,
          installment_current: 2,
          installment_total: 2,
          status: 'PENDING',
          notes: null,
          settled_at: null
        }
      ]
    }

    const fetcher = vi.fn().mockResolvedValue(42.0)
    const result = await reconcileBundleFxRate(bundle, BASE_TIME, fetcher)

    expect(fetcher).toHaveBeenCalledWith('2026-10-10', 'USD', 'UYU')
    // 100 USD total * 42 = 4200 UYU / 2 = 2100 cada cuota
    expect(result.rows[0].exchange_rate).toBe(42.0)
    expect(result.rows[0].amount_account).toBe(2100)
    expect(result.rows[1].exchange_rate).toBe(42.0)
    expect(result.rows[1].amount_account).toBe(2100)
  })

  it('recalcula la acreditación de transferencia cuando la tasa expiró', async () => {
    const bundle: LedgerBundle = {
      id: 'tr-1',
      type: 'TRANSFER',
      createdAt: new Date(BASE_TIME).toISOString(),
      rateFetchedAt: null, // Sin timestamp previo
      rows: [
        {
          id: 'tr-source',
          parent_transaction_id: null,
          date: '2026-10-10',
          type: 'TRANSFER',
          amount_original: 1000,
          currency_original: 'EUR',
          fee_amount: 10,
          exchange_rate: 1.05,
          rate_overridden: false,
          amount_account: -1010, // Débito en EUR
          currency_account: 'EUR',
          institution_id: 'inst-1',
          account_id: 'acc-1',
          category_id: null,
          person_id: null,
          installment_current: 1,
          installment_total: 1,
          status: 'COMPLETED',
          notes: 'Transferencia a USD',
          settled_at: null
        },
        {
          id: 'tr-dest',
          parent_transaction_id: 'tr-source',
          date: '2026-10-10',
          type: 'TRANSFER',
          amount_original: 1000,
          currency_original: 'EUR',
          fee_amount: 0,
          exchange_rate: 1.05,
          rate_overridden: false,
          amount_account: 1039.5, // (1000 - 10) * 1.05
          currency_account: 'USD',
          institution_id: 'inst-2',
          account_id: 'acc-2',
          category_id: null,
          person_id: null,
          installment_current: 1,
          installment_total: 1,
          status: 'COMPLETED',
          notes: 'Transferencia desde EUR',
          settled_at: null
        }
      ]
    }

    const fetcher = vi.fn().mockResolvedValue(1.10)
    const result = await reconcileBundleFxRate(bundle, BASE_TIME, fetcher)

    expect(fetcher).toHaveBeenCalledWith('2026-10-10', 'EUR', 'USD')
    // Origen mantiene su débito en moneda nativa
    expect(result.rows[0].amount_account).toBe(-1010)
    expect(result.rows[0].exchange_rate).toBe(1.10)
    // Destino se recalcula con la nueva tasa: (1000 - 10) * 1.10 = 990 * 1.10 = 1089
    expect(result.rows[1].amount_account).toBe(1089)
    expect(result.rows[1].exchange_rate).toBe(1.10)
  })

  it('mantiene la cotización previa de forma segura si la API remota falla', async () => {
    const bundle: LedgerBundle = {
      id: 'tx-fallback',
      type: 'TRANSACTION',
      createdAt: new Date(BASE_TIME).toISOString(),
      rateFetchedAt: new Date(BASE_TIME - 48 * ONE_HOUR).toISOString(),
      rows: [
        {
          id: 'row-1',
          parent_transaction_id: null,
          date: '2026-10-10',
          type: 'OUTCOME',
          amount_original: 100,
          currency_original: 'USD',
          fee_amount: 0,
          exchange_rate: 40.0,
          rate_overridden: false,
          amount_account: 4000,
          currency_account: 'UYU',
          institution_id: 'inst-1',
          account_id: 'acc-1',
          category_id: null,
          person_id: null,
          installment_current: 1,
          installment_total: 1,
          status: 'COMPLETED',
          notes: null,
          settled_at: null
        }
      ]
    }

    const fetcher = vi.fn().mockRejectedValue(new Error('Network offline or rate limit'))
    const result = await reconcileBundleFxRate(bundle, BASE_TIME, fetcher)

    // Se mantiene intacto sin romper la ejecución
    expect(result.rows[0].exchange_rate).toBe(40.0)
    expect(result.rows[0].amount_account).toBe(4000)
  })
})
