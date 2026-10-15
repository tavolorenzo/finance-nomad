-- Migration 0009: Soporte de pagos parciales y liquidación por amortización en gastos de personas
-- Agrega settled_amount en master_transactions y actualiza commit_ledger_bundle con soporte upsert

-- 1. Columna settled_amount con valor por defecto 0
alter table master_transactions
  add column if not exists settled_amount numeric(12,2) not null default 0;

-- 2. Backfill: transacciones históricas que ya tenían settled_at quedan con settled_amount = amount_account
update master_transactions
set settled_amount = amount_account
where settled_at is not null and settled_amount = 0;

-- 3. Índice para acelerar la consulta de saldos pendientes de personas
create index if not exists idx_master_transactions_person_settlement
  on master_transactions (person_id, settled_at)
  where person_id is not null;

-- 4. Actualizar commit_ledger_bundle para soportar settled_amount, settled_at y actualización atómica
create or replace function commit_ledger_bundle(p_rows jsonb)
returns jsonb
security invoker
language plpgsql
as $$
declare
  r record;
  inserted_count int := 0;
begin
  for r in select * from jsonb_to_recordset(p_rows) as (
    id uuid,
    parent_transaction_id uuid,
    date date,
    type text,
    amount_original numeric(12,2),
    currency_original text,
    fee_amount numeric(12,2),
    exchange_rate numeric(12,6),
    rate_overridden boolean,
    amount_account numeric(12,2),
    currency_account text,
    institution_id uuid,
    account_id uuid,
    category_id uuid,
    person_id uuid,
    installment_current int,
    installment_total int,
    status text,
    notes text,
    settled_at timestamptz,
    settled_amount numeric(12,2)
  )
  loop
    insert into master_transactions (
      id,
      user_id,
      parent_transaction_id,
      date,
      type,
      amount_original,
      currency_original,
      fee_amount,
      exchange_rate,
      rate_overridden,
      amount_account,
      currency_account,
      institution_id,
      account_id,
      category_id,
      person_id,
      installment_current,
      installment_total,
      status,
      notes,
      settled_at,
      settled_amount
    ) values (
      r.id,
      auth.uid(),
      r.parent_transaction_id,
      r.date,
      r.type,
      r.amount_original,
      r.currency_original,
      coalesce(r.fee_amount, 0),
      coalesce(r.exchange_rate, 1),
      coalesce(r.rate_overridden, false),
      r.amount_account,
      r.currency_account,
      r.institution_id,
      r.account_id,
      r.category_id,
      r.person_id,
      coalesce(r.installment_current, 1),
      coalesce(r.installment_total, 1),
      coalesce(r.status, 'COMPLETED'),
      r.notes,
      r.settled_at,
      coalesce(r.settled_amount, 0)
    )
    on conflict (id) do update set
      settled_at = excluded.settled_at,
      settled_amount = coalesce(excluded.settled_amount, master_transactions.settled_amount);
    
    inserted_count := inserted_count + 1;
  end loop;

  return jsonb_build_object('success', true, 'count', inserted_count);
end;
$$;
