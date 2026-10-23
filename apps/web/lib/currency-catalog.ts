import type { ActiveCurrency } from './types'

export interface CurrencyCatalogItem {
  code: string
  name: string
  symbol: string
  flag: string
  popular?: boolean
}

export const CURRENCY_CATALOG: CurrencyCatalogItem[] = [
  // Populares en la app y nómades
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', popular: true },
  { code: 'USD', name: 'Dólar estadounidense', symbol: 'US$', flag: '🇺🇸', popular: true },
  { code: 'ARS', name: 'Peso argentino', symbol: '$', flag: '🇦🇷', popular: true },
  { code: 'UYU', name: 'Peso uruguayo', symbol: '$UY', flag: '🇺🇾', popular: true },
  { code: 'AUD', name: 'Dólar australiano', symbol: 'A$', flag: '🇦🇺', popular: true },
  { code: 'NZD', name: 'Dólar neozelandés', symbol: 'NZ$', flag: '🇳🇿', popular: true },
  { code: 'GBP', name: 'Libra esterlina', symbol: '£', flag: '🇬🇧', popular: true },
  { code: 'BRL', name: 'Real brasileño', symbol: 'R$', flag: '🇧🇷', popular: true },
  { code: 'CLP', name: 'Peso chileno', symbol: '$', flag: '🇨🇱', popular: true },
  { code: 'MXN', name: 'Peso mexicano', symbol: '$', flag: '🇲🇽', popular: true },
  { code: 'COP', name: 'Peso colombiano', symbol: '$', flag: '🇨🇴', popular: true },
  { code: 'PEN', name: 'Sol peruano', symbol: 'S/', flag: '🇵🇪', popular: true },

  // Otras divisas internacionales frecuentes
  { code: 'CAD', name: 'Dólar canadiense', symbol: 'C$', flag: '🇨🇦' },
  { code: 'CHF', name: 'Franco suizo', symbol: 'CHF', flag: '🇨🇭' },
  { code: 'JPY', name: 'Yen japonés', symbol: '¥', flag: '🇯🇵' },
  { code: 'CRC', name: 'Colón costarricense', symbol: '₡', flag: '🇨🇷' },
  { code: 'DOP', name: 'Peso dominicano', symbol: 'RD$', flag: '🇩🇴' },
  { code: 'PYG', name: 'Guaraní paraguayo', symbol: '₲', flag: '🇵🇾' },
  { code: 'BOB', name: 'Boliviano', symbol: 'Bs', flag: '🇧🇴' },
  { code: 'SEK', name: 'Corona sueca', symbol: 'kr', flag: '🇸🇪' },
  { code: 'NOK', name: 'Corona noruega', symbol: 'kr', flag: '🇳🇴' },
  { code: 'DKK', name: 'Corona danesa', symbol: 'kr', flag: '🇩🇰' },
  { code: 'THB', name: 'Baht tailandés', symbol: '฿', flag: '🇹🇭' },
  { code: 'IDR', name: 'Rupia indonesia', symbol: 'Rp', flag: '🇮🇩' },
  { code: 'INR', name: 'Rupia india', symbol: '₹', flag: '🇮🇳' },
  { code: 'SGD', name: 'Dólar de Singapur', symbol: 'S$', flag: '🇸🇬' },
  { code: 'ZAR', name: 'Rand sudafricano', symbol: 'R', flag: '🇿🇦' },
  { code: 'TRY', name: 'Lira turca', symbol: '₺', flag: '🇹🇷' },
  { code: 'AED', name: 'Dírham de EAU', symbol: 'د.إ', flag: '🇦🇪' }
]

export const DEFAULT_ACTIVE_CURRENCIES: ActiveCurrency[] = [
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', rate_mode: 'auto' },
  { code: 'USD', name: 'Dólar estadounidense', symbol: 'US$', flag: '🇺🇸', rate_mode: 'auto' },
  { code: 'ARS', name: 'Peso argentino', symbol: '$', flag: '🇦🇷', rate_mode: 'auto' },
  { code: 'AUD', name: 'Dólar australiano', symbol: 'A$', flag: '🇦🇺', rate_mode: 'auto' },
  { code: 'UYU', name: 'Peso uruguayo', symbol: '$UY', flag: '🇺🇾', rate_mode: 'auto' },
  { code: 'NZD', name: 'Dólar neozelandés', symbol: 'NZ$', flag: '🇳🇿', rate_mode: 'auto' }
]

export function getCurrencyInfo(code: string): CurrencyCatalogItem | undefined {
  const upper = code.trim().toUpperCase()
  return CURRENCY_CATALOG.find((c) => c.code === upper)
}

export function searchCurrencies(query: string): CurrencyCatalogItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return CURRENCY_CATALOG
  return CURRENCY_CATALOG.filter(
    (c) =>
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.symbol.toLowerCase().includes(q)
  )
}
