import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getAppVersion, getAppEnvironment, getEnvironmentInfo } from './version'

describe('version and environment utility', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('obtiene la versión por defecto o de variable de entorno', () => {
    expect(getAppVersion()).toBe('2.8.0')
    process.env.NEXT_PUBLIC_APP_VERSION = '2.8.0'
    expect(getAppVersion()).toBe('2.8.0')
  })

  it('detecta entorno development por defecto', () => {
    delete process.env.NEXT_PUBLIC_APP_ENV
    delete process.env.VERCEL_ENV
    ;(process.env as Record<string, string | undefined>).NODE_ENV = 'development'
    expect(getAppEnvironment()).toBe('development')
  })

  it('detecta override explícito con NEXT_PUBLIC_APP_ENV', () => {
    process.env.NEXT_PUBLIC_APP_ENV = 'production'
    expect(getAppEnvironment()).toBe('production')

    process.env.NEXT_PUBLIC_APP_ENV = 'staging'
    expect(getAppEnvironment()).toBe('staging')

    process.env.NEXT_PUBLIC_APP_ENV = 'preview'
    expect(getAppEnvironment()).toBe('staging')
  })

  it('detecta entornos de Vercel (VERCEL_ENV)', () => {
    delete process.env.NEXT_PUBLIC_APP_ENV
    process.env.VERCEL_ENV = 'production'
    expect(getAppEnvironment()).toBe('production')

    process.env.VERCEL_ENV = 'preview'
    expect(getAppEnvironment()).toBe('staging')
  })

  it('genera metadata completa en getEnvironmentInfo', () => {
    process.env.NEXT_PUBLIC_APP_ENV = 'production'
    process.env.NEXT_PUBLIC_APP_VERSION = '1.3.0'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://xyzcompany.supabase.co'

    const info = getEnvironmentInfo()
    expect(info.version).toBe('1.3.0')
    expect(info.isProduction).toBe(true)
    expect(info.isDevelopment).toBe(false)
    expect(info.label).toBe('Producción')
    expect(info.supabaseHost).toBe('xyzcompany.supabase.co')
  })
})
