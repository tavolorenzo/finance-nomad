-- Migración 0012: Soporte para monedas dinámicas y tipos de cambio directos
-- Permite al usuario tener monedas activas personalizadas y definir cotizaciones manuales contra su moneda global.

alter table user_settings
add column if not exists active_currencies jsonb not null default '[
  {"code": "EUR", "symbol": "€", "name": "Euro", "flag": "🇪🇺", "rate_mode": "auto"},
  {"code": "USD", "symbol": "US$", "name": "Dólar estadounidense", "flag": "🇺🇸", "rate_mode": "auto"},
  {"code": "AUD", "symbol": "A$", "name": "Dólar australiano", "flag": "🇦🇺", "rate_mode": "auto"},
  {"code": "UYU", "symbol": "$UY", "name": "Peso uruguayo", "flag": "🇺🇾", "rate_mode": "auto"},
  {"code": "NZD", "symbol": "NZ$", "name": "Dólar neozelandés", "flag": "🇳🇿", "rate_mode": "auto"}
]'::jsonb;
