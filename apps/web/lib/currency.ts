import { getCurrencyInfo } from './currency-catalog'

const SYMBOLS: Record<string, string> = {
  AUD: 'A$',
  EUR: '€',
  USD: 'US$',
  UYU: '$UY',
  NZD: 'NZ$',
  ARS: '$',
  BRL: 'R$',
  CLP: '$',
  MXN: '$',
  COP: '$',
  PEN: 'S/',
  GBP: '£',
  CAD: 'C$',
  CHF: 'CHF',
  JPY: '¥'
}

export function formatMoney(amount: number, currency: string, customSymbol?: string): string {
  const symbol = customSymbol ?? SYMBOLS[currency] ?? getCurrencyInfo(currency)?.symbol ?? currency + ' '
  const formatted = new Intl.NumberFormat('es-UY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Math.abs(amount))
  const sign = amount < 0 ? '-' : ''
  return `${sign}${symbol} ${formatted}`
}
