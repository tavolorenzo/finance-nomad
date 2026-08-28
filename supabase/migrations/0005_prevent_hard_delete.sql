-- El "borrado" de instituciones y cuentas es siempre is_active = false.
-- Un DELETE real en institutions cascada a accounts (FK on delete cascade)
-- y deja el ledger huérfano de nombres, o falla si hay movimientos.
-- Este trigger bloquea DELETE FROM; hay que desactivar.

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

drop trigger if exists no_delete_institutions on institutions;
create trigger no_delete_institutions
  before delete on institutions
  for each row execute procedure prevent_hard_delete_ledger_entities();

drop trigger if exists no_delete_accounts on accounts;
create trigger no_delete_accounts
  before delete on accounts
  for each row execute procedure prevent_hard_delete_ledger_entities();
