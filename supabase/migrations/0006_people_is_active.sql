-- Fase de CRUD de personas: baja lógica (is_active = false), nunca DELETE físico.
-- Un DELETE en people rompería la integridad del ledger maestro.
-- Por eso las personas se desactivan si tienen saldo 0, preservando el historial contable.

alter table people
  add column if not exists is_active boolean not null default true;

create index if not exists idx_people_active
  on people (user_id, is_active);

-- Función para bloquear DELETE físico (idempotente, garantiza existencia si no se corrió 0005)
create or replace function prevent_hard_delete_ledger_entities()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'No se puede borrar %. Desactivá el registro (is_active = false).',
    TG_TABLE_NAME;
end;
$$;

-- Bloquear DELETE físico en people
drop trigger if exists no_delete_people on people;
create trigger no_delete_people
  before delete on people
  for each row execute procedure prevent_hard_delete_ledger_entities();

