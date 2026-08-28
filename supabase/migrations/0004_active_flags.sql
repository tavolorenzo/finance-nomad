-- Fase de CRUD de instituciones/cuentas: baja lógica, nunca física.
-- La arquitectura tiene on delete cascade desde accounts/institutions hacia
-- master_transactions -- un DELETE real destruiría el historial contable.
-- Por eso el "borrado" es siempre is_active = false, nunca DELETE FROM.

alter table institutions add column is_active boolean not null default true;
alter table accounts add column is_active boolean not null default true;

create index idx_institutions_active on institutions (user_id, is_active);
create index idx_accounts_active on accounts (institution_id, is_active);
