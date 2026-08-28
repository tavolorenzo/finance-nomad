/** @type {import('next').NextConfig} */
const nextConfig = {}
// Nota: NO usamos output: 'export'. El formulario y el dashboard dependen de
// Server Actions y Server Components con datos en vivo de Supabase, que un
// export estático no soporta. En fase 5, Capacitor va a apuntar a la URL
// pública de Vercel (server.url en capacitor.config) en vez de empaquetar
// un build estático — ver docs/agents-and-skills.md, agente capacitor-release.
module.exports = nextConfig
