'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Check, RotateCcw } from 'lucide-react'
import { useModal } from '@/components/Modal'
import { updateWhatsAppTemplate } from '@/app/(protected)/people/actions'
import {
  DEFAULT_WHATSAPP_TEMPLATE,
  WHATSAPP_VARIABLES,
  formatWhatsAppMessage
} from '@/lib/whatsapp'

export function WhatsAppTemplateForm({
  initialTemplate
}: {
  initialTemplate?: string | null
}) {
  const router = useRouter()
  const { isModal, close } = useModal()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [template, setTemplate] = useState(
    initialTemplate?.trim() || DEFAULT_WHATSAPP_TEMPLATE
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Función para insertar la variable seleccionada en la posición del cursor
  function handleInsertVariable(variableKey: string) {
    const el = textareaRef.current
    if (!el) {
      setTemplate((prev) => `${prev} ${variableKey}`)
      return
    }

    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? el.value.length
    const before = el.value.substring(0, start)
    const after = el.value.substring(end)

    const nextValue = `${before}${variableKey}${after}`
    setTemplate(nextValue)
    setSaved(false)

    // Restaurar foco y mover el cursor después de la variable insertada
    setTimeout(() => {
      el.focus()
      const nextPos = start + variableKey.length
      el.setSelectionRange(nextPos, nextPos)
    }, 0)
  }

  function handleReset() {
    setTemplate(DEFAULT_WHATSAPP_TEMPLATE)
    setSaved(false)
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    setSaved(false)

    try {
      await updateWhatsAppTemplate(template)
      setSaved(true)
      router.refresh()

      if (isModal) {
        setTimeout(() => {
          close()
        }, 600)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la plantilla.')
    } finally {
      setLoading(false)
    }
  }

  // Preview interactivo con datos de muestra
  const previewMessage = formatWhatsAppMessage({
    template,
    personName: 'Gladys',
    totalFormatted: '$ 4.400 UYU',
    items: [
      { description: 'Cena con amigos', amountFormatted: '$ 2.200 UYU' },
      { description: 'Supermercado', amountFormatted: '$ 2.200 UYU' }
    ],
    dateFormatted: new Date().toLocaleDateString('es-UY')
  })

  return (
    <form onSubmit={handleSubmit} className="p-4 md:p-5 space-y-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider">
            Variables disponibles
          </label>
          <span className="text-[11px] text-text-muted">Tocá para insertar</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {WHATSAPP_VARIABLES.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => handleInsertVariable(v.key)}
              title={`${v.description} (Ejemplo: ${v.example})`}
              className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-control bg-surface-2 border border-border hover:border-accent hover:bg-accent/10 transition text-left"
            >
              <span className="font-mono text-xs font-semibold text-accent">{v.key}</span>
              <span className="text-[11px] text-text-muted group-hover:text-text-primary transition hidden sm:inline">
                {v.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-text-secondary">
            Texto de la plantilla
          </label>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition"
          >
            <RotateCcw size={12} />
            <span>Restablecer por defecto</span>
          </button>
        </div>

        <textarea
          ref={textareaRef}
          value={template}
          onChange={(e) => {
            setTemplate(e.target.value)
            setSaved(false)
          }}
          rows={6}
          className="w-full font-mono text-xs leading-relaxed p-3 rounded-control bg-surface-1 border border-border focus:border-accent focus:outline-none transition resize-y min-h-[130px]"
          placeholder="Escribí tu mensaje acá usando las variables..."
          required
        />
        <p className="text-[11px] text-text-muted mt-1">
          Podés usar saltos de línea y emojis. Se reemplazarán automáticamente con los datos de la persona al enviar.
        </p>
      </div>

      {/* Vista previa en tiempo real */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Vista previa del mensaje
        </label>
        <div className="p-3.5 rounded-control bg-surface-2/80 border border-border/80 space-y-1">
          <div className="text-[11px] text-text-muted font-medium mb-1 flex items-center justify-between">
            <span>Ejemplo con contacto «Gladys»:</span>
            <span className="text-[10px] text-income uppercase font-semibold">WhatsApp</span>
          </div>
          <div className="whitespace-pre-wrap font-sans text-xs text-text-primary bg-surface-1 p-3 rounded-control border border-border shadow-sm">
            {previewMessage}
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-expense font-medium">{error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-accent text-[color:var(--on-accent)] py-2.5 rounded-control font-medium text-sm hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {loading ? (
            'Guardando...'
          ) : saved ? (
            <>
              <Check size={16} /> ¡Plantilla guardada!
            </>
          ) : (
            'Guardar plantilla'
          )}
        </button>
      </div>
    </form>
  )
}
