-- Migration 0008: Funciones RPC para soporte de Offline-First, Ledger Bundles y cálculo acelerado de saldos

-- 1. get_account_balances_summary: cálculo consolidado de saldos por cuenta ejecutado en el motor de base de datos
create or replace function get_account_balances_summary(p_as_of_date date default current_date)
returns table (
  account_id uuid,
  currency text,
  balance numeric
)
security invoker
language sql
stable
as $$
  select 
    account_id,
    currency_account as currency,
    round(coalesce(sum(
      case 
        when type = 'OUTCOME' then -abs(amount_account)
        when type = 'INCOME' then abs(amount_account)
        else amount_account
      end
    ), 0), 2) as balance
  from master_transactions
  where user_id = auth.uid()
    and status = 'COMPLETED'
    and date <= p_as_of_date
  group by account_id, currency_account;
$$;

-- 2. commit_ledger_bundle: inserción atómica e idempotente de lotes contables (cuotas o transferencias)
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
    notes text
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
      notes
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
      r.notes
    )
    on conflict (id) do nothing;
    
    inserted_count := inserted_count + 1;
  end loop;

  return jsonb_build_object('success', true, 'count', inserted_count);
end;
$$;
