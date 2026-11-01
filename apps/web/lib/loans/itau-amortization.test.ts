import { describe, it, expect } from 'vitest'
import {
  calculateMonthlyRateFromTea,
  calculatePureMonthlyPayment,
  calculateDueDate,
  calculateItauSchedule
} from './itau-amortization'

describe('itau-amortization', () => {
  describe('calculateMonthlyRateFromTea', () => {
    it('retorna 0 si la TEA es 0 o negativa', () => {
      expect(calculateMonthlyRateFromTea(0)).toBe(0)
      expect(calculateMonthlyRateFromTea(-0.1)).toBe(0)
    })

    it('convierte TEA a tasa efectiva mensual con fórmula exponencial', () => {
      // Para TEA = 28.5% (0.285) -> (1.285)^(1/12) - 1 ≈ 0.021116 (2.1116% mensual)
      const monthlyRate = calculateMonthlyRateFromTea(0.285)
      expect(monthlyRate).toBeCloseTo(0.021116, 5)
    })
  })

  describe('calculatePureMonthlyPayment', () => {
    it('divide linealmente si no hay intereses', () => {
      expect(calculatePureMonthlyPayment(1200, 0, 12)).toBe(100)
      expect(calculatePureMonthlyPayment(1000, 0, 3)).toBe(333.33)
    })

    it('calcula la cuota nivelada francesa con intereses', () => {
      const rate = calculateMonthlyRateFromTea(0.285) // ~2.1074%
      const cuota = calculatePureMonthlyPayment(10000, rate, 12)
      // Con capital 10000, i ≈ 0.021074, n = 12 -> Cuota aprox ~951.64
      expect(cuota).toBeGreaterThan(900)
      expect(cuota).toBeLessThan(1000)
    })

    it('retorna 0 para entradas inválidas', () => {
      expect(calculatePureMonthlyPayment(0, 0.02, 12)).toBe(0)
      expect(calculatePureMonthlyPayment(1000, 0.02, 0)).toBe(0)
    })
  })

  describe('calculateDueDate', () => {
    it('calcula el vencimiento en meses consecutivos con día especificado', () => {
      expect(calculateDueDate('2026-01-15', 1, 15)).toBe('2026-02-15')
      expect(calculateDueDate('2026-01-15', 2, 15)).toBe('2026-03-15')
    })

    it('ajusta automáticamente días que no existen en el mes objetivo (ej. Feb 28)', () => {
      // 2026 no es bisiesto, febrero tiene 28 días
      expect(calculateDueDate('2026-01-31', 1, 31)).toBe('2026-02-28')
      expect(calculateDueDate('2026-01-31', 3, 31)).toBe('2026-04-30')
    })
  })

  describe('calculateItauSchedule', () => {
    it('genera cronograma sin intereses (0% TEA)', () => {
      const schedule = calculateItauSchedule({
        principal: 1200,
        teaRate: 0,
        totalInstallments: 3,
        startDate: '2026-01-10',
        dueDay: 10,
        includesVat22: false
      })

      expect(schedule.installments).toHaveLength(3)
      expect(schedule.totalInterest).toBe(0)
      expect(schedule.totalVat).toBe(0)
      expect(schedule.totalPayment).toBe(1200)

      expect(schedule.installments[0].principalAmount).toBe(400)
      expect(schedule.installments[0].balance).toBe(800)
      expect(schedule.installments[1].principalAmount).toBe(400)
      expect(schedule.installments[1].balance).toBe(400)
      expect(schedule.installments[2].principalAmount).toBe(400)
      expect(schedule.installments[2].balance).toBe(0)
    })

    it('genera marcha francesa con TEA y decrecimiento de intereses', () => {
      const schedule = calculateItauSchedule({
        principal: 10000,
        teaRate: 0.30, // 30% TEA
        totalInstallments: 6,
        startDate: '2026-03-01',
        dueDay: 10,
        includesVat22: false
      })

      expect(schedule.installments).toHaveLength(6)

      // La suma de las amortizaciones de capital debe ser exactamente el capital prestado
      const sumCapital = schedule.installments.reduce((acc, inst) => acc + inst.principalAmount, 0)
      expect(Math.round(sumCapital)).toBe(10000)

      // El saldo final debe ser 0
      expect(schedule.installments[5].balance).toBe(0)

      // En sistema francés: el interés decrece y el capital amortizado crece
      expect(schedule.installments[0].interestAmount).toBeGreaterThan(schedule.installments[5].interestAmount)
      expect(schedule.installments[0].principalAmount).toBeLessThan(schedule.installments[5].principalAmount)
    })

    it('aplica IVA del 22% sobre intereses cuando includesVat22 es true', () => {
      const schedule = calculateItauSchedule({
        principal: 5000,
        teaRate: 0.25,
        totalInstallments: 4,
        startDate: '2026-01-05',
        dueDay: 5,
        includesVat22: true
      })

      for (const inst of schedule.installments) {
        const expectedVat = Math.round(inst.interestAmount * 0.22 * 100) / 100
        expect(inst.vatAmount).toBe(expectedVat)
        expect(inst.installmentAmount).toBe(
          Math.round((inst.principalAmount + inst.interestAmount + inst.vatAmount) * 100) / 100
        )
      }
      expect(schedule.totalVat).toBeGreaterThan(0)
    })

    it('maneja edge cases con capital o cuotas <= 0', () => {
      const empty = calculateItauSchedule({
        principal: 0,
        teaRate: 0.1,
        totalInstallments: 0,
        startDate: '2026-01-01'
      })
      expect(empty.installments).toHaveLength(0)
      expect(empty.totalPayment).toBe(0)
    })
  })
})
