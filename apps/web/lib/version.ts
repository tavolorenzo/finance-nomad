export type AppEnvironment = 'development' | 'staging' | 'production'

export interface EnvironmentInfo {
  version: string
  env: AppEnvironment
  label: string
  description: string
  isProduction: boolean
  isDevelopment: boolean
  isStaging: boolean
  supabaseHost: string
}

export function getAppVersion(): string {
  return process.env.NEXT_PUBLIC_APP_VERSION || '2.3.1'
}

export function getAppEnvironment(): AppEnvironment {
  // 1. Variable de entorno explícita (útil para override manual)
  const explicit = process.env.NEXT_PUBLIC_APP_ENV?.toLowerCase()
  if (explicit === 'production' || explicit === 'prod') return 'production'
  if (explicit === 'staging' || explicit === 'preview') return 'staging'
  if (explicit === 'development' || explicit === 'dev') return 'development'

  // 2. Entorno provisto por Vercel
  const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV
  if (vercelEnv === 'production') return 'production'
  if (vercelEnv === 'preview') return 'staging'
  if (vercelEnv === 'development') return 'development'

  // 3. Fallback a NODE_ENV estándar
  if (process.env.NODE_ENV === 'production') return 'production'
  return 'development'
}

export function getEnvironmentInfo(): EnvironmentInfo {
  const env = getAppEnvironment()
  const version = getAppVersion()

  let supabaseHost = 'No configurado'
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (supabaseUrl) {
    try {
      supabaseHost = new URL(supabaseUrl).host
    } catch {
      supabaseHost = supabaseUrl
    }
  }

  const descriptions: Record<AppEnvironment, string> = {
    development: 'Entorno de desarrollo local. Los datos cargados acá son de prueba y no afectan tu contabilidad real.',
    staging: 'Entorno de pre-producción. Verificá los cambios y flujos antes del pasaje a producción.',
    production: 'Entorno oficial en producción. Operando con tu contabilidad y cuentas reales.'
  }

  const labels: Record<AppEnvironment, string> = {
    development: 'Desarrollo',
    staging: 'Pre-producción',
    production: 'Producción'
  }

  return {
    version,
    env,
    label: labels[env],
    description: descriptions[env],
    isProduction: env === 'production',
    isDevelopment: env === 'development',
    isStaging: env === 'staging',
    supabaseHost
  }
}
