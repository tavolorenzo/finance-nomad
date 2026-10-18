'use client'

import { useState, useTransition } from 'react'
import {
  Plus,
  Sparkles,
  Search,
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
  Edit2,
  PowerOff,
  Power,
  Layers
} from 'lucide-react'
import { CategoryModal } from './CategoryModal'
import { toggleCategoryActive, seedDefaultCategories } from '@/app/(protected)/categories/actions'
import type { Category } from '@/lib/types'

interface CategoryWithStats extends Category {
  transaction_count?: number
}

interface CategoryListProps {
  categories: CategoryWithStats[]
}

const ICON_MAP: Record<string, any> = {
  tag: Tag,
  'shopping-cart': ShoppingCart,
  home: Home,
  plane: Plane,
  utensils: Utensils,
  coffee: Coffee,
  ticket: Ticket,
  'heart-pulse': HeartPulse,
  laptop: Laptop,
  receipt: Receipt,
  car: Car,
  dumbbell: Dumbbell,
  book: Book
}

export function CategoryList({ categories }: CategoryListProps) {
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null)
  const [isPending, startTransition] = useTransition()
  const [actionError, setActionError] = useState<string | null>(null)

  const handleEdit = (category: Category) => {
    setCategoryToEdit(category)
    setModalOpen(true)
  }

  const handleCreateNew = () => {
    setCategoryToEdit(null)
    setModalOpen(true)
  }

  const handleToggle = (id: string, currentActive: boolean) => {
    setActionError(null)
    startTransition(async () => {
      try {
        await toggleCategoryActive(id, !currentActive)
      } catch (err: any) {
        setActionError(err?.message || 'Error al actualizar el estado de la categoría.')
      }
    })
  }

  const handleSeedDefaults = () => {
    setActionError(null)
    startTransition(async () => {
      try {
        await seedDefaultCategories()
      } catch (err: any) {
        setActionError(err?.message || 'Error al sembrar categorías sugeridas.')
      }
    })
  }

  const filteredCategories = categories.filter((cat) => {
    const isActive = cat.is_active !== false
    if (filter === 'active' && !isActive) return false
    if (filter === 'inactive' && isActive) return false
    if (search.trim()) {
      return cat.name.toLowerCase().includes(search.toLowerCase().trim())
    }
    return true
  })

  const getColorClasses = (color?: string | null) => {
    switch (color) {
      case 'income':
        return 'bg-income/15 text-income border-income/30'
      case 'expense':
        return 'bg-expense/15 text-expense border-expense/30'
      case 'pending':
        return 'bg-pending/15 text-pending border-pending/30'
      case 'accent':
      default:
        return 'bg-accent/15 text-accent border-accent/30'
    }
  }

  return (
    <div className="space-y-4">
      {/* Barra superior de acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Búsqueda */}
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Buscar categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-surface-1 border border-border rounded-control text-text-primary focus:outline-none focus:border-accent"
          />
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-2">
          {categories.length === 0 && (
            <button
              type="button"
              onClick={handleSeedDefaults}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-border bg-surface-2 text-text-primary hover:border-accent hover:text-accent rounded-control transition disabled:opacity-50"
            >
              <Sparkles size={14} className="text-accent" />
              Categorías sugeridas
            </button>
          )}

          <button
            type="button"
            onClick={handleCreateNew}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-accent text-[color:var(--on-accent)] hover:opacity-95 rounded-control transition shadow-sm"
          >
            <Plus size={15} />
            Nueva categoría
          </button>
        </div>
      </div>

      {actionError && (
        <div className="p-3 text-xs bg-expense/10 text-expense border border-expense/20 rounded-control">
          {actionError}
        </div>
      )}

      {/* Tabs de Filtro */}
      <div className="flex items-center gap-1 border-b border-border pb-2 text-xs">
        <button
          type="button"
          onClick={() => setFilter('active')}
          className={`px-3 py-1.5 rounded-control transition ${
            filter === 'active'
              ? 'bg-accent/15 text-accent font-semibold'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          Activas ({categories.filter((c) => c.is_active !== false).length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-control transition ${
            filter === 'all'
              ? 'bg-accent/15 text-accent font-semibold'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          Todas ({categories.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('inactive')}
          className={`px-3 py-1.5 rounded-control transition ${
            filter === 'inactive'
              ? 'bg-accent/15 text-accent font-semibold'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          Inactivas ({categories.filter((c) => c.is_active === false).length})
        </button>
      </div>

      {/* Grid de Categorías */}
      {filteredCategories.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredCategories.map((cat) => {
            const IconComp = ICON_MAP[cat.icon ?? 'tag'] || Tag
            const isActive = cat.is_active !== false
            const colorClass = getColorClasses(cat.color)

            return (
              <div
                key={cat.id}
                className={`flex items-center justify-between p-3.5 rounded-card border bg-surface-1 transition ${
                  isActive ? 'border-border hover:border-text-muted' : 'border-border/60 opacity-60 bg-surface-2/30'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`p-2 rounded-control border ${colorClass} shrink-0`}>
                    <IconComp size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">{cat.name}</p>
                    <p className="text-[11px] text-text-muted flex items-center gap-1.5 mt-0.5">
                      <span>{cat.transaction_count ?? 0} movimientos</span>
                      {!isActive && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-2 text-text-muted">
                          Inactiva
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(cat)}
                    className="p-1.5 rounded-control text-text-muted hover:text-text-primary hover:bg-surface-2 transition"
                    title="Editar categoría"
                  >
                    <Edit2 size={15} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggle(cat.id, isActive)}
                    disabled={isPending}
                    className={`p-1.5 rounded-control transition ${
                      isActive
                        ? 'text-text-muted hover:text-expense hover:bg-expense/10'
                        : 'text-text-muted hover:text-income hover:bg-income/10'
                    }`}
                    title={isActive ? 'Desactivar categoría' : 'Reactivar categoría'}
                  >
                    {isActive ? <PowerOff size={15} /> : <Power size={15} />}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-surface-1 border border-border rounded-card p-8 text-center space-y-3">
          <div className="inline-flex p-3 rounded-full bg-surface-2 text-text-muted">
            <Layers size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">
              {categories.length === 0 ? 'No tenés categorías configuradas' : 'No se encontraron categorías'}
            </p>
            <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
              {categories.length === 0
                ? 'Organizá tus consumos en categorías para presupuestos mensuales y reportes detallados.'
                : 'Probá ajustando el término de búsqueda o cambiando el filtro seleccionado.'}
            </p>
          </div>
          {categories.length === 0 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleSeedDefaults}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-border bg-surface-2 text-text-primary hover:border-accent hover:text-accent rounded-control transition"
              >
                <Sparkles size={14} className="text-accent" />
                Cargar sugeridas
              </button>
              <button
                type="button"
                onClick={handleCreateNew}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-accent text-[color:var(--on-accent)] hover:opacity-95 rounded-control transition"
              >
                <Plus size={14} />
                Crear manual
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal de Crear / Editar */}
      <CategoryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        categoryToEdit={categoryToEdit}
      />
    </div>
  )
}
