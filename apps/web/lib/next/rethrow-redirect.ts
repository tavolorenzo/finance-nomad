// Reemplaza a unstable_rethrow ('next/navigation'), que requiere Next
// >=14.2.15 y no está pensada para usarse desde un catch de cliente sobre
// el resultado de una Server Action. Reimplementamos acá el único caso que
// nos importa: dejar pasar el error de control de flujo que usa redirect()
// en las Server Actions del proyecto (ver ui-builder.md).
export function rethrowIfRedirect(error: unknown): void {
    const digest = (error as { digest?: string } | null)?.digest
    if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) {
        throw error
    }
}