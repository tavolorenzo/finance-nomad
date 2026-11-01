-- ==============================================================================
-- Migración 0013: Módulo de Préstamos Mejorado (Sistema Itaú Uruguay y Multi-Moneda)
-- ==============================================================================
-- Amplía las tablas 'loans' y 'loan_installments' para dar soporte completo a:
-- 1. Multi-moneda nativa (currency) y soft delete (is_active).
-- 2. Doble rol de contraparte: Institución Financiera y/o Persona (intermediación).
-- 3. Parámetros del Sistema Francés de Itaú Uruguay (TEA %, IVA 22%, cuotas, día de vencimiento).
-- 4. Cuenta de desembolso inicial y vinculación contable de pagos de cuotas.
-- ==============================================================================

-- 1. Ampliar tabla 'loans'
alter table loans
  add column if not exists currency text not null default 'USD',
  add column if not exists counterparty_institution_id uuid references institutions(id) on delete set null,
  add column if not exists beneficiary_person_id uuid references people(id) on delete set null,
  add column if not exists tea_rate numeric(6,4) not null default 0,
  add column if not exists includes_vat_22 boolean not null default false,
  add column if not exists total_installments int not null default 1 check (total_installments >= 1),
  add column if not exists start_date date not null default current_date,
  add column if not exists due_day int check (due_day between 1 and 31),
  add column if not exists disbursement_account_id uuid references accounts(id) on delete set null,
  add column if not exists notes text,
  add column if not exists status text not null default 'ACTIVE' check (status in ('ACTIVE', 'PAID', 'CANCELLED')),
  add column if not exists is_active boolean not null default true;

-- 2. Ampliar tabla 'loan_installments'
alter table loan_installments
  add column if not exists vat_amount numeric(12,2) not null default 0,
  add column if not exists paid_at timestamptz,
  add column if not exists account_id uuid references accounts(id) on delete set null,
  add column if not exists transaction_bundle_id uuid;

-- 3. Índices de rendimiento
create index if not exists idx_loans_user_active on loans (user_id, is_active);
create index if not exists idx_loans_counterparty_inst on loans (counterparty_institution_id);
create index if not exists idx_loans_beneficiary_person on loans (beneficiary_person_id);
create index if not exists idx_loan_installments_loan_period on loan_installments (loan_id, period);
create index if not exists idx_loan_installments_paid on loan_installments (loan_id, paid);
