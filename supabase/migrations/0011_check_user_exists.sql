-- Migración 0011: Verificación de existencia de usuario para login email-first
-- Expone una función RPC segura con SECURITY DEFINER para verificar si un email está registrado.

create or replace function public.check_user_exists(lookup_email text)
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

-- Permite la ejecución tanto a usuarios anónimos (anon) como autenticados (authenticated)
grant execute on function public.check_user_exists(text) to anon, authenticated;
