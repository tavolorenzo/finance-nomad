'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { X } from 'lucide-react'

// Chrome compartido del overlay: bottom sheet full-screen en mobile
// (design-system.md sección 5), modal centrado 480px en web. El contenido
// (ej. TransactionForm) no trae su propia caja -- esta es la única.
export function Modal({ title, children }: { title: string; children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') router.back()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [router])

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40" onClick={() => router.back()} />
      <div className="relative w-full md:max-w-[480px] max-h-[92vh] md:max-h-[85vh] overflow-y-auto bg-surface-2 border-t md:border border-border rounded-t-card md:rounded-card">
        <div className="flex justify-between items-center p-4 border-b border-border sticky top-0 bg-surface-2 z-10">
          <p className="font-display text-base font-medium">{title}</p>
          <button onClick={() => router.back()} aria-label="Cerrar" className="text-text-secondary">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
