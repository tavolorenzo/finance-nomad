-- ==============================================================================
-- Migración 0016: Módulo de Portafolio de Inversiones (Cotización Auto/Manual y Vínculo Opcional)
-- ==============================================================================
-- Amplía la tabla 'portfolio_transactions' para dar soporte completo a:
-- 1. Vínculo opcional con cuenta bancaria (funding_account_id nullable y linked_transaction_id).
-- 2. Clasificación de activos (STOCK, ETF, CRYPTO, FIXED_INCOME, LOCAL) y nombre descriptivo.
-- 3. Doble modalidad de cotización: automática por ticker ('auto') o valor manual ('manual').
-- 4. Mayor precisión decimal en unidades (hasta 6 decimales para cripto/fracciones) y precios.
-- ==============================================================================

-- 1. Permitir registrar compras/ventas históricas sin impactar obligatoriamente una cuenta bancaria
alter table portfolio_transactions
  alter column funding_account_id drop not null,
  alter column units type numeric(18,6),
  alter column price_per_unit type numeric(16,4);

-- 2. Agregar metadatos del activo, modalidad de cotización y vínculo contable
alter table portfolio_transactions
  add column if not exists asset_name text,
  add column if not exists asset_type text not null default 'STOCK'
    check (asset_type in ('STOCK', 'ETF', 'CRYPTO', 'FIXED_INCOME', 'LOCAL')),
  add column if not exists quote_mode text not null default 'auto'
    check (quote_mode in ('auto', 'manual')),
  add column if not exists manual_price numeric(16,4),
  add column if not exists linked_transaction_id uuid references master_transactions(id) on delete set null,
  add column if not exists notes text;

-- 3. Índices de rendimiento para consultas de portafolio e historial
create index if not exists idx_portfolio_transactions_user_date
  on portfolio_transactions (user_id, date desc);

create index if not exists idx_portfolio_transactions_user_ticker
  on portfolio_transactions (user_id, ticker);

