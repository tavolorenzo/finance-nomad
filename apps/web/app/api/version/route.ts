import { NextResponse } from 'next/server'
import { getEnvironmentInfo } from '@/lib/version'

export const dynamic = 'force-dynamic'

export async function GET() {
  const info = getEnvironmentInfo()

  return NextResponse.json(
    {
      version: info.version,
      commitSha: info.commitSha,
      env: info.env,
      timestamp: new Date().toISOString()
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      }
    }
  )
}

