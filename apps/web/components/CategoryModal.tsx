'use client'

import { useState } from 'react'
import {
  X,
  Tag,
  ShoppingCart,
  Home,
  Plane,
  Utensils,
  Ticket,
  HeartPulse,
  Laptop,
  Receipt,
  Car,
  Coffee,
  Dumbbell,
  Book,
  WifiOff
} from 'lucide-react'
import { useOnlineStatus } from '@/lib/hooks/use-online-status'
import { createCategory, updateCategory } from '@/app/(protected)/categories/actions'
import type { Category } from '@/lib/types'

interface CategoryModalProps {
  isOpen: boolean
  onClose: () => void
  categoryToEdit?: Category | null
}

const AVAILABLE_ICONS = [
  { id: 'tag', label: 'Etiqueta', icon: Tag },
  { id: 'shopping-cart', label: 'Super', icon: ShoppingCart },
  { id: 'home', label: 'Hogar', icon: Home },
  { id: 'plane', label: 'Viajes', icon: Plane },
  { id: 'utensils', label: 'Comida', icon: Utensils },
  { id: 'coffee', label: 'Café', icon: Coffee },
  { id: 'ticket', label: 'Ocio', icon: Ticket },
  { id: 'heart-pulse', label: 'Salud', icon: HeartPulse },
  { id: 'laptop', label: 'Tech', icon: Laptop },
  { id: 'receipt', label: 'Servicios', icon: Receipt },
  { id: 'car', label: 'Auto', icon: Car },
  { id: 'dumbbell', label: 'Gym', icon: Dumbbell },
  { id: 'book', label: 'Estudio', icon: Book }
]

const AVAILABLE_COLORS = [
  { id: 'accent', label: 'Acento', bg: 'bg-accent/20', text: 'text-accent', border: 'border-accent' },
  { id: 'income', label: 'Verde (Ingreso)', bg: 'bg-income/20', text: 'text-income', border: 'border-income' },
  { id: 'expense', label: 'Rojo (Gasto)', bg: 'bg-expense/20', text: 'text-expense', border: 'border-expense' },
  { id: 'pending', label: 'Ámbar (Pendiente)', bg: 'bg-pending/20', text: 'text-pending', border: 'border-pending' }
]

export function CategoryModal({
  isOpen,
  onClose,
  categoryToEdit
}: CategoryModalProps) {
  const isOnline = useOnlineStatus()
  const isEditing = Boolean(categoryToEdit)

  const [name, setName] = useState(categoryToEdit?.name ?? '')
  const [icon, setIcon] = useState(categoryToEdit?.icon ?? 'tag')
  const [color, setColor] = useState(categoryToEdit?.color ?? 'accent')
  const [isActive, setIsActive] = useState(categoryToEdit?.is_active ?? true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Ingresá un nombre para la categoría.')
      return
    }

    if (!isOnline) {
      setError('Se requiere conexión a internet para administrar categorías.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.set('name', name.trim())
      formData.set('icon', icon)
      formData.set('color', color)

      if (isEditing && categoryToEdit) {
        formData.set('id', categoryToEdit.id)
        formData.set('is_active', isActive ? 'true' : 'false')
        await updateCategory(formData)
      } else {
        await createCategory(formData)
      }

      onClose()
    } catch (err: any) {
      setError(err?.message || 'Ocurrió un error al guardar la categoría.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md bg-surface-1 border border-border rounded-card shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="font-display text-base font-semibold text-text-primary">
              {isEditing ? 'Editar categoría' : 'Nueva categoría de gastos'}
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              {isEditing ? 'Modificá el nombre, icono y estado' : 'Clasificá tus consumos para presupuestos y métricas'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition p-1 rounded-control"
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Offline Warning */}
        {!isOnline && (
          <div className="flex items-center gap-2 px-5 py-2.5 bg-pending/10 border-b border-pending/20 text-pending text-xs">
            <WifiOff size={14} />
            <span>Estás sin conexión. Conectate a internet para guardar categorías.</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-expense/10 text-expense border border-expense/20 rounded-control">
              {error}
            </div>
          )}

          {/* Nombre */}
          <div>
            <label htmlFor="category-name" className="block text-xs font-medium text-text-secondary mb-1">
              Nombre de la categoría
            </label>
            <input
              id="category-name"
              type="text"
              required
              placeholder="Ej. Supermercado, Alquiler, Vuelos..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-control px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              autoFocus
            />
          </div>

          {/* Selector de Icono */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Icono representativo
            </label>
            <div className="grid grid-cols-6 sm:grid-cols-7 gap-1.5 max-h-36 overflow-y-auto p-1 bg-surface-2/40 rounded-control border border-border">
              {AVAILABLE_ICONS.map((item) => {
                const ItemIcon = item.icon
                const isSelected = icon === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    title={item.label}
                    onClick={() => setIcon(item.id)}
                    className={`p-2 rounded-control flex items-center justify-center transition ${
                      isSelected
                        ? 'bg-accent text-[color:var(--on-accent)] font-semibold'
                        : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'
                    }`}
                  >
                    <ItemIcon size={18} />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Selector de Color Semántico */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Color identificador
            </label>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_COLORS.map((item) => {
                const isSelected = color === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setColor(item.id)}
                    className={`flex items-center gap-2 p-2 rounded-control border text-xs transition ${
                      isSelected
                        ? `${item.border} ${item.bg} ${item.text} font-medium`
                        : 'border-border bg-surface-2/50 text-text-secondary hover:border-text-muted'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full ${item.bg} ${item.border} border`} />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Toggle Activo (en edición) */}
          {isEditing && (
            <div className="flex items-center justify-between p-3 bg-surface-2/50 border border-border rounded-control">
              <div>
                <p className="text-xs font-medium text-text-primary">Categoría activa</p>
                <p className="text-[11px] text-text-muted">
                  Si la desactivás, no aparecerá para nuevos gastos pero se preservará su historial.
                </p>
              </div>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
              />
            </div>
          )}

          {/* Acciones */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-2 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-2 rounded-control transition border border-border"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isOnline}
              className="px-4 py-2 text-xs font-semibold bg-accent text-[color:var(--on-accent)] hover:opacity-95 rounded-control transition disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear categoría'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
