import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Finance Nomad',
    short_name: 'Nomad',
    description: 'Finanzas personales multi-moneda para vida nómada',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#3b82f6',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon'
      }
    ]
  }
}

