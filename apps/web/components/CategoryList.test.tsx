import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CategoryList } from './CategoryList'
import * as actions from '@/app/(protected)/categories/actions'
import type { Category } from '@/lib/types'

vi.mock('@/app/(protected)/categories/actions', () => ({
  toggleCategoryActive: vi.fn(),
  seedDefaultCategories: vi.fn()
}))

vi.mock('./CategoryModal', () => ({
  CategoryModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    isOpen ? (
      <div data-testid="category-modal">
        <span>Modal de Categoría</span>
        <button onClick={onClose}>Cerrar</button>
      </div>
    ) : null
  )
}))

describe('CategoryList', () => {
  const mockCategories: (Category & { transaction_count?: number })[] = [
    {
      id: 'cat-1',
      name: 'Supermercado',
      icon: 'shopping-cart',
      color: 'accent',
      is_active: true,
      transaction_count: 5,
      created_at: new Date().toISOString()
    },
    {
      id: 'cat-2',
      name: 'Gimnasio',
      icon: 'dumbbell',
      color: 'income',
      is_active: false,
      transaction_count: 0,
      created_at: new Date().toISOString()
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza categorías activas por defecto', () => {
    render(<CategoryList categories={mockCategories} />)
    expect(screen.getByText('Supermercado')).toBeInTheDocument()
    expect(screen.queryByText('Gimnasio')).not.toBeInTheDocument()
  })

  it('muestra categorías inactivas al filtrar por "Inactivas"', () => {
    render(<CategoryList categories={mockCategories} />)
    const inactiveTab = screen.getByRole('button', { name: /inactivas/i })
    fireEvent.click(inactiveTab)

    expect(screen.getByText('Gimnasio')).toBeInTheDocument()
    expect(screen.queryByText('Supermercado')).not.toBeInTheDocument()
  })

  it('filtra por término de búsqueda', () => {
    render(<CategoryList categories={mockCategories} />)
    const searchInput = screen.getByPlaceholderText(/buscar categoría/i)
    fireEvent.change(searchInput, { target: { value: 'Super' } })

    expect(screen.getByText('Supermercado')).toBeInTheDocument()

    fireEvent.change(searchInput, { target: { value: 'Inexistente' } })
    expect(screen.queryByText('Supermercado')).not.toBeInTheDocument()
  })

  it('abre el modal para crear nueva categoría', () => {
    render(<CategoryList categories={mockCategories} />)
    const newBtn = screen.getByRole('button', { name: /nueva categoría/i })
    fireEvent.click(newBtn)

    expect(screen.getByTestId('category-modal')).toBeInTheDocument()
  })
})
