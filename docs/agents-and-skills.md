# Equipo de agentes y skills — Finance Nomad

Referencia para trabajar el proyecto con Claude Code usando subagentes especializados en vez de una sola conversación que mezcla schema, UI y lógica de negocio.

---

## 1. Por qué separar en agentes

Un solo Claude sesión larga termina con contexto contaminado: cuando le pedís un componente de UI, todavía tiene en la cabeza detalles de RLS de Postgres de hace 40 mensajes, y viceversa. Los subagentes de Claude Code (`.claude/agents/*.md`) resuelven esto: cada uno arranca con contexto limpio, un system prompt acotado a su dominio, y solo las herramientas que necesita. Vos seguís siendo el orquestador — les delegás tareas puntuales, no les das autonomía total.

Para un proyecto personal, 4 agentes alcanzan. Más que eso es overhead de coordinación sin beneficio real.

---

## 2. Agentes

| Agente | Rol | Lee siempre | Nunca toca |
|---|---|---|---|
| **db-architect** | Schema SQL, migraciones, RLS policies, script de import del Excel a Supabase | `PRD.md` §5 (esquema), `Finances_2026.xlsx` | Componentes de UI |
| **ui-builder** | Construye pantallas Next.js/Tailwind siguiendo el inventario de pantallas | `design-system.md` completo, mapa de rutas | Lógica de conversión de moneda, schema SQL |
| **ledger-logic** | La lógica más delicada: conversión FX, generación de N cuotas, transferencias con `parent_transaction_id`, cálculo de patrimonio neto | `PRD.md` §3 (reglas de negocio) | Estilos, copy, layout |
| **qa-reviewer** | Corre al cerrar cada fase del plan: casos límite de redondeo multi-moneda, cuotas mal generadas, RLS que filtra de más o de menos | Todo lo anterior + tests existentes | No escribe features nuevas, solo reporta y corrige bugs puntuales |

Un quinto agente, **capacitor-release**, se suma recién en la fase 5 (empaquetado Android) — no vale la pena definirlo antes, cambiaría poco entre ahora y entonces.

### Ejemplo de definición (`.claude/agents/ledger-logic.md`)

```markdown
---
name: ledger-logic
description: Usar para cualquier cálculo de conversión de moneda, generación de cuotas, transferencias entre cuentas o agregación de patrimonio neto. No usar para UI ni queries de lectura simples.
tools: Read, Edit, Bash
---

Sos responsable de la lógica de negocio del ledger financiero descripta en
PRD.md sección 3. Reglas no negociables:
- Toda transacción guarda amount_original + amount_account, nunca solo uno.
- Las cuotas se generan como N filas atómicas (transacción SQL), nunca una por una.
- El tipo de cambio manual, una vez editado por el usuario, no se vuelve a
  pisar automáticamente (rateOverridden: true).
- Nunca redondees un monto antes de guardarlo en la base — el redondeo es
  solo de presentación (ver design-system.md, montos en mono).
```

---

## 3. Skills de proyecto (`.claude/skills/`)

Estas no son agentes — son documentos que cualquier agente (o vos en una sesión normal) lee antes de tocar un área específica. Ya usamos esta misma mecánica en esta conversación (leer `design-system.md` antes de armar cada mockup); acá la formalizamos para que sea automática dentro del repo.

| Skill | Contenido | Se dispara al... |
|---|---|---|
| `design-system/SKILL.md` | Apunta a `design-system.md`: tokens de color, tipografía, componentes | crear o editar cualquier archivo en `components/` o `app/**/page.tsx` |
| `fx-ledger-rules/SKILL.md` | Reglas de conversión, redondeo, cuotas — resumen ejecutable de PRD §3 | tocar `lib/fx/`, `lib/currency.ts`, o cualquier hook de transacciones |
| `supabase-conventions/SKILL.md` | Convención de nombres de tablas/columnas, patrón de RLS policy, cómo versionar migraciones | crear una migración nueva en `supabase/migrations/` |
| `copy-style/SKILL.md` | El copy deck completo (sección 7 de `design-system.md`): tono vos, rioplatense, sin "por favor" | escribir cualquier string visible al usuario |

Cada `SKILL.md` es corto (media página) — el objetivo es que el agente no tenga que releer `design-system.md` entero por un cambio de un botón, solo la porción relevante.

---

## 4. Quién trabaja en cada fase del plan

| Fase | Agente(s) activos |
|---|---|
| 0 — Fundaciones | `db-architect` (solo) |
| 1 — Ledger mínimo | `db-architect` cierra schema → `ledger-logic` implementa cálculos → `ui-builder` arma pantallas → `qa-reviewer` valida al final |
| 2 — Cuotas y personas | `ledger-logic` + `ui-builder` en paralelo (lógica y pantalla de Personas no se pisan) |
| 3 — Presupuesto y dashboard | `ui-builder` (dashboard es mayormente agregación visual) + `qa-reviewer` |
| 4 — Préstamos y portafolio | `ledger-logic` (amortización, P&L) + `ui-builder` |
| 5 — Android y pulido | `capacitor-release` + `qa-reviewer` (regresión completa antes de empaquetar) |

**Regla práctica:** nunca corras `ui-builder` y `db-architect` sobre el mismo cambio al mismo tiempo — si una pantalla necesita una columna nueva, primero `db-architect` cierra la migración, recién después `ui-builder` la consume. Evita que un agente escriba código contra un schema que el otro todavía está cambiando.
