-- ==============================================================================
-- Migración 0015: Soporte de Cascada para Baja de Usuario (auth.users)
-- ==============================================================================
-- 1. Actualiza 'prevent_hard_delete_ledger_entities()' para mantener bloqueado el
--    borrado físico en el uso normal de la app (obligando a usar is_active = false),
--    pero permitiendo el DELETE cuando:
--      a) El usuario propietario se elimina de auth.users (cascada ON DELETE CASCADE),
--      b) La operación la ejecuta el servicio de Auth (supabase_auth_admin), o
--      c) Se habilita explícitamente en la sesión con: SET LOCAL app.allow_hard_delete = 'on'.
-- 2. Ajusta las claves foráneas internas de 'master_transactions', 'budget_estimates'
--    y 'portfolio_transactions' con ON DELETE CASCADE / SET NULL para evitar bloqueos
--    de orden de cascada al eliminar un usuario completo desde Supabase Auth.
-- ==============================================================================

-- 1. Actualizar función de trigger de protección (Soft Delete con excepción por baja de usuario)
create or replace function prevent_hard_delete_ledger_entities()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if current_user = 'supabase_auth_admin'
     or current_setting('app.allow_hard_delete', true) = 'on'
     or not exists (select 1 from auth.users where id = old.user_id)
  then
    return old;
  end if;

  raise exception
    'No se puede borrar %. Desactivá el registro (is_active = false).',
    TG_TABLE_NAME;
end;
$$;

-- 2. Asegurar ON DELETE CASCADE / SET NULL en FKs internas para que la cascada de auth.users no falle por orden de tablas

-- 2.1 master_transactions
alter table master_transactions
  drop constraint if exists master_transactions_institution_id_fkey,
  add constraint master_transactions_institution_id_fkey
    foreign key (institution_id) references institutions(id) on delete cascade;

alter table master_transactions
  drop constraint if exists master_transactions_account_id_fkey,
  add constraint master_transactions_account_id_fkey
    foreign key (account_id) references accounts(id) on delete cascade;

alter table master_transactions
  drop constraint if exists master_transactions_category_id_fkey,
  add constraint master_transactions_category_id_fkey
    foreign key (category_id) references categories(id) on delete set null;

alter table master_transactions
  drop constraint if exists master_transactions_person_id_fkey,
  add constraint master_transactions_person_id_fkey
    foreign key (person_id) references people(id) on delete set null;

-- 2.2 budget_estimates
alter table budget_estimates
  drop constraint if exists budget_estimates_category_id_fkey,
  add constraint budget_estimates_category_id_fkey
    foreign key (category_id) references categories(id) on delete cascade;

alter table budget_estimates
  drop constraint if exists budget_estimates_preferred_account_id_fkey,
  add constraint budget_estimates_preferred_account_id_fkey
    foreign key (preferred_account_id) references accounts(id) on delete set null;

-- 2.3 portfolio_transactions
alter table portfolio_transactions
  drop constraint if exists portfolio_transactions_funding_account_id_fkey,
  add constraint portfolio_transactions_funding_account_id_fkey
    foreign key (funding_account_id) references accounts(id) on delete cascade;

