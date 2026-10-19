# Finance Nomad

App de finanzas personales multi-moneda para vida nómada con arquitectura **Local-First / Optimistic-First** y sincronización en segundo plano (*Background Sync*).

Consultá la documentación del proyecto:
* [`docs/PRD.md`](docs/PRD.md): Requisitos de producto, visión contable y alcance.
* [`docs/architecture.md`](docs/architecture.md): Arquitectura técnica, ciclo de vida de *Ledger Bundles*, cola *Outbox* (IndexedDB) y sincronización resiliente.
* [`docs/design-system.md`](docs/design-system.md): Tokens semánticos de color, tipografía, componentes y copy deck rioplatense.
* [`docs/prd-gap-analysis.md`](docs/prd-gap-analysis.md): Comparativa de avance y cobertura del PRD vs. implementación.
* [`docs/agents-and-skills.md`](docs/agents-and-skills.md): Guía de subagentes especializados y skills en `.claude/`.
* [`docs/CHANGELOG.md`](docs/CHANGELOG.md): Historial de versiones y registro canónico de cambios.
* [`AGENTS.md`](AGENTS.md): Reglas operativas y directivas obligatorias para desarrollo y agentes de IA.

## Estructura

```
finance-nomad/
├── docs/                    PRD, arquitectura, design system, gap analysis, changelog, agentes
├── AGENTS.md                Reglas obligatorias para agentes y desarrolladores
├── CHANGELOG.md             Acceso directo al registro canónico de versiones
├── .claude/
│   ├── agents/              db-architect, ui-builder, ledger-logic, qa-reviewer
│   └── skills/              skills y directivas de dominio
├── apps/web/                Next.js (App Router) + Tailwind CSS + Vitest
└── supabase/migrations/     Esquema SQL versionado (0001 a 0010)
```

## Primer arranque

Consultá [`SETUP.md`](SETUP.md) para el paso a paso completo. Resumen rápido:

1. `cd apps/web && npm install`
2. Crear proyecto en supabase.com y correr el script consolidado `supabase/setup_production.sql` (o en orden las migraciones desde `supabase/migrations/0001_init_schema.sql` hasta `supabase/migrations/0010_categories_and_onboarding.sql`) en el SQL Editor.
3. Copiar las variables de entorno: `cp apps/web/.env.example apps/web/.env.local` y configurar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Ejecutar tests automatizados: `npm test`
5. Iniciar servidor de desarrollo: `npm run dev`

