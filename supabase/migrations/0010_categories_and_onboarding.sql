-- Migración 0010: Categorías de gastos enriquecidas y Setup Tour
-- Agrega columnas de icono, color semántico y baja lógica a categories,
-- e incorpora el flag onboarding_completed en user_settings.

-- 1. Ampliar categories con soporte de icono, color semántico y soft delete
alter table categories
  add column if not exists icon text default 'tag',
  add column if not exists color text default 'accent',
  add column if not exists is_active boolean not null default true;

-- Índice para búsquedas rápidas de categorías activas por usuario
create index if not exists idx_categories_user_active on categories (user_id, is_active);

-- 2. Ampliar user_settings con control de onboarding completado
alter table user_settings
  add column if not exists onboarding_completed boolean not null default false;
