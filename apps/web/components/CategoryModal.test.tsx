import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CategoryModal } from './CategoryModal'

const mockCreateCategory = vi.fn()
const mockUpdateCategory = vi.fn()
let mockIsOnline = true

vi.mock('@/lib/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockIsOnline
}))

vi.mock('@/app/(protected)/categories/actions', () => ({
  createCategory: (formData: FormData) => mockCreateCategory(formData),
  updateCategory: (formData: FormData) => mockUpdateCategory(formData)
}))

describe('CategoryModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsOnline = true
  })

  it('no renderiza nada si isOpen es false', () => {
    const { container } = render(<CategoryModal isOpen={false} onClose={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('renderiza modo creación con título y campos', () => {
    render(<CategoryModal isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('Nueva categoría de gastos')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Ej. Supermercado/i)).toBeInTheDocument()
    expect(screen.getByText('Crear categoría')).toBeInTheDocument()
  })

  it('renderiza modo edición con valores precargados', () => {
    const category = {
      id: 'cat-1',
      name: 'Supermercado',
      icon: 'shopping-cart',
      color: 'accent',
      is_active: true
    }
    render(<CategoryModal isOpen={true} onClose={vi.fn()} categoryToEdit={category} />)
    expect(screen.getByText('Editar categoría')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Supermercado')).toBeInTheDocument()
    expect(screen.getByText('Guardar cambios')).toBeInTheDocument()
    expect(screen.getByText('Categoría activa')).toBeInTheDocument()
  })

  it('llama a createCategory al enviar un nuevo nombre', async () => {
    const onClose = vi.fn()
    mockCreateCategory.mockResolvedValueOnce(undefined)

    render(<CategoryModal isOpen={true} onClose={onClose} />)

    const input = screen.getByPlaceholderText(/Ej. Supermercado/i)
    fireEvent.change(input, { target: { value: 'Transporte & Nafta' } })

    fireEvent.click(screen.getByText('Crear categoría'))

    await waitFor(() => {
      expect(mockCreateCategory).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('muestra aviso preventivo y deshabilita el submit si está offline', () => {
    mockIsOnline = false
    render(<CategoryModal isOpen={true} onClose={vi.fn()} />)

    expect(screen.getByText(/Estás sin conexión/i)).toBeInTheDocument()
    const submitBtn = screen.getByText('Crear categoría').closest('button')!
    expect(submitBtn).toBeDisabled()
  })
})
