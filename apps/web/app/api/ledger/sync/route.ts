import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth-helper'
import { reconcileBundleFxRate } from '@/lib/ledger/reconcile-fx'
import type { LedgerBundle } from '@/lib/ledger/types'

export async function POST(req: Request) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  let body: { bundles: LedgerBundle[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Payload JSON inválido' }, { status: 400 })
  }

  const { bundles } = body
  if (!Array.isArray(bundles) || bundles.length === 0) {
    return NextResponse.json({ success: true, processedBundleIds: [] })
  }

  const processedBundleIds: string[] = []
  const errors: Array<{ bundleId: string; message: string }> = []

  for (const bundle of bundles) {
    try {
      // Si la cotización expiró y el usuario no la fijó manualmente, actualizar antes de persistir
      const reconciled = await reconcileBundleFxRate(bundle)

      // Inyectar o asegurar user_id en cada fila
      const sanitizedRows = reconciled.rows.map((row) => ({
        ...row,
        user_id: user.id
      }))

      // Intentar primero la RPC atómica commit_ledger_bundle
      const { error: rpcError } = await supabase.rpc('commit_ledger_bundle', {
        p_rows: sanitizedRows
      })

      if (rpcError) {
        // Fallback: batch insert directo de Supabase si la RPC aún no fue migrada
        const { error: insertError } = await supabase
          .from('master_transactions')
          .upsert(sanitizedRows, { onConflict: 'id', ignoreDuplicates: true })

        if (insertError) {
          throw new Error(insertError.message)
        }
      }

      processedBundleIds.push(bundle.id)
    } catch (err) {
      errors.push({
        bundleId: bundle.id,
        message: err instanceof Error ? err.message : 'Error desconocido al procesar bundle'
      })
    }
  }

  return NextResponse.json({
    success: errors.length === 0,
    processedBundleIds,
    errors: errors.length > 0 ? errors : undefined
  })
}
