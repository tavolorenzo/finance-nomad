import type { TickerQuote } from '@/lib/types'
import { normalizeTicker } from './calculations'

const QUOTE_TTL_MS = 15 * 60 * 1000 // 15 minutos
const quoteMemoryCache = new Map<string, { quote: TickerQuote; expiresAt: number }>()

// Mapa de criptomonedas comunes a IDs de CoinGecko para fallback directo
const COINGECKO_MAP: Record<string, string> = {
  BTC: 'bitcoin',
  'BTC-USD': 'bitcoin',
  ETH: 'ethereum',
  'ETH-USD': 'ethereum',
  XRP: 'ripple',
  'XRP-USD': 'ripple',
  SOL: 'solana',
  'SOL-USD': 'solana',
  ADA: 'cardano',
  'ADA-USD': 'cardano',
  BNB: 'binancecoin',
  'BNB-USD': 'binancecoin',
  DOGE: 'dogecoin',
  'DOGE-USD': 'dogecoin',
  DOT: 'polkadot',
  'DOT-USD': 'polkadot',
  MATIC: 'matic-network',
  AVAX: 'avalanche-2',
  USDT: 'tether',
  USDC: 'usd-coin'
}

/**
 * Intenta obtener cotización desde Yahoo Finance v8 chart API (pública, sin API key).
 */
async function fetchYahooQuote(rawTicker: string): Promise<TickerQuote | null> {
  const ticker = normalizeTicker(rawTicker)
  // Si es una cripto conocida escrita sin par (ej. BTC o XRP), en Yahoo cotiza como BTC-USD
  const yahooSymbol =
    COINGECKO_MAP[ticker] && !ticker.includes('-') ? `${ticker}-USD` : ticker

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    yahooSymbol
  )}?interval=1d&range=2d`

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)'
      },
      next: { revalidate: 900 }
    })

    if (!res.ok) return null
    const data = await res.json()
    const meta = data?.chart?.result?.[0]?.meta
    if (!meta || typeof meta.regularMarketPrice !== 'number') return null

    const price = Number(meta.regularMarketPrice)
    const prevClose = Number(meta.chartPreviousClose || meta.previousClose || price)
    const changePercent =
      prevClose > 0 ? Math.round(((price - prevClose) / prevClose) * 10000) / 100 : 0

    return {
      ticker,
      price,
      currency: (meta.currency || 'USD').toUpperCase(),
      changePercent,
      name: meta.shortName || meta.longName || ticker,
      source: 'yahoo',
      updatedAt: new Date().toISOString()
    }
  } catch {
    return null
  }
}

/**
 * Fallback público desde CoinGecko para criptomonedas comunes.
 */
async function fetchCoinGeckoQuote(rawTicker: string): Promise<TickerQuote | null> {
  const ticker = normalizeTicker(rawTicker)
  const geckoId = COINGECKO_MAP[ticker]
  if (!geckoId) return null

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
    geckoId
  )}&vs_currencies=usd&include_24hr_change=true`

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 900 }
    })
    if (!res.ok) return null
    const data = await res.json()
    const item = data?.[geckoId]
    if (!item || typeof item.usd !== 'number') return null

    return {
      ticker,
      price: Number(item.usd),
      currency: 'USD',
      changePercent:
        typeof item.usd_24h_change === 'number'
          ? Math.round(item.usd_24h_change * 100) / 100
          : undefined,
      source: 'coingecko',
      updatedAt: new Date().toISOString()
    }
  } catch {
    return null
  }
}

/**
 * Obtiene la cotización de un ticker con caché en memoria (15 min) y cadena de fallbacks.
 */
export async function getTickerQuote(rawTicker: string): Promise<TickerQuote | null> {
  const ticker = normalizeTicker(rawTicker)
  if (!ticker) return null

  const now = Date.now()
  const cached = quoteMemoryCache.get(ticker)
  if (cached && cached.expiresAt > now) {
    return cached.quote
  }

  // 1. Intentar Yahoo Finance (soporta acciones, ETFs, CEDEARs, cripto)
  let quote = await fetchYahooQuote(ticker)

  // 2. Fallback CoinGecko si es cripto
  if (!quote && COINGECKO_MAP[ticker]) {
    quote = await fetchCoinGeckoQuote(ticker)
  }

  if (quote) {
    quoteMemoryCache.set(ticker, { quote, expiresAt: now + QUOTE_TTL_MS })
  }

  return quote
}

/**
 * Resuelve múltiples tickers en paralelo de forma segura (nunca lanza excepción).
 */
export async function getMultipleTickerQuotes(
  tickers: string[]
): Promise<Record<string, TickerQuote>> {
  const unique = Array.from(new Set(tickers.map(normalizeTicker).filter(Boolean)))
  if (unique.length === 0) return {}

  const results = await Promise.all(
    unique.map(async (t) => {
      const q = await getTickerQuote(t)
      return [t, q] as const
    })
  )

  const map: Record<string, TickerQuote> = {}
  for (const [ticker, quote] of results) {
    if (quote) {
      map[ticker] = quote
    }
  }
  return map
}

