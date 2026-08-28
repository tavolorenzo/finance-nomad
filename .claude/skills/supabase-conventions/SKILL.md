---
name: supabase-conventions
description: Usar siempre que se cree una migración nueva en supabase/migrations o se escriba una policy RLS. Disparadores — agregar tabla, agregar columna, cambiar una policy.
---

- Nombre de archivo: NNNN_descripcion_corta.sql, numeración secuencial,
  nunca reescribir una migración ya aplicada — siempre una nueva.
- snake_case en tablas y columnas. PK siempre uuid con gen_random_uuid().
- Toda tabla con datos de usuario lleva user_id uuid references auth.users(id)
  on delete cascade, RLS enabled, y policy "own rows only" using (auth.uid() = user_id).
- Índices sobre toda FK que se use en filtros frecuentes (ver 0001_init_schema.sql
  como referencia de estilo).

## Auth y rutas protegidas
- Las pantallas autenticadas viven en app/(protected)/ — el middleware
  (middleware.ts + lib/supabase/middleware.ts) redirige a /login si no hay
  sesión, y el layout de ese grupo repite el chequeo como defensa en
  profundidad. Cualquier pantalla nueva de usuario logueado va adentro de
  ese grupo, no suelta en app/.
- Nunca uses supabase.auth.getSession() en servidor para decidir acceso —
  usá siempre getUser(), que revalida contra el servidor de Supabase en vez
  de confiar en la cookie sin verificar.
