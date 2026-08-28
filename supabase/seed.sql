-- Datos de configuración base (reemplaza el import del Excel para arrancar
-- a probar la app ya mismo). Corré esto en el SQL Editor de Supabase DESPUÉS
-- de crear tu usuario (Authentication → Add user, o registrate desde la app).
--
-- Reemplazá 'TU_USER_ID_ACA' por el UUID real de tu usuario
-- (Authentication → Users → copiá el UUID).

do $$
declare
  v_user_id uuid := 'TU_USER_ID_ACA';
  v_commbank uuid;
  v_wise uuid;
  v_n26 uuid;
  v_scotiabank uuid;
begin
  insert into institutions (user_id, name) values
    (v_user_id, 'Commbank') returning id into v_commbank;
  insert into institutions (user_id, name) values
    (v_user_id, 'Wise') returning id into v_wise;
  insert into institutions (user_id, name) values
    (v_user_id, 'N26') returning id into v_n26;
  insert into institutions (user_id, name) values
    (v_user_id, 'Scotiabank') returning id into v_scotiabank;
  insert into institutions (user_id, name) values (v_user_id, 'Itaú');
  insert into institutions (user_id, name) values (v_user_id, 'ANZ');

  insert into accounts (user_id, institution_id, name, type, currency_native) values
    (v_user_id, v_commbank, 'Everyday', 'checking', 'AUD'),
    (v_user_id, v_wise, 'Everyday', 'checking', 'EUR'),
    (v_user_id, v_n26, 'Everyday', 'checking', 'EUR');
  insert into accounts (user_id, institution_id, name, type, currency_native, credit_limit) values
    (v_user_id, v_scotiabank, 'Amex', 'credit_card', 'UYU', 100000);
  insert into accounts (user_id, institution_id, name, type, currency_native) values
    (v_user_id, v_commbank, 'Cash', 'cash', 'AUD');

  insert into people (user_id, name) values
    (v_user_id, 'Personal'), (v_user_id, 'Gladys'), (v_user_id, 'Diego'),
    (v_user_id, 'Ale'), (v_user_id, 'Romina');

  insert into categories (user_id, name) values
    (v_user_id, 'Groceries'), (v_user_id, 'Fees'), (v_user_id, 'Split Pay'),
    (v_user_id, 'Rent'), (v_user_id, 'Transport'), (v_user_id, 'Entertainment');

  insert into budget_estimates (user_id, name, type, estimated_amount, currency, category_id, due_day, preferred_account_id, is_active)
  select v_user_id, 'Alquiler', 'EXPENSE_ESTIMATE', 350, 'EUR', c.id, 1, v_wise, true
  from categories c where c.user_id = v_user_id and c.name = 'Rent';

  insert into budget_estimates (user_id, name, type, estimated_amount, currency, category_id, due_day, preferred_account_id, is_active)
  select v_user_id, 'Supermercado', 'EXPENSE_ESTIMATE', 200, 'EUR', c.id, 15, v_wise, true
  from categories c where c.user_id = v_user_id and c.name = 'Groceries';
end $$;
