import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PaginationControl } from './PaginationControl'

describe('PaginationControl', () => {
  it('no renderiza nada si totalItems <= pageSize', () => {
    const { container } = render(
      <PaginationControl
        currentPage={1}
        totalItems={15}
        pageSize={20}
        onPageChange={vi.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renderiza resumen tabular y controles cuando hay más elementos que pageSize', () => {
    render(
      <PaginationControl
        currentPage={1}
        totalItems={55}
        pageSize={20}
        onPageChange={vi.fn()}
      />
    )

    expect(screen.getByText(/Mostrando/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Página 1')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
    expect(screen.getByText('55')).toBeInTheDocument()
    expect(screen.getByText(/movimientos/i)).toBeInTheDocument()

    const prevBtn = screen.getByLabelText('Página anterior')
    const nextBtn = screen.getByLabelText('Página siguiente')

    expect(prevBtn).toBeDisabled()
    expect(nextBtn).toBeEnabled()
  })

  it('llama a onPageChange al hacer click en página siguiente y números de página', () => {
    const onPageChange = vi.fn()
    render(
      <PaginationControl
        currentPage={1}
        totalItems={50}
        pageSize={20}
        onPageChange={onPageChange}
      />
    )

    const nextBtn = screen.getByLabelText('Página siguiente')
    fireEvent.click(nextBtn)
    expect(onPageChange).toHaveBeenCalledWith(2)

    const page3Btn = screen.getByLabelText('Página 3')
    fireEvent.click(page3Btn)
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('deshabilita el botón siguiente en la última página', () => {
    render(
      <PaginationControl
        currentPage={3}
        totalItems={50}
        pageSize={20}
        onPageChange={vi.fn()}
      />
    )

    const prevBtn = screen.getByLabelText('Página anterior')
    const nextBtn = screen.getByLabelText('Página siguiente')

    expect(prevBtn).toBeEnabled()
    expect(nextBtn).toBeDisabled()
  })
})
