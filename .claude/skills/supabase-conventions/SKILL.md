---
name: supabase-conventions
description: Usar siempre que se cree una migración nueva en supabase/migrations o se escriba una policy RLS. Disparadores — agregar tabla, agregar columna, cambiar una policy.
---

- Nombre de archivo: NNNN_descripcion_corta.sql, numeración secuencial,
  nunca reescribir una migración ya aplicada — siempre una nueva.
- snake_case en tablas y columnas. PK siempre uuid con gen_random_uuid().
- Toda tabla con datos de usuario lleva user_id uuid references auth.users(id)
  on delete cascade, RLS enabled, y policy "own rows only" using (auth.uid() = user_id).
- Integridad y Soft Deletes: No realizar borrados físicos (`DELETE`) en `institutions`,
  `accounts` ni `people`. Utilizar siempre `is_active = false` (el trigger SQL
  `prevent_account_hard_delete` protege las cuentas contra borrado accidental).
- Agregaciones y operaciones masivas: Usar funciones RPC indexadas (`SECURITY DEFINER`
  o filtrando por `auth.uid() = user_id`) como `get_account_balances_summary` y
  `commit_ledger_bundle` para evitar sobrecargar la memoria de Node con historiales masivos.
- Índices sobre toda FK que se use en filtros frecuentes (ver 0001_init_schema.sql y 0008_ledger_sync_and_snapshot.sql).
- Recordatorio de ejecución: Toda tarea que genere o altere migraciones SQL debe
  recordar explícitamente al usuario ejecutar el script en el SQL Editor de Supabase
  con el snippet de código listo para copiar.


## Auth y rutas protegidas
- Las pantallas autenticadas viven en app/(protected)/ — el middleware
  (middleware.ts + lib/supabase/middleware.ts) redirige a /login si no hay
  sesión, y el layout de ese grupo repite el chequeo como defensa en
  profundidad. Cualquier pantalla nueva de usuario logueado va adentro de
  ese grupo, no suelta en app/.
- Nunca uses supabase.auth.getSession() en servidor para decidir acceso —
  usá siempre getUser(), que revalida contra el servidor de Supabase en vez
  de confiar en la cookie sin verificar.
