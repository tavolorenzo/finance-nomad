-- Finance Nomad — schema inicial
-- Convención: snake_case, uuid pk con default, timestamps en toda tabla mutable.

create extension if not exists "pgcrypto";

-- ── Tablas de soporte (no están explícitas en el PRD pero las FKs las requieren) ──

create table institutions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,               -- Commbank, N26, Wise, ANZ, Itaú, Scotiabank
  created_at timestamptz not null default now()
);

create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  institution_id uuid not null references institutions(id) on delete cascade,
  name text not null,               -- Everyday, Saver, Investing, Visa, Amex
  type text not null check (type in ('checking','savings','investing','credit_card','cash')),
  currency_native text not null,    -- moneda nativa del producto
  credit_limit numeric(12,2),       -- solo para type = credit_card
  created_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,               -- Personal, Gladys, Diego, Ale, Romina
  created_at timestamptz not null default now()
);

-- ── Ledger maestro ──

create table master_transactions (
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
  created_at timestamptz not null default now()
);

create index idx_master_transactions_user_date on master_transactions(user_id, date desc);
create index idx_master_transactions_account on master_transactions(account_id);
create index idx_master_transactions_person on master_transactions(person_id);

-- ── Estimaciones / gastos fijos ──

create table budget_estimates (
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

-- ── Préstamos ──

create table loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  principal numeric(12,2) not null,
  direction text not null check (direction in ('BORROWED','LENT')),
  created_at timestamptz not null default now()
);

create table loan_installments (
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

-- ── Portafolio ──

create table portfolio_transactions (
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

-- ── Row Level Security: cada usuario ve solo lo suyo ──

alter table institutions enable row level security;
alter table accounts enable row level security;
alter table categories enable row level security;
alter table people enable row level security;
alter table master_transactions enable row level security;
alter table budget_estimates enable row level security;
alter table loans enable row level security;
alter table loan_installments enable row level security;
alter table portfolio_transactions enable row level security;

create policy "own rows only" on institutions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on accounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on categories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on people for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on master_transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on budget_estimates for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on loans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on loan_installments for all using (
  exists (select 1 from loans where loans.id = loan_installments.loan_id and loans.user_id = auth.uid())
);
create policy "own rows only" on portfolio_transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
