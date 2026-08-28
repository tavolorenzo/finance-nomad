-- Fase 3: preferencia de moneda global (M1) y soporte para el presupuesto (M5).

create table user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_currency text not null default 'EUR',
  theme text not null default 'system' check (theme in ('system','light','dark')),
  updated_at timestamptz not null default now()
);

alter table user_settings enable row level security;
create policy "own row only" on user_settings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
