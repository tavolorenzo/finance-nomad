-- Fase de Personalización: Plantilla de mensajes de WhatsApp en user_settings.
-- Permite al usuario definir un formato personalizado con variables ($Nombre, $Total, $Detalle, etc.).

alter table user_settings
  add column if not exists whatsapp_template text;
