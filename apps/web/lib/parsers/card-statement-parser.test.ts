import { describe, it, expect } from 'vitest'
import {
  parseAmount,
  parseDate,
  parseInstallment,
  suggestCategory,
  parseCreditCardStatement
} from './card-statement-parser'

describe('card-statement-parser', () => {
  describe('parseAmount', () => {
    it('parsea montos rioplatenses con punto de miles y coma decimal', () => {
      expect(parseAmount('14.500,50')).toBe(14500.5)
      expect(parseAmount('$ 1.250,00')).toBe(1250)
      expect(parseAmount('350,25')).toBe(350.25)
    })

    it('parsea montos internacionales con coma de miles y punto decimal', () => {
      expect(parseAmount('14,500.50')).toBe(14500.5)
      expect(parseAmount('USD 1,200.00')).toBe(1200)
      expect(parseAmount('45.99')).toBe(45.99)
    })

    it('maneja valores sin decimales', () => {
      expect(parseAmount('15000')).toBe(15000)
      expect(parseAmount('$2500')).toBe(2500)
    })

    it('retorna null para strings vacíos o sin números', () => {
      expect(parseAmount('')).toBeNull()
      expect(parseAmount('hola')).toBeNull()
    })
  })

  describe('parseDate', () => {
    it('parsea fechas DD/MM/YYYY', () => {
      expect(parseDate('15/10/2026')).toBe('2026-10-15')
      expect(parseDate('01-05-2026')).toBe('2026-05-01')
    })

    it('parsea fechas ISO YYYY-MM-DD', () => {
      expect(parseDate('2026-10-24')).toBe('2026-10-24')
    })

    it('parsea fechas cortas DD/MM con año de referencia', () => {
      expect(parseDate('12/10', 2026)).toBe('2026-10-12')
      expect(parseDate('04/07', 2026)).toBe('2026-07-04')
    })

    it('retorna null para formatos inválidos', () => {
      expect(parseDate('invalido')).toBeNull()
    })
  })

  describe('parseInstallment', () => {
    it('detecta patrones tipo C.04/12 o C 02/06', () => {
      expect(parseInstallment('C.04/12')).toEqual({ current: 4, total: 12 })
      expect(parseInstallment('C. 3/6')).toEqual({ current: 3, total: 6 })
      expect(parseInstallment('C 01/03')).toEqual({ current: 1, total: 3 })
    })

    it('detecta patrones tipo CUOTA 4 DE 12 o CUOTA 02/06', () => {
      expect(parseInstallment('CUOTA 4 DE 12')).toEqual({ current: 4, total: 12 })
      expect(parseInstallment('CUOTA 02/06')).toEqual({ current: 2, total: 6 })
    })

    it('retorna null si no contiene cuotas', () => {
      expect(parseInstallment('SUPERMERCADO DIA')).toBeNull()
    })
  })

  describe('suggestCategory', () => {
    const mockCategories = [
      { id: 'cat-1', name: 'Supermercado' },
      { id: 'cat-2', name: 'Transporte' },
      { id: 'cat-3', name: 'Servicios & Suscripciones' },
      { id: 'cat-4', name: 'Salidas & Café' }
    ]

    it('sugiere Supermercado para comercios afines', () => {
      const res = suggestCategory('COTO SUCURSAL 120', mockCategories)
      expect(res.id).toBe('cat-1')
      expect(res.name).toBe('Supermercado')
    })

    it('sugiere Transporte para combustibles y viajes cortos', () => {
      const res = suggestCategory('YPF OPESSA', mockCategories)
      expect(res.id).toBe('cat-2')
      const res2 = suggestCategory('UBER PENDING RIDE', mockCategories)
      expect(res2.id).toBe('cat-2')
    })

    it('sugiere Servicios para streaming', () => {
      const res = suggestCategory('NETFLIX.COM', mockCategories)
      expect(res.id).toBe('cat-3')
    })

    it('retorna null si no coincide con ninguna palabra clave', () => {
      const res = suggestCategory('COMPRA X DESCONOCIDA', mockCategories)
      expect(res.id).toBeNull()
    })
  })

  describe('parseCreditCardStatement', () => {
    const mockCategories = [
      { id: 'cat-super', name: 'Supermercado' },
      { id: 'cat-trans', name: 'Transporte' },
      { id: 'cat-serv', name: 'Servicios & Suscripciones' }
    ]
    const mockPeople = [
      { id: 'p-personal', name: 'Personal' },
      { id: 'p-facu', name: 'Facundo' }
    ]

    it('procesa múltiples líneas de resumen correctamente', () => {
      const statement = `
        12/10/2026 COTO SUC 123 $ 14.500,00
        15/10/2026 FRAVEGA S.A. C.04/12 $ 42.000,00
        18/10/2026 UBER PENDING $ 3.420,00
        20/10/2026 NETFLIX USD 10.99
      `

      const results = parseCreditCardStatement(statement, {
        defaultCurrency: 'ARS',
        categories: mockCategories,
        people: mockPeople,
        referenceYear: 2026
      })

      expect(results).toHaveLength(4)

      // Línea 1: Coto
      expect(results[0].date).toBe('2026-10-12')
      expect(results[0].description).toContain('COTO SUC 123')
      expect(results[0].amount).toBe(14500)
      expect(results[0].installmentCurrent).toBe(1)
      expect(results[0].installmentTotal).toBe(1)
      expect(results[0].categoryId).toBe('cat-super')
      expect(results[0].personId).toBe('p-personal')

      // Línea 2: Frávega en cuotas
      expect(results[1].date).toBe('2026-10-15')
      expect(results[1].description).toContain('FRAVEGA')
      expect(results[1].amount).toBe(42000)
      expect(results[1].installmentCurrent).toBe(4)
      expect(results[1].installmentTotal).toBe(12)

      // Línea 3: Uber
      expect(results[2].date).toBe('2026-10-18')
      expect(results[2].amount).toBe(3420)
      expect(results[2].categoryId).toBe('cat-trans')

      // Línea 4: Netflix en USD
      expect(results[3].date).toBe('2026-10-20')
      expect(results[3].amount).toBe(10.99)
      expect(results[3].currency).toBe('USD')
      expect(results[3].categoryId).toBe('cat-serv')
    })

    it('ignora líneas vacías o encabezados sin montos', () => {
      const statement = `
        RESUMEN DE CUENTA VISA
        TITULAR: JUAN PEREZ
        FECHA DE CIERRE: 22/10/2026
        12/10/2026 SUPERMERCADO DIA $ 5.200,00
      `

      const results = parseCreditCardStatement(statement, {
        referenceYear: 2026
      })

      expect(results).toHaveLength(1)
      expect(results[0].amount).toBe(5200)
    })

    it('respeta defaultPersonId si se especifica explícitamente', () => {
      const statement = `12/10/2026 COTO $ 15.000,00`
      const results = parseCreditCardStatement(statement, {
        referenceYear: 2026,
        defaultPersonId: 'p-facu',
        people: mockPeople
      })

      expect(results[0].personId).toBe('p-facu')
    })
  })
})
