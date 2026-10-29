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
}

export interface ParseStatementOptions {
  defaultCurrency?: string
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
      const reg = new RegExp(`\\b${kw}\\b`, 'i')
      return reg.test(normalized) || normalized.includes(kw)
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
 */
export function parseDate(rawDate: string, referenceYear?: number): string | null {
  const curYear = referenceYear || new Date().getFullYear()
  const trimmed = rawDate.trim()

  // YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  if (isoMatch) {
    const [, y, m, d] = isoMatch
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // DD/MM/YYYY o DD-MM-YYYY
  const fullMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
  if (fullMatch) {
    const [, d, m, y] = fullMatch
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // DD/MM o DD-MM
  const shortMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})$/)
  if (shortMatch) {
    const [, d, m] = shortMatch
    return `${curYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  return null
}

/**
 * Extrae cuota actual y cuotas totales de un string
 * Soporta: "C.04/12", "C 4/12", "CUOTA 4 DE 12", "CUOTA 04/12", "04/12"
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

  // Patrón simple XX/YY cuando no parece una fecha
  const slashMatch = text.match(/\b(\d{1,2})\/(\d{1,2})\b/)
  if (slashMatch) {
    const current = parseInt(slashMatch[1], 10)
    const total = parseInt(slashMatch[2], 10)
    // Descartar fechas como 12/10 o 25/12 donde total > 12 o mes común
    if (current > 0 && total >= current && total <= 48 && (total > 12 || current <= total)) {
      // Podría ser cuota
      return { current, total }
    }
  }

  return null
}

/**
 * Parsea un texto con múltiples líneas de resumen de tarjeta de crédito
 */
export function parseCreditCardStatement(
  text: string,
  options: ParseStatementOptions = {}
): ParsedCardMovement[] {
  const {
    defaultCurrency = 'ARS',
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

    // 1. Detectar divisa explícita
    let currency = defaultCurrency
    if (/\b(USD|U\$S|US\$)\b/i.test(remaining)) {
      currency = 'USD'
      remaining = remaining.replace(/\b(USD|U\$S|US\$)\b/gi, ' ')
    } else if (/\b(EUR|€)\b/i.test(remaining)) {
      currency = 'EUR'
      remaining = remaining.replace(/\b(EUR|€)\b/gi, ' ')
    } else if (/\b(ARS|\$)\b/i.test(remaining)) {
      currency = defaultCurrency === 'USD' ? 'USD' : 'ARS'
      remaining = remaining.replace(/\b(ARS|\$)\b/gi, ' ')
    }

    // 2. Detectar Cuotas
    let installmentCurrent = 1
    let installmentTotal = 1
    const inst = parseInstallment(remaining)
    if (inst) {
      installmentCurrent = inst.current
      installmentTotal = inst.total
      // Remover el token de cuota del texto para limpiar la descripción
      remaining = remaining.replace(/(?:C\.?|CUOTA)\s*\d{1,2}\s*(?:\/|DE)\s*\d{1,2}/gi, ' ')
    }

    // 3. Detectar Fecha (al inicio o en alguna posición)
    let parsedDate = defaultDate
    const dateMatch = remaining.match(/(\d{1,4}[-/]\d{1,2}[-/]\d{1,4}|\d{1,2}[-/]\d{1,2})/)
    if (dateMatch) {
      const d = parseDate(dateMatch[0], referenceYear)
      if (d) {
        parsedDate = d
        remaining = remaining.replace(dateMatch[0], ' ')
      }
    }

    // 4. Detectar Monto (buscar el último token numérico que parezca importe)
    const amountTokens = remaining.match(/[\d.,]+/g)
    let amount: number | null = null

    if (amountTokens && amountTokens.length > 0) {
      // Elegir el último token numérico válido (suele ser el importe en resúmenes)
      for (let i = amountTokens.length - 1; i >= 0; i--) {
        const candidate = parseAmount(amountTokens[i])
        if (candidate !== null && candidate > 0) {
          amount = candidate
          // Remover este token numérico exacto de remaining
          const idx = remaining.lastIndexOf(amountTokens[i])
          if (idx !== -1) {
            remaining = remaining.slice(0, idx) + ' ' + remaining.slice(idx + amountTokens[i].length)
          }
          break
        }
      }
    }

    // Si no pudimos determinar un monto válido, descartamos la línea
    if (!amount || amount <= 0) continue

    // 5. Limpiar descripción
    const description = remaining
      .replace(/[^\w\s\sáéíóúÁÉÍÓÚñÑ&.-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || 'Consumo tarjeta'

    // 6. Asignar categoría sugerida
    const catSuggestion = suggestCategory(description, categories)

    // 7. Calidad de parseo (confianza)
    let confidence: 'high' | 'medium' | 'low' = 'high'
    if (parsedDate === defaultDate && !dateMatch) confidence = 'medium'
    if (description === 'Consumo tarjeta') confidence = 'low'

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
      rawLine
    })
  }

  return results
}
