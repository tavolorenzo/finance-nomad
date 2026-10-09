import { describe, it, expect } from 'vitest'
import { formatWhatsAppMessage, DEFAULT_WHATSAPP_TEMPLATE, WHATSAPP_VARIABLES } from './whatsapp'

describe('WhatsApp template formatter', () => {
  const sampleItems = [
    { description: 'Cena', amountFormatted: '$ 1.500 UYU' },
    { description: 'Supermercado', amountFormatted: '$ 2.000 UYU' }
  ]

  it('aplica la plantilla por defecto correctamente', () => {
    const res = formatWhatsAppMessage({
      template: null,
      personName: 'Gladys',
      totalFormatted: '$ 3.500 UYU',
      items: sampleItems,
      dateFormatted: '09/10/2026'
    })

    expect(res).toContain('Hola Gladys!')
    expect(res).toContain('- Cena: $ 1.500 UYU')
    expect(res).toContain('- Supermercado: $ 2.000 UYU')
    expect(res).toContain('Total: $ 3.500 UYU')
  })

  it('reemplaza variables personalizadas ($Nombre, $Total, $Cantidad, $Fecha)', () => {
    const customTemplate = 'Estimado/a $Nombre: Tenés $Cantidad consumos por $Total al día $Fecha.'
    const res = formatWhatsAppMessage({
      template: customTemplate,
      personName: 'Diego',
      totalFormatted: '€ 120 EUR',
      items: sampleItems,
      dateFormatted: '15/10/2026'
    })

    expect(res).toBe('Estimado/a Diego: Tenés 2 consumos por € 120 EUR al día 15/10/2026.')
  })

  it('tolera variaciones de mayúsculas/minúsculas en variables', () => {
    const customTemplate = 'Hola $nombre, tu deuda es $total ($cantidad ítems).'
    const res = formatWhatsAppMessage({
      template: customTemplate,
      personName: 'Ale',
      totalFormatted: '$ 500',
      items: sampleItems
    })

    expect(res).toBe('Hola Ale, tu deuda es $ 500 (2 ítems).')
  })

  it('maneja lista vacía de items', () => {
    const res = formatWhatsAppMessage({
      template: DEFAULT_WHATSAPP_TEMPLATE,
      personName: 'Romina',
      totalFormatted: '$ 0 UYU',
      items: []
    })

    expect(res).toContain('(Sin movimientos pendientes)')
    expect(res).toContain('Total: $ 0 UYU')
  })

  it('expone lista completa de variables válidas', () => {
    expect(WHATSAPP_VARIABLES.length).toBeGreaterThanOrEqual(4)
    expect(WHATSAPP_VARIABLES.map((v) => v.key)).toContain('$Nombre')
    expect(WHATSAPP_VARIABLES.map((v) => v.key)).toContain('$Total')
    expect(WHATSAPP_VARIABLES.map((v) => v.key)).toContain('$Detalle')
  })
})
