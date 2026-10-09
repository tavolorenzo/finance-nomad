'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X, MessageSquare, Send, RotateCcw, Settings, PhoneOff } from 'lucide-react'
import type { Person } from '@/lib/types'

interface WhatsAppNotifyModalProps {
  isOpen: boolean
  onClose: () => void
  person: Person
  initialMessage: string
}

export function WhatsAppNotifyModal({
  isOpen,
  onClose,
  person,
  initialMessage
}: WhatsAppNotifyModalProps) {
  const [message, setMessage] = useState(initialMessage)

  // Sincronizar mensaje cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setMessage(initialMessage)
    }
  }, [isOpen, initialMessage])

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  function handleSend() {
    const cleanPhone = person.phone?.replace(/\D/g, '')
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`

    window.open(url, '_blank')
    onClose()
  }

  function handleReset() {
    setMessage(initialMessage)
  }

  const hasPhone = Boolean(person.phone && person.phone.trim())

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-surface-1 border border-border rounded-card shadow-2xl w-full max-w-lg p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="whatsapp-modal-title"
      >
        {/* Cabecera */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-income/15 text-income flex items-center justify-center flex-shrink-0">
              <MessageSquare size={16} />
            </div>
            <div>
              <h2 id="whatsapp-modal-title" className="font-display text-base font-semibold text-text-primary">
                Notificar por WhatsApp
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Revisá y editá el mensaje antes de enviarlo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-text-muted hover:text-text-primary p-1 rounded-control hover:bg-surface-2 transition"
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Destinatario */}
        <div className="bg-surface-2/60 border border-border/80 rounded-control p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-text-muted">Contacto:</span>
            <span className="font-semibold text-text-primary">{person.name}</span>
          </div>
          <div>
            {hasPhone ? (
              <span className="font-mono text-text-secondary bg-surface-1 px-2 py-0.5 rounded border border-border">
                {person.phone}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-pending">
                <PhoneOff size={13} />
                <span>Sin teléfono (elegirás chat en WhatsApp)</span>
              </span>
            )}
          </div>
        </div>

        {/* Editor de mensaje final */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Mensaje a enviar
            </label>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-text-primary transition"
              title="Restablecer al texto original generado por la plantilla"
            >
              <RotateCcw size={11} />
              <span>Restablecer plantilla</span>
            </button>
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={7}
            className="w-full text-xs font-sans leading-relaxed p-3 rounded-control bg-surface-1 border border-border focus:border-accent focus:outline-none transition resize-y min-h-[140px]"
            placeholder="Escribí el mensaje a enviar..."
            autoFocus
          />

          <div className="flex items-center justify-between text-[11px] text-text-muted pt-0.5">
            <span>Podés modificar el texto libremente para esta notificación.</span>
            <Link
              href="/people/template"
              className="inline-flex items-center gap-1 text-text-muted hover:text-accent transition"
              onClick={onClose}
            >
              <Settings size={11} />
              <span>Plantilla base</span>
            </Link>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-control border border-border text-xs font-medium text-text-secondary hover:bg-surface-2 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={!message.trim()}
            className="flex-1 bg-accent text-[color:var(--on-accent)] py-2.5 rounded-control text-xs font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 transition disabled:opacity-40"
          >
            <Send size={14} />
            <span>Abrir en WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  )
}
