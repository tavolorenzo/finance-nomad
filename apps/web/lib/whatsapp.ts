export const DEFAULT_WHATSAPP_TEMPLATE = `Hola $Nombre! Te paso el detalle de lo pendiente:

$Detalle

Total: $Total`

export interface WhatsAppVariable {
  key: string
  label: string
  description: string
  example: string
}

export const WHATSAPP_VARIABLES: WhatsAppVariable[] = [
  {
    key: '$Nombre',
    label: 'Nombre',
    description: 'Nombre de la persona asignada',
    example: 'Gladys'
  },
  {
    key: '$Total',
    label: 'Total pendiente',
    description: 'Monto total acumulado con formato de moneda',
    example: '$ 4.400 UYU'
  },
  {
    key: '$Detalle',
    label: 'Desglose de movimientos',
    description: 'Lista detallada de cada consumo pendiente con su importe',
    example: '- Cena con amigos: $ 2.200 UYU\n- Supermercado: $ 2.200 UYU'
  },
  {
    key: '$Cantidad',
    label: 'Cantidad',
    description: 'Cantidad de movimientos pendientes',
    example: '2'
  },
  {
    key: '$Fecha',
    label: 'Fecha actual',
    description: 'Fecha de envío del mensaje en formato dd/mm/aaaa',
    example: '09/10/2026'
  }
]

export function formatWhatsAppMessage({
  template,
  personName,
  totalFormatted,
  items,
  dateFormatted
}: {
  template?: string | null
  personName: string
  totalFormatted: string
  items: { description: string; amountFormatted: string }[]
  dateFormatted?: string
}): string {
  const tpl = template && template.trim() ? template.trim() : DEFAULT_WHATSAPP_TEMPLATE

  const detailLines = items.length > 0
    ? items.map((item) => `- ${item.description}: ${item.amountFormatted}`).join('\n')
    : '(Sin movimientos pendientes)'

  const dateStr = dateFormatted ?? new Date().toLocaleDateString('es-UY')

  return tpl
    .replace(/\$Nombre/gi, personName)
    .replace(/\$Total/gi, totalFormatted)
    .replace(/\$Detalle/gi, detailLines)
    .replace(/\$Cantidad/gi, String(items.length))
    .replace(/\$Fecha/gi, dateStr)
}
