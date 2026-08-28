const SYMBOLS: Record<string, string> = {
  AUD: 'A$', EUR: '€', USD: 'US$', UYU: '$UY', NZD: 'NZ$'
}

export function formatMoney(amount: number, currency: string): string {
  const symbol = SYMBOLS[currency] ?? currency + ' '
  const formatted = new Intl.NumberFormat('es-UY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Math.abs(amount))
  const sign = amount < 0 ? '-' : ''
  return `${sign}${symbol} ${formatted}`
}
