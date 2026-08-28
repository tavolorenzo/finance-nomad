-- Fase 2: tracking de cobros a personas.
-- No agregamos una tabla de "liquidaciones" separada -- alcanza con marcar
-- qué filas del ledger ya se cobraron, sin tocar el monto original (el
-- ledger sigue siendo la fuente de verdad contable).

alter table master_transactions
  add column settled_at timestamptz;

create index idx_master_transactions_person_pending
  on master_transactions (person_id, settled_at)
  where settled_at is null;

-- Para "Notificar por WhatsApp" con deep link directo al contacto.
alter table people
  add column phone text;
