# Finance Nomad

App de finanzas personales multi-moneda para vida nómada. Ver `docs/PRD.md`
para el producto completo, `docs/design-system.md` para el estándar visual,
y `docs/agents-and-skills.md` para cómo está dividido el trabajo entre
subagentes de Claude Code.

## Estructura

```
finance-nomad/
├── docs/                    PRD, design system, agentes — leer antes de codear
├── .claude/
│   ├── agents/              db-architect, ui-builder, ledger-logic, qa-reviewer
│   └── skills/               reglas cortas que cada agente lee según lo que toca
├── apps/web/                Next.js + Tailwind
└── supabase/migrations/     schema SQL versionado
```

## Primer arranque

Ver `SETUP.md` para el paso a paso completo. Resumen:

1. `cd apps/web && npm install`
2. Crear proyecto en supabase.com, correr `supabase/migrations/0001_init_schema.sql`
3. Completar `apps/web/.env.local` a partir de `.env.example`
4. `npm run dev`
