import type {
  PortfolioAssetType,
  PortfolioPosition,
  PortfolioQuoteMode,
  PortfolioTransaction,
  TickerQuote
} from '@/lib/types'

export type CurrencyConverter = (amount: number, fromCurrency: string, toCurrency: string) => number

export interface PortfolioSummary {
  positions: PortfolioPosition[]
  closedPositions: PortfolioPosition[]
  totalMarketValueInDisplay: number
  totalInvestedInDisplay: number
  totalUnrealizedPnLInDisplay: number
  totalUnrealizedPnLPct: number
  totalRealizedPnLInDisplay: number
  allocationByType: {
    assetType: PortfolioAssetType
    label: string
    marketValueInDisplay: number
    percentage: number
  }[]
}

export const ASSET_TYPE_LABELS: Record<PortfolioAssetType, string> = {
  STOCK: 'Acciones / CEDEARs',
  ETF: 'ETFs / Fondos',
  CRYPTO: 'Criptomonedas',
  FIXED_INCOME: 'Renta Fija / Bonos',
  LOCAL: 'Instrumento Local / Manual'
}

export function normalizeTicker(ticker: string): string {
  return (ticker || '').trim().toUpperCase()
}

/**
 * Calcula las posiciones consolidadas del portafolio a partir del historial de transacciones
 * usando el método de Costo Promedio Ponderado (PPC / WAC).
 */
export function computePortfolioSummary({
  transactions,
  quotes = {},
  displayCurrency,
  convert
}: {
  transactions: PortfolioTransaction[]
  quotes?: Record<string, TickerQuote>
  displayCurrency: string
  convert: CurrencyConverter
}): PortfolioSummary {
  // Agrupar transacciones por ticker normalizado
  const grouped = new Map<string, PortfolioTransaction[]>()

  for (const tx of transactions) {
    const key = normalizeTicker(tx.ticker)
    if (!key) continue
    const list = grouped.get(key) ?? []
    list.push(tx)
    grouped.set(key, list)
  }

  const activePositions: PortfolioPosition[] = []
  const closedPositions: PortfolioPosition[] = []

  for (const [ticker, txList] of grouped.entries()) {
    // Ordenar cronológicamente; en misma fecha procesar BUY antes que SELL
    const sorted = [...txList].sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date)
      if (dateCmp !== 0) return dateCmp
      if (a.type !== b.type) return a.type === 'BUY' ? -1 : 1
      return (a.created_at ?? '').localeCompare(b.created_at ?? '')
    })

    let units = 0
    let averageCost = 0
    let totalCostBasis = 0
    let realizedPnL = 0

    // Tomamos los metadatos más recientes del activo
    const latestTx = sorted[sorted.length - 1]
    let assetName = latestTx.asset_name || ticker
    let assetType: PortfolioAssetType = latestTx.asset_type || 'STOCK'
    let currency = (latestTx.currency || displayCurrency).toUpperCase()
    let quoteMode: PortfolioQuoteMode = latestTx.quote_mode || 'auto'
    let latestManualPrice: number | null = null
    let lastTradePrice = Number(latestTx.price_per_unit) || 0

    for (const tx of sorted) {
      const txUnits = Math.max(0, Number(tx.units) || 0)
      const txPrice = Math.max(0, Number(tx.price_per_unit) || 0)
      const txFee = Math.max(0, Number(tx.fee_amount) || 0)

      if (tx.asset_name && tx.asset_name.trim()) {
        assetName = tx.asset_name.trim()
      }
      if (tx.asset_type) {
        assetType = tx.asset_type
      }
      if (tx.currency) {
        currency = tx.currency.toUpperCase()
      }
      if (tx.quote_mode) {
        quoteMode = tx.quote_mode
      }
      if (tx.manual_price != null && Number(tx.manual_price) > 0) {
        latestManualPrice = Number(tx.manual_price)
      }
      if (txPrice > 0) {
        lastTradePrice = txPrice
      }

      if (tx.type === 'BUY') {
        const buyCost = txUnits * txPrice + txFee
        totalCostBasis += buyCost
        units += txUnits
        averageCost = units > 0 ? totalCostBasis / units : 0
      } else if (tx.type === 'SELL') {
        const sellProceeds = txUnits * txPrice - txFee
        const effectiveSoldUnits = Math.min(txUnits, units)
        const costOfSold = effectiveSoldUnits * averageCost
        realizedPnL += sellProceeds - costOfSold
        units = Math.max(0, units - effectiveSoldUnits)
        totalCostBasis = units * averageCost
        if (units <= 1e-8) {
          units = 0
          totalCostBasis = 0
          averageCost = 0
        }
      }
    }

    // Resolver precio actual de mercado
    const quote = quotes[ticker]
    let currentPrice = lastTradePrice
    let quoteSource: TickerQuote['source'] = 'fallback'
    let quoteUpdatedAt: string | undefined
    let dayChangePct: number | undefined

    if (quoteMode === 'manual' && latestManualPrice != null && latestManualPrice > 0) {
      currentPrice = latestManualPrice
      quoteSource = 'manual'
    } else if (quote && quote.price > 0) {
      // Si la cotización viene en otra moneda distinta a la nativa de la posición, convertirla
      const quoteCurr = (quote.currency || currency).toUpperCase()
      currentPrice =
        quoteCurr === currency ? quote.price : convert(quote.price, quoteCurr, currency)
      quoteSource = quote.source
      quoteUpdatedAt = quote.updatedAt
      dayChangePct = quote.changePercent
      if ((!assetName || assetName === ticker) && quote.name) {
        assetName = quote.name
      }
    } else if (latestManualPrice != null && latestManualPrice > 0) {
      currentPrice = latestManualPrice
      quoteSource = 'manual'
    }

    const roundedUnits = Math.round(units * 1000000) / 1000000
    const investedCapital = Math.round(totalCostBasis * 100) / 100
    const marketValue = Math.round(roundedUnits * currentPrice * 100) / 100
    const unrealizedPnL = Math.round((marketValue - investedCapital) * 100) / 100
    const unrealizedPnLPct =
      investedCapital > 0
        ? Math.round(((marketValue - investedCapital) / investedCapital) * 10000) / 100
        : 0
    const roundedRealized = Math.round(realizedPnL * 100) / 100

    const marketValueInDisplay =
      Math.round(convert(marketValue, currency, displayCurrency) * 100) / 100
    const investedInDisplay =
      Math.round(convert(investedCapital, currency, displayCurrency) * 100) / 100
    const unrealizedPnLInDisplay =
      Math.round((marketValueInDisplay - investedInDisplay) * 100) / 100
    const realizedPnLInDisplay =
      Math.round(convert(roundedRealized, currency, displayCurrency) * 100) / 100

    const position: PortfolioPosition = {
      ticker,
      assetName,
      assetType,
      currency,
      quoteMode,
      units: roundedUnits,
      averageCost: Math.round(averageCost * 10000) / 10000,
      investedCapital,
      currentPrice: Math.round(currentPrice * 10000) / 10000,
      marketValue,
      unrealizedPnL,
      unrealizedPnLPct,
      realizedPnL: roundedRealized,
      marketValueInDisplay,
      investedInDisplay,
      unrealizedPnLInDisplay,
      realizedPnLInDisplay,
      quoteSource,
      quoteUpdatedAt,
      dayChangePct
    }

    if (roundedUnits > 0) {
      activePositions.push(position)
    } else {
      closedPositions.push(position)
    }
  }

  // Ordenar posiciones activas de mayor a menor valor de mercado en moneda global
  activePositions.sort((a, b) => b.marketValueInDisplay - a.marketValueInDisplay)

  const totalMarketValueInDisplay =
    Math.round(activePositions.reduce((acc, p) => acc + p.marketValueInDisplay, 0) * 100) / 100
  const totalInvestedInDisplay =
    Math.round(activePositions.reduce((acc, p) => acc + p.investedInDisplay, 0) * 100) / 100
  const totalUnrealizedPnLInDisplay =
    Math.round((totalMarketValueInDisplay - totalInvestedInDisplay) * 100) / 100
  const totalUnrealizedPnLPct =
    totalInvestedInDisplay > 0
      ? Math.round(
          ((totalMarketValueInDisplay - totalInvestedInDisplay) / totalInvestedInDisplay) * 10000
        ) / 100
      : 0

  const totalRealizedPnLInDisplay =
    Math.round(
      [...activePositions, ...closedPositions].reduce(
        (acc, p) => acc + p.realizedPnLInDisplay,
        0
      ) * 100
    ) / 100

  // Calcular distribución por tipo de activo
  const byTypeMap = new Map<PortfolioAssetType, number>()
  for (const pos of activePositions) {
    byTypeMap.set(pos.assetType, (byTypeMap.get(pos.assetType) ?? 0) + pos.marketValueInDisplay)
  }

  const allocationByType = Array.from(byTypeMap.entries())
    .map(([assetType, val]) => ({
      assetType,
      label: ASSET_TYPE_LABELS[assetType] || assetType,
      marketValueInDisplay: Math.round(val * 100) / 100,
      percentage:
        totalMarketValueInDisplay > 0
          ? Math.round((val / totalMarketValueInDisplay) * 1000) / 10
          : 0
    }))
    .sort((a, b) => b.marketValueInDisplay - a.marketValueInDisplay)

  return {
    positions: activePositions,
    closedPositions,
    totalMarketValueInDisplay,
    totalInvestedInDisplay,
    totalUnrealizedPnLInDisplay,
    totalUnrealizedPnLPct,
    totalRealizedPnLInDisplay,
    allocationByType
  }
}

