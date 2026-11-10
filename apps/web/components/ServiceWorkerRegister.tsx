'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    // Registrar el Service Worker tras el evento load para no competir con el TTI inicial
    const register = () => {
      navigator.serviceWorker
        .register('/sw.js')
        .catch(() => {
          // Ignorar errores silenciosamente si el contexto no lo soporta (ej. localhost sin SSL en modo estricto)
        })
    }

    if (document.readyState === 'complete') {
      register()
    } else {
      window.addEventListener('load', register, { once: true })
      return () => window.removeEventListener('load', register)
    }
  }, [])

  return null
}

