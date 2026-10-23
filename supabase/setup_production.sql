-- ==============================================================================
-- Finance Nomad — Setup Inicial de Base de Datos para Producción (v2.8.0)
-- ==============================================================================
-- Este script consolida las 12 migraciones del proyecto (0001 a 0012) en una sola
-- ejecución directa para inicializar un nuevo proyecto de Supabase en producción.
--
-- Incluye:
--  1. Extensión pgcrypto para generación de UUIDs.
--  2. 10 tablas completas con constraints, defaults y soft-deletes (is_active).
--  3. Índices optimizados para Ledger Maestro, cuentas, personas y categorías.
--  4. Triggers de protección contra borrado físico (prevent_hard_delete).
--  5. Funciones RPC para cálculo de saldos y sincronización atómica (Ledger Bundles),
--     verificación de existencia de usuario (check_user_exists) y monedas dinámicas.
--  6. Políticas completas de Row Level Security (RLS) aisladas por usuario.
-- ==============================================================================

-- 1. EXTENSIONES
create extension if not exists "pgcrypto";

-- ==============================================================================
-- 2. TABLAS BASE
-- ==============================================================================

-- ── 2.1 Instituciones Financieras ──
create table if not exists institutions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,               -- Commbank, N26, Wise, ANZ, Itaú, Scotiabank
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── 2.2 Cuentas Bancarias / Tarjetas / Efectivo ──
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  institution_id uuid not null references institutions(id) on delete cascade,
  name text not null,               -- Everyday, Saver, Investing, Visa, Amex, Cash
  type text not null check (type in ('checking','savings','investing','credit_card','cash')),
  currency_native text not null,    -- EUR, USD, AUD, UYU, etc.
  credit_limit numeric(12,2),       -- solo para type = 'credit_card'
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── 2.3 Categorías de Gastos e Ingresos ──
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text default 'tag',
  color text default 'accent',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── 2.4 Personas (Cuentas por cobrar / Split Pay) ──
create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,               -- Personal, Amigos, Familiares
  phone text,                       -- Teléfono para notificaciones de cobro por WhatsApp
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── 2.5 Ledger Maestro de Transacciones ──
create table if not exists master_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_transaction_id uuid references master_transactions(id) on delete cascade,
  date date not null,
  type text not null check (type in ('INCOME','OUTCOME','TRANSFER','ADJUSTMENT')),
  amount_original numeric(12,2) not null,
  currency_original text not null,
  fee_amount numeric(12,2) not null default 0,
  exchange_rate numeric(12,6) not null default 1,
  rate_overridden boolean not null default false,
  amount_account numeric(12,2) not null,
  currency_account text not null,
  institution_id uuid not null references institutions(id),
  account_id uuid not null references accounts(id),
  category_id uuid references categories(id),
  person_id uuid references people(id),
  installment_current int not null default 1,
  installment_total int not null default 1,
  status text not null check (status in ('COMPLETED','PENDING')) default 'COMPLETED',
  notes text,
  settled_at timestamptz,
  settled_amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

-- ── 2.6 Presupuesto / Gastos Estimados Fijos ──
create table if not exists budget_estimates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('INCOME_ESTIMATE','EXPENSE_ESTIMATE')),
  estimated_amount numeric(12,2) not null,
  currency text not null,
  category_id uuid not null references categories(id),
  due_day int check (due_day between 1 and 31),
  preferred_account_id uuid references accounts(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── 2.7 Préstamos ──
create table if not exists loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  principal numeric(12,2) not null,
  direction text not null check (direction in ('BORROWED','LENT')),
  created_at timestamptz not null default now()
);

create table if not exists loan_installments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references loans(id) on delete cascade,
  period int not null,
  installment_amount numeric(12,2) not null,
  interest numeric(12,2) not null default 0,
  payment numeric(12,2) not null,
  balance numeric(12,2) not null,
  due_date date,
  paid boolean not null default false
);

-- ── 2.8 Portafolio de Inversiones ──
create table if not exists portfolio_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ticker text not null,
  type text not null check (type in ('BUY','SELL')),
  units numeric(14,4) not null,
  price_per_unit numeric(12,2) not null,
  fee_amount numeric(12,2) not null default 0,
  currency text not null,
  funding_account_id uuid not null references accounts(id),
  date date not null,
  created_at timestamptz not null default now()
);

-- ── 2.9 Preferencias de Usuario y Personalización ──
create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_currency text not null default 'EUR',
  theme text not null default 'system' check (theme in ('system','light','dark')),
  whatsapp_template text,
  onboarding_completed boolean not null default false,
  active_currencies jsonb not null default '[
    {"code": "EUR", "symbol": "€", "name": "Euro", "flag": "🇪🇺", "rate_mode": "auto"},
    {"code": "USD", "symbol": "US$", "name": "Dólar estadounidense", "flag": "🇺🇸", "rate_mode": "auto"},
    {"code": "AUD", "symbol": "A$", "name": "Dólar australiano", "flag": "🇦🇺", "rate_mode": "auto"},
    {"code": "UYU", "symbol": "$UY", "name": "Peso uruguayo", "flag": "🇺🇾", "rate_mode": "auto"},
    {"code": "NZD", "symbol": "NZ$", "name": "Dólar neozelandés", "flag": "🇳🇿", "rate_mode": "auto"}
  ]'::jsonb,
  updated_at timestamptz not null default now()
);

-- ==============================================================================
-- 3. ÍNDICES DE RENDIMIENTO
-- ==============================================================================

create index if not exists idx_master_transactions_user_date on master_transactions(user_id, date desc);
create index if not exists idx_master_transactions_account on master_transactions(account_id);
create index if not exists idx_master_transactions_person on master_transactions(person_id);
create index if not exists idx_master_transactions_person_pending on master_transactions (person_id, settled_at) where settled_at is null;
create index if not exists idx_master_transactions_person_settlement on master_transactions (person_id, settled_at) where person_id is not null;

create index if not exists idx_institutions_active on institutions (user_id, is_active);
create index if not exists idx_accounts_active on accounts (institution_id, is_active);
create index if not exists idx_people_active on people (user_id, is_active);
create index if not exists idx_categories_user_active on categories (user_id, is_active);

-- ==============================================================================
-- 4. TRIGGERS DE PROTECCIÓN (SOFT DELETE)
-- ==============================================================================

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

drop trigger if exists no_delete_people on people;
create trigger no_delete_people
  before delete on people
  for each row execute procedure prevent_hard_delete_ledger_entities();

-- ==============================================================================
-- 5. FUNCIONES RPC (OFFLINE-FIRST, SALDOS Y LEDGER BUNDLES)
-- ==============================================================================

-- ── 5.1 Cálculo de saldos consolidados por cuenta ──
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

-- ── 5.2 Commit atómico e idempotente de lotes contables (Ledger Bundles) ──
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

-- ── 5.3 Verificación segura de usuario registrado para login email-first ──
create or replace function check_user_exists(lookup_email text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  return exists(
    select 1 
    from auth.users 
    where lower(email) = lower(trim(lookup_email))
  );
end;
$$;

grant execute on function check_user_exists(text) to anon, authenticated;

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ==============================================================================

alter table institutions enable row level security;
alter table accounts enable row level security;
alter table categories enable row level security;
alter table people enable row level security;
alter table master_transactions enable row level security;
alter table budget_estimates enable row level security;
alter table loans enable row level security;
alter table loan_installments enable row level security;
alter table portfolio_transactions enable row level security;
alter table user_settings enable row level security;

-- Políticas de aislamiento por usuario autenticado
drop policy if exists "own rows only" on institutions;
create policy "own rows only" on institutions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows only" on accounts;
create policy "own rows only" on accounts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows only" on categories;
create policy "own rows only" on categories for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows only" on people;
create policy "own rows only" on people for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows only" on master_transactions;
create policy "own rows only" on master_transactions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows only" on budget_estimates;
create policy "own rows only" on budget_estimates for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows only" on loans;
create policy "own rows only" on loans for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows only" on loan_installments;
create policy "own rows only" on loan_installments for all
  using (exists (select 1 from loans where loans.id = loan_installments.loan_id and loans.user_id = auth.uid()));

drop policy if exists "own rows only" on portfolio_transactions;
create policy "own rows only" on portfolio_transactions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own row only" on user_settings;
create policy "own row only" on user_settings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
