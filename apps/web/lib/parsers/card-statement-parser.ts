import type { AccountType } from '@/lib/types'

export interface ParsedCardMovement {
  id: string
  date: string // YYYY-MM-DD
  description: string
  amount: number
  currency: string
  installmentCurrent: number
  installmentTotal: number
  categoryId: string | null
  personId: string | null
  confidence: 'high' | 'medium' | 'low'
  rawLine: string
  isRefund?: boolean
  type?: 'OUTCOME' | 'INCOME'
  cardDigits?: string | null
}

export interface ParseStatementOptions {
  accountType?: AccountType
  defaultCurrency?: string
  forceCurrency?: string | null
  defaultDate?: string
  defaultPersonId?: string | null
  categories?: { id: string; name: string }[]
  people?: { id: string; name: string }[]
  referenceYear?: number
}

// Diccionario heurístico de palabras clave para sugerir categorías
export const KEYWORD_CATEGORY_MAP: Record<string, string[]> = {
  'Supermercado': [
    'coto', 'carrefour', 'dia', 'disco', 'jumbo', 'vea', 'chango', 'vital', 'makro',
    'supermercado', 'super', 'hiper', 'almacen', 'mercado', 'mercadito', 'autoservicio',
    'walmart', 'target', 'mercadona', 'lidl', 'aldi', 'auchan', 'tienda inglesa', 'tata'
  ],
  'Salidas & Café': [
    'starbucks', 'cafe', 'cafeteria', 'coffee', 'bar', 'resto', 'restaurante', 'birreria',
    'mcdonald', 'burger', 'mostaza', 'subway', 'pizzeria', 'heladeria', 'freddo', 'luccianos',
    'rappi', 'pedidosya', 'ubereats', 'delivery', 'cerveza', 'tragos', 'parrilla'
  ],
  'Transporte': [
    'uber', 'cabify', 'didi', 'taxi', 'subte', 'metro', 'tren', 'peaje', 'autopista',
    'ypf', 'shell', 'axion', 'puma', 'combustible', 'nafta', 'estacion de servicio',
    'parking', 'estacionamiento', 'sube', 'colectivo', 'bus'
  ],
  'Vuelos & Viajes': [
    'aerolineas', 'latam', 'flybondi', 'jetsmart', 'iberia', 'air europa', 'ryanair',
    'despegar', 'booking', 'airbnb', 'hotel', 'hostel', 'vuelo', 'aeropuerto', 'assist card'
  ],
  'Servicios & Suscripciones': [
    'netflix', 'spotify', 'apple', 'itunes', 'google', 'youtube', 'prime video', 'disney',
    'hbo', 'max', 'chatgpt', 'openai', 'github', 'amazon prime', 'flow', 'telecentro',
    'fibertel', 'claro', 'personal', 'movistar', 'edenor', 'edesur', 'metrogas', 'aysa'
  ],
  'Alquiler & Vivienda': [
    'alquiler', 'expensas', 'inmobiliaria', 'easy', 'sodimac', 'ikea', 'ferreteria', 'pintureria'
  ]
}

/**
 * Sugiere el nombre de una categoría o su ID a partir del texto de la descripción.
 */
export function suggestCategory(
  description: string,
  categories?: { id: string; name: string }[]
): { id: string | null; name: string | null } {
  const normalized = description
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  for (const [catName, keywords] of Object.entries(KEYWORD_CATEGORY_MAP)) {
    const hasKeyword = keywords.some((kw) => {
      // Si la palabra clave es corta (<= 5 caracteres), requerir palabra completa (ej. 'metro' vs 'metrogas')
      // Si es más larga, permitir prefijo con límite inicial (ej. 'supermercado' -> 'supermercados')
      if (kw.length <= 5) {
        const reg = new RegExp(`(?:^|\\W)${kw}(?:\\W|$)`, 'i')
        return reg.test(normalized)
      }
      const reg = new RegExp(`(?:^|\\W)${kw}`, 'i')
      return reg.test(normalized)
    })

    if (hasKeyword) {
      if (categories && categories.length > 0) {
        const found = categories.find((c) =>
          c.name.toLowerCase().includes(catName.toLowerCase()) ||
          catName.toLowerCase().includes(c.name.toLowerCase())
        )
        if (found) return { id: found.id, name: found.name }
      }
      return { id: null, name: catName }
    }
  }

  return { id: null, name: null }
}

/**
 * Parsea un monto en formato rioplatense o internacional
 * Ej: "14.500,50" -> 14500.50, "$ 1.200" -> 1200, "1500.00" -> 1500.00
 */
export function parseAmount(raw: string): number | null {
  if (!raw) return null
  let cleaned = raw.replace(/[^\d.,\-]/g, '').trim()
  if (!cleaned) return null

  const hasComma = cleaned.includes(',')
  const hasDot = cleaned.includes('.')

  if (hasComma && hasDot) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      // Formato latino/europeo: 1.234,56
      cleaned = cleaned.replace(/\./g, '').replace(',', '.')
    } else {
      // Formato anglosajón: 1,234.56
      cleaned = cleaned.replace(/,/g, '')
    }
  } else if (hasComma) {
    // Solo coma: podría ser decimal (12,50) o miles (1,000)
    const parts = cleaned.split(',')
    if (parts[1] && parts[1].length === 2) {
      cleaned = cleaned.replace(',', '.')
    } else if (parts[1] && parts[1].length === 3) {
      cleaned = cleaned.replace(',', '')
    } else {
      cleaned = cleaned.replace(',', '.')
    }
  } else if (hasDot) {
    // Solo punto: podría ser decimal (12.50) o miles (14.500)
    const parts = cleaned.split('.')
    if (parts.length > 2) {
      cleaned = cleaned.replace(/\./g, '')
    } else if (parts[1] && parts[1].length === 3) {
      // 14.500 -> 14500
      cleaned = cleaned.replace('.', '')
    }
  }

  const num = parseFloat(cleaned)
  return isNaN(num) ? null : Math.abs(num)
}

/**
 * Parsea una fecha en texto a formato ISO YYYY-MM-DD
 * Soporta: DD/MM/AA, DD MM AA, DD-MM-AA, DD.MM.AA, DD/MM/AAAA, DD-MM-AAAA, DD.MM.AAAA, DD MM AAAA, YYYY-MM-DD, DD/MM, DD.MM
 */
export function parseDate(rawDate: string, referenceYear?: number): string | null {
  const curYear = referenceYear || new Date().getFullYear()
  const trimmed = rawDate.trim()

  const isValidDayMonth = (dStr: string, mStr: string) => {
    const d = parseInt(dStr, 10)
    const m = parseInt(mStr, 10)
    return d >= 1 && d <= 31 && m >= 1 && m <= 12
  }

  // YYYY-MM-DD o YYYY/MM/DD o YYYY.MM.DD
  const isoMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (isoMatch) {
    const [, y, m, d] = isoMatch
    if (!isValidDayMonth(d, m)) return null
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY o DD MM YYYY (año de 4 dígitos)
  const fullMatch = trimmed.match(/^(\d{1,2})(?:[-/.]|\s+)(\d{1,2})(?:[-/.]|\s+)(\d{4})$/)
  if (fullMatch) {
    const [, d, m, y] = fullMatch
    if (!isValidDayMonth(d, m)) return null
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // DD/MM/AA, DD-MM-AA, DD.MM.AA o DD MM AA (año de 2 dígitos, ej: 10/11/25, 27 08 26, 15-10-26, 15.10.26)
  const twoDigitYearMatch = trimmed.match(/^(\d{1,2})(?:[-/.]|\s+)(\d{1,2})(?:[-/.]|\s+)(\d{2})$/)
  if (twoDigitYearMatch) {
    const [, d, m, y] = twoDigitYearMatch
    if (!isValidDayMonth(d, m)) return null
    return `20${y.padStart(2, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // DD/MM, DD-MM o DD.MM (sin año, usa referenceYear)
  const shortMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})$/)
  if (shortMatch) {
    const [, d, m] = shortMatch
    if (!isValidDayMonth(d, m)) return null
    return `${curYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  return null
}

/**
 * Extrae cuota actual y cuotas totales de un string
 * Soporta: "C.04/12", "C 4/12", "CUOTA 4 DE 12", "CUOTA 04/12", "04/12", "2/ 3", "2 / 3"
 */
export function parseInstallment(text: string): { current: number; total: number } | null {
  // Patrón C.04/12 o C 04/12 o CUOTA 04/12
  const cMatch = text.match(/(?:C\.?|CUOTA)\s*(\d{1,2})\s*(?:\/|DE)\s*(\d{1,2})/i)
  if (cMatch) {
    const current = parseInt(cMatch[1], 10)
    const total = parseInt(cMatch[2], 10)
    if (current > 0 && total >= current && total <= 99) {
      return { current, total }
    }
  }

  // Patrón X/X o X/ X o X / X
  const slashMatch = text.match(/\b(\d{1,2})\s*\/\s*(\d{1,2})\b/)
  if (slashMatch) {
    const current = parseInt(slashMatch[1], 10)
    const total = parseInt(slashMatch[2], 10)
    if (current > 0 && total >= current && total <= 48) {
      return { current, total }
    }
  }

  return null
}

/**
 * Parsea un texto con múltiples líneas de resumen de tarjeta de crédito.
 * Estructura esperada de línea:
 * [Fecha DD/MM/AA | DD MM AA | DD-MM-AA | DD/MM/AAAA] [Nro Tarjeta XXXX opcional] [Descripción] [Pago X/X o X/ X opcional] [Moneda XXX opcional] [Importe (negativo = pago/refund)]
 */
export function parseCreditCardStatement(
  text: string,
  options: ParseStatementOptions = {}
): ParsedCardMovement[] {
  const {
    defaultCurrency = 'ARS',
    forceCurrency = null,
    defaultDate = new Date().toISOString().slice(0, 10),
    categories = [],
    people = [],
    referenceYear = new Date().getFullYear()
  } = options

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  const results: ParsedCardMovement[] = []

  // Default persona 'Personal' si existe en la lista, o la especificada en options
  const defaultPersonId =
    options.defaultPersonId !== undefined
      ? options.defaultPersonId
      : people.find((p) => p.name.trim().toLowerCase() === 'personal')?.id || null

  for (const rawLine of lines) {
    // Ignorar encabezados o líneas sin números
    if (!/\d/.test(rawLine)) continue

    let remaining = rawLine

    // 1. Detectar Fecha al inicio de la línea (o primera fecha válida)
    let parsedDate = defaultDate
    let hadDateMatch = false
    const leadingDateMatch = remaining.match(
      /^(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{1,2}\s+\d{1,2}\s+\d{2,4}|\d{1,2}[-/.]\d{1,2})\b/
    )
    if (leadingDateMatch) {
      const d = parseDate(leadingDateMatch[0], referenceYear)
      if (d) {
        parsedDate = d
        hadDateMatch = true
        remaining = remaining.slice(leadingDateMatch[0].length).trimStart()
      }
    } else {
      const fallbackDateMatch = remaining.match(
        /\b(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{1,2}[-/.]\d{1,2})\b/
      )
      if (fallbackDateMatch) {
        const d = parseDate(fallbackDateMatch[0], referenceYear)
        if (d) {
          parsedDate = d
          hadDateMatch = true
          remaining = remaining.replace(fallbackDateMatch[0], ' ').trimStart()
        }
      }
    }

    // 2. Detectar número de tarjeta opcional (XXXX de 4 dígitos) seguido de la descripción
    let cardDigits: string | null = null
    const cardMatch = remaining.match(/^(\d{4})\s+(?=[A-Za-zÁÉÍÓÚáéíóúÑñ])/)
    if (cardMatch) {
      cardDigits = cardMatch[1]
      remaining = remaining.slice(cardMatch[0].length).trimStart()
    }

    // 3. Detectar divisa explícita (opcional)
    let currency = defaultCurrency
    if (/\b(USD|U\$S|US\$)\b/i.test(remaining)) {
      currency = 'USD'
      remaining = remaining.replace(/\b(USD|U\$S|US\$)\b/gi, ' ')
    } else if (/(\bUYU\b|\$UY\b|\$U\b|\bURU\b)/i.test(remaining)) {
      currency = 'UYU'
      remaining = remaining.replace(/(\bUYU\b|\$UY\b|\$U\b|\bURU\b)/gi, ' ')
    } else if (/\b(EUR|€)\b/i.test(remaining)) {
      currency = 'EUR'
      remaining = remaining.replace(/\b(EUR|€)\b/gi, ' ')
    } else if (/(\bAUD\b|A\$)/i.test(remaining)) {
      currency = 'AUD'
      remaining = remaining.replace(/(\bAUD\b|A\$)/gi, ' ')
    } else if (/(\bNZD\b|NZ\$)/i.test(remaining)) {
      currency = 'NZD'
      remaining = remaining.replace(/(\bNZD\b|NZ\$)/gi, ' ')
    } else if (/(\bARS\b|\$AR\b)/i.test(remaining)) {
      currency = 'ARS'
      remaining = remaining.replace(/(\bARS\b|\$AR\b)/gi, ' ')
    } else if (/\$/.test(remaining)) {
      remaining = remaining.replace(/\$/g, ' ')
    }

    if (forceCurrency) {
      currency = forceCurrency
    }

    // 4. Detectar Pago / Cuotas (X/X o X/ X o C.XX/YY)
    let installmentCurrent = 1
    let installmentTotal = 1
    const inst = parseInstallment(remaining)
    if (inst) {
      installmentCurrent = inst.current
      installmentTotal = inst.total
      if (/(?:C\.?|CUOTA)\s*\d{1,2}\s*(?:\/|DE)\s*\d{1,2}/i.test(remaining)) {
        remaining = remaining.replace(/(?:C\.?|CUOTA)\s*\d{1,2}\s*(?:\/|DE)\s*\d{1,2}/gi, ' ')
      } else {
        remaining = remaining.replace(/\b\d{1,2}\s*\/\s*\d{1,2}\b/, ' ')
      }
    }

    // 5. Detectar Monto al final (y verificar signos +/- o palabras clave)
    const amountTokens = remaining.match(/[\d.,]+/g)
    let amount: number | null = null
    let hasLeadingMinus = false
    let hasTrailingMinus = false
    let hasLeadingPlus = false
    let hasTrailingPlus = false

    if (amountTokens && amountTokens.length > 0) {
      for (let i = amountTokens.length - 1; i >= 0; i--) {
        const token = amountTokens[i]
        const candidate = parseAmount(token)
        if (candidate !== null && candidate > 0) {
          amount = candidate
          const idx = remaining.lastIndexOf(token)
          if (idx !== -1) {
            const before = remaining.slice(0, idx)
            const after = remaining.slice(idx + token.length)
            hasLeadingMinus = /(?:^|\s)-\s*$/.test(before)
            hasTrailingMinus = /^\s*-/.test(after)
            hasLeadingPlus = /(?:^|\s)\+\s*$/.test(before)
            hasTrailingPlus = /^\s*\+/.test(after)

            const cleanBefore = hasLeadingMinus
              ? before.replace(/-\s*$/, ' ')
              : hasLeadingPlus
              ? before.replace(/\+\s*$/, ' ')
              : before
            const cleanAfter = hasTrailingMinus
              ? after.replace(/^\s*-/, ' ')
              : hasTrailingPlus
              ? after.replace(/^\s*\+/, ' ')
              : after
            remaining = cleanBefore + ' ' + cleanAfter
          }
          break
        }
      }
    }

    // Si no pudimos determinar un monto válido, descartamos la línea
    if (!amount || amount <= 0) continue

    const hasMinus = hasLeadingMinus || hasTrailingMinus
    const hasPlus = hasLeadingPlus || hasTrailingPlus

    // Detección heurística de ingresos vs gastos en extractos bancarios / home banking o tarjetas
    const hasIncomeKeyword =
      /(?:^|\b)(?:sueldo|haberes|acreditaci[oó]n|dep[oó]sito|deposito|rendimiento|rendimientos|inter[eé]ses|intereses|reintegro|reintegros|devoluci[oó]n|devolucion|premio|cashback|cobro|transferencia recibida|transf\.?\s*recibida|cr[eé]dito|credito)(?:\b|$)/i.test(
        rawLine
      )
    const hasExpenseKeyword =
      /(?:^|\b)(?:transferencia enviada|transf\.?\s*enviada|d[eé]bito|debito|extracci[oó]n|extraccion|pago|compra)(?:\b|$)/i.test(
        rawLine
      )

    const isBankAccount = options.accountType && options.accountType !== 'credit_card'
    let isRefund = false

    if (isBankAccount) {
      // En cuentas corrientes / cajas de ahorro / billeteras:
      // - Monto con signo menos o palabras explícitas de débito -> Gasto (OUTCOME, isRefund = false)
      // - Monto con signo más o palabras de ingreso -> Ingreso (INCOME, isRefund = true)
      // - Si no tiene signo, evaluamos palabras de ingreso vs gasto
      if (hasMinus || hasExpenseKeyword) {
        isRefund = false
      } else if (hasPlus || hasIncomeKeyword) {
        isRefund = true
      } else {
        isRefund = false
      }
    } else {
      // En tarjetas de crédito:
      // - Todo consumo es OUTCOME por defecto.
      // - Monto negativo o con palabra de reintegro/pago se considera Refund / Pago (INCOME, isRefund = true).
      isRefund = hasMinus || hasPlus || hasIncomeKeyword
    }

    // 6. Limpiar descripción
    const fallbackDefaultDesc = isBankAccount
      ? isRefund
        ? 'Ingreso de cuenta'
        : 'Movimiento de cuenta'
      : 'Consumo tarjeta'

    const description =
      remaining
        .replace(/[^\w\s\sáéíóúÁÉÍÓÚñÑ&.-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim() || fallbackDefaultDesc

    // 7. Asignar categoría sugerida
    const catSuggestion = suggestCategory(description, categories)

    // 8. Calidad de parseo (confianza)
    let confidence: 'high' | 'medium' | 'low' = 'high'
    if (parsedDate === defaultDate && !hadDateMatch) confidence = 'medium'
    if (description === fallbackDefaultDesc) confidence = 'low'

    results.push({
      id: crypto.randomUUID ? crypto.randomUUID() : `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: parsedDate,
      description,
      amount,
      currency,
      installmentCurrent,
      installmentTotal,
      categoryId: catSuggestion.id,
      personId: defaultPersonId,
      confidence,
      rawLine,
      isRefund,
      type: isRefund ? 'INCOME' : 'OUTCOME',
      cardDigits
    })
  }

  return results
}
