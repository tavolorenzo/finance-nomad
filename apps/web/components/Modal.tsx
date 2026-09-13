'use client'

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { X } from 'lucide-react'

interface ModalContextType {
  isModal: boolean
  close: () => void
}

const ModalContext = createContext<ModalContextType>({
  isModal: false,
  close: () => {}
})

export const useModal = () => useContext(ModalContext)

// Chrome compartido del overlay: bottom sheet full-screen en mobile
// (design-system.md sección 5), modal centrado 480px en web. El contenido
// (ej. TransactionForm) no trae su propia caja -- esta es la única.
export function Modal({ title, children }: { title: string; children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const initialPathname = useRef(pathname)
  const [isOpen, setIsOpen] = useState(true)

  const handleClose = useCallback(() => {
    setIsOpen(false)
    router.back()
  }, [router])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [handleClose])

  // Si la ruta cambió (ej. navegación con router.push, router.back o redirect),
  // Next.js Parallel Routes conserva el slot @modal en navegaciones soft.
  // Evitamos seguir renderizando el modal viejo.
  if (!isOpen || pathname !== initialPathname.current) {
    return null
  }

  return (
    <ModalContext.Provider value={{ isModal: true, close: handleClose }}>
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
        <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
        <div className="relative w-full md:max-w-[480px] max-h-[92vh] md:max-h-[85vh] overflow-y-auto bg-surface-2 border-t md:border border-border rounded-t-card md:rounded-card">
          <div className="flex justify-between items-center p-4 border-b border-border sticky top-0 bg-surface-2 z-10">
            <p className="font-display text-base font-medium text-text-primary">{title}</p>
            <button onClick={handleClose} aria-label="Cerrar" className="text-text-secondary hover:text-text-primary p-1 rounded-md hover:bg-surface-1 transition">
              <X size={20} />
            </button>
          </div>
          {children}
        </div>
      </div>
    </ModalContext.Provider>
  )
}
