import './globals.css'

export const metadata = {
  title: 'Finance Nomad',
  description: 'Finanzas personales multi-moneda para vida nómada'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="font-sans" suppressHydrationWarning>{children}</body>
    </html>
  )
}
