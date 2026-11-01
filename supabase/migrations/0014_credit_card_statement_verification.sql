-- ==============================================================================
-- Migración 0014: Mes Contable y Verificación de Estado de Cuenta de Tarjetas
-- ==============================================================================
-- 1. Agrega 'closing_day' opcional en 'accounts' para tarjetas de crédito (1..31).
-- 2. Agrega 'accounting_period' (YYYY-MM), 'is_verified' y 'verified_at' en 'master_transactions'.
-- 3. Realiza backfill de 'accounting_period' usando la fecha del movimiento.
-- 4. Actualiza la función RPC 'commit_ledger_bundle' para persistir el período contable y verificación.
-- ==============================================================================

-- 1. Ampliar tabla 'accounts' con día de cierre para tarjetas de crédito
alter table accounts
  add column if not exists closing_day int check (closing_day between 1 and 31);

-- 2. Ampliar tabla 'master_transactions' con mes contable y estado de verificación
alter table master_transactions
  add column if not exists accounting_period text check (accounting_period is null or accounting_period ~ '^[0-9]{4}-[0-9]{2}$'),
  add column if not exists is_verified boolean not null default false,
  add column if not exists verified_at timestamptz;

-- 3. Backfill de accounting_period para transacciones existentes
update master_transactions
set accounting_period = to_char(date, 'YYYY-MM')
where accounting_period is null;

-- 4. Índices para consulta rápida por tarjeta y período contable
create index if not exists idx_master_transactions_account_period
  on master_transactions (account_id, accounting_period);

-- 5. Actualizar commit_ledger_bundle con soporte de accounting_period e is_verified
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
    settled_amount numeric(12,2),
    accounting_period text,
    is_verified boolean,
    verified_at timestamptz
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
      settled_amount,
      accounting_period,
      is_verified,
      verified_at
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
      coalesce(r.settled_amount, 0),
      coalesce(r.accounting_period, to_char(r.date, 'YYYY-MM')),
      coalesce(r.is_verified, false),
      r.verified_at
    )
    on conflict (id) do update set
      settled_at = excluded.settled_at,
      settled_amount = coalesce(excluded.settled_amount, master_transactions.settled_amount),
      accounting_period = coalesce(excluded.accounting_period, master_transactions.accounting_period),
      is_verified = coalesce(excluded.is_verified, master_transactions.is_verified),
      verified_at = coalesce(excluded.verified_at, master_transactions.verified_at);

    inserted_count := inserted_count + 1;
  end loop;

  return jsonb_build_object('success', true, 'count', inserted_count);
end;
$$;

