# Registro de Versiones (Changelog) — Finance Nomad

Todas las modificaciones notables, nuevas funcionalidades y correcciones de este proyecto se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y adhiere a [Semantic Versioning](https://semver.org/lang/es/).

> [!IMPORTANT]
> **Instrucción para Agentes y Desarrolladores**:
> Ante cada cambio, refactorización, corrección de bugs o nueva funcionalidad implementada, **es obligatorio actualizar este archivo** agregando los detalles bajo la versión correspondiente o en la sección `[Unreleased]`.

---

## [Unreleased]

---

## [1.3.0] - 2026-10-09
### Agregado
- **Modal de Previsualización y Edición previa para WhatsApp (`WhatsAppNotifyModal`)** (PRD §4.5):
  - Al presionar **"Notificar por WhatsApp"** en la ficha de persona ([PersonActions.tsx](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/PersonActions.tsx)), ahora se despliega un modal interactivo antes de abrir la aplicación externa.
  - Permite revisar el destinatario, validar su número de teléfono y editar libremente el contenido final del mensaje en un editor integrado.
  - Opción de "Restablecer plantilla" para volver al texto generado originalmente si se desea descartar cambios manuales.
  - Enlace rápido hacia la configuración de la plantilla base en `/people/template`.
  - Botón de confirmación **"Abrir en WhatsApp"** que redirige a la API de WhatsApp (`wa.me`) con el texto final editado.
- **Configuración de Plantilla Dinámica para WhatsApp (`/people/template`)** (PRD §4.5):
  - Botón de acceso directo **"Plantilla WhatsApp"** en el encabezado de `/people` y atajo con ícono de configuración en la barra de acciones de la ficha de persona (`PersonActions.tsx`).
  - Pantalla y modal de configuración (`/people/template` y `@modal/(.)people/template`) para editar la plantilla de mensaje predeterminada.
  - Soporte de variables dinámicas: `$Nombre`, `$Total`, `$Detalle`, `$Cantidad`, y `$Fecha`, con chips interactivos para insertar en la posición del cursor.
  - Previsualización en tiempo real (*Live Preview*) que renderiza el mensaje formateado con datos de muestra.
  - Botón para "Restablecer por defecto" la plantilla sugerida por el sistema.
  - Persistencia de la plantilla por usuario en `user_settings.whatsapp_template` mediante Server Action `updateWhatsAppTemplate`.
  - Migración SQL `supabase/migrations/0007_whatsapp_template.sql` para añadir la columna a `user_settings`.
  - Módulo utilitario [apps/web/lib/whatsapp.ts](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/whatsapp.ts) y suite de pruebas unitarias en Vitest (`apps/web/lib/whatsapp.test.ts`).
- **CRUD Completo de Personas y Contactos (`/people`)** (PRD §4.5):
  - Botón **"Nueva persona"** en la cabecera de `/people` con modal interactivo (`@modal/(.)people/new`) y ruta de fallback directo (`/people/new`).
  - Componente `PersonForm.tsx` para alta y edición de nombre y teléfono (con tip contextual para formatear con código de país para WhatsApp).
  - Modal y ruta de edición individual (`/people/[id]/edit` y `@modal/(.)people/[id]/edit`).
  - Acceso directo a edición mediante ícono de lápiz en el directorio de `/people` y botón "Editar" en la cabecera de la ficha `/people/[id]`.
  - **Baja lógica y desactivación condicional a saldo 0**:
    - Server Action `setPersonActive(id, isActive)` que bloquea la desactivación si la persona registra movimientos pendientes por cobrar (`saldo > 0`), arrojando mensaje explicativo.
    - Protección contra la desactivación o renombramiento del contacto de sistema `Personal`.
    - Sección colapsable en `/people` para explorar "Personas desactivadas" (patrón visual idéntico a Cuentas e Instituciones).
    - Badge semántico `Desactivada` en la ficha de detalle de la persona.
    - Exclusión automática de contactos desactivados de las opciones de nuevos gastos en `TransactionForm.tsx`.
    - Migración `supabase/migrations/0006_people_is_active.sql` con columna `is_active`, índice y trigger SQL `prevent_hard_delete_ledger_entities()` para evitar borrados físicos (`DELETE`) que rompan el historial contable.
- **Cuotas de Tarjetas Ligadas y Estado PENDING** (PRD §3.3):
  - Las compras en $N$ cuotas ahora enlazan todas las cuotas secundarias ($2..N$) a la cuota inicial mediante `parent_transaction_id`.
  - Las cuotas de meses futuros se generan con estado `PENDING`, evitando que descuenten saldo nominal de meses posteriores desde el día 1.
  - Cálculo robusto de fechas de vencimiento de cuotas (`calculateInstallmentDate`) que evita desfases de zona horaria y desbordes de fin de mes (ej. 31 de enero $\rightarrow$ 28 de febrero).
  - División proporcional tanto del importe en moneda original (`amount_original`) como en moneda de cuenta (`amount_account`) usando `splitInstallments`.
  - **Línea de crédito en Tarjetas de Crédito**: La ficha de cuenta calcula el disponible descontando tanto el saldo líquido adeudado del mes como los compromisos retenidos en cuotas futuras pendientes.
  - **Componente y Server Action `confirmTransaction`**: Botón interactivo para confirmar y activar cuotas pendientes cuyo ciclo o fecha ya llegó al día actual (`date <= today`).
  - Badge visual `Pendiente` en los listados de transacciones de Cuenta, Dashboard y Movimientos.
  - Texto informativo dinámico en el selector de cuotas de `TransactionForm.tsx` explicitando el número de cuotas completadas hoy vs. cuotas pendientes diferidas.
- Enlaces directos de navegación en las tarjetas de cuentas del Dashboard (`/dashboard`) hacia la pantalla de detalle individual (`/accounts/{id}`).
- Enlace de acceso rápido "Ver todas" en el encabezado de la columna de Cuentas del Dashboard hacia `/accounts`.
- Resaltado visual en rojo (`text-expense`) para cuentas con saldo negativo (deuda de tarjeta o sobregiros) en el Dashboard.
- **Identificador Visual de Entorno y Versión (`/settings`)** (PRD §6):
  - Componente `SystemInfoCard` en la pantalla de Ajustes con badge semántico dinámico para distinguir entornos (`Desarrollo`, `Pre-producción` y `Producción`).
  - Banner contextual informativo que explicita si la app está operando con datos de prueba o contabilidad real.
  - Visualización en monospace de la versión instalada (`vX.Y.Z`) y host de la base de datos Supabase conectada.
  - Módulo centralizado de detección de entorno y versión (`apps/web/lib/version.ts`) con suite de tests en Vitest.
  - Micro-indicador discreto de versión y entorno en el pie de la barra lateral de navegación (`Navigation.tsx`).

### Modificado
- **Reglas de Proyecto para Agentes (`AGENTS.md`, `.claude/`)**: Establecimiento de la directiva obligatoria que exige recordar explícitamente al usuario la ejecución de cualquier script SQL de migración en Supabase, entregando siempre el bloque de código listo para copiar y pegar.
- **Idempotencia de Migración (`supabase/migrations/0006_people_is_active.sql`)**: Inclusión autocontenida de la función `prevent_hard_delete_ledger_entities()` para garantizar ejecución exitosa independientemente de si la migración `0005` fue corrida previamente o no.
- **Sincronización de Versión del Paquete (`apps/web/package.json`)**: Actualización de versión a `1.3.0` (alineada con el changelog de lanzamientos) e inyección automática en compilación vía `next.config.js`.
- **Cálculo de Patrimonio y Saldos (`apps/web/lib/networth.ts`)**: `getAccountBalances` y `getSingleAccountBalance` ahora filtran estrictamente transacciones con `status = 'COMPLETED'`, preservando la liquidez real.
- **Presupuesto del Mes (`/dashboard`)**: `realSpent` computa únicamente consumos ejecutados con `status = 'COMPLETED'`.


---

## [1.2.0] - 2026-09-13
### Agregado
- **Pantalla de Detalle de Cuenta (`/accounts/[id]`)** (PRD §3.2):
  - Encabezado con nombre, institución bancaria asociada, tipo de producto y divisa nativa.
  - Saldo nominal actual con destaque visual diferenciado para tarjetas de crédito (deuda).
  - Indicadores clave del mes: Gastos, Ingresos, y para tarjetas: Deuda acumulada y Pagos realizados.
  - Historial filtrado de movimientos (`master_transactions`) exclusivo de la cuenta con paginación/scroll.
  - Botón de acción contextual en cabecera: **"Registrar pago"** para cuentas de tipo `credit_card`, y **"Ajuste express"** para el resto de cuentas (`checking`, `savings`, `cash`, `investing`).
- **Transferencias Inter-Cuenta y Asientos Contables Ligados** (PRD §3.1):
  - Server Action `createTransferTransaction`: genera 2 filas atómicas en `master_transactions` enlazadas mediante `parent_transaction_id` (débito con signo negativo en cuenta origen, crédito con signo positivo en cuenta destino).
  - Soporte multi-divisa con conversión de tipo de cambio en tiempo real o ingresado manualmente.
  - Pestaña "Transferencia" en el formulario universal de transacciones (`apps/web/components/TransactionForm.tsx`).
- **Modal de Pago de Tarjeta de Crédito (`RegisterCardPaymentModal`)** (PRD §3.3):
  - Precarga automática del saldo adeudado de la tarjeta con botón de atajo "Pagar total".
  - Selector de cuenta bancaria pagadora (filtrado por cuentas líquidas activas).
  - Cálculo automático multi-moneda con preview en vivo del débito en moneda origen y crédito exacto en la tarjeta destino (`amountFrom` vs `amountTo`).
  - Al registrarse como transferencia (`TRANSFER`), no infla ni duplica los reportes de gastos del presupuesto mensual.
- **Modal de Ajuste Express (`ExpressAdjustModal`)** (PRD §3.2):
  - Cálculo de la diferencia entre el saldo del sistema y el saldo real que informa el banco.
  - Generación de movimiento contable de ajuste (`ADJUSTMENT`) para conciliar saldos sin alterar categorías de presupuesto.
- **Botón y Acción de Eliminación de Movimientos (`DeleteTransactionButton`)**:
  - Permite eliminar transacciones individuales desde el feed de la cuenta.
  - En transferencias y pagos enlazados, elimina automáticamente en cascada ambos asientos vinculados por `parent_transaction_id`.
- **Selector de Tema Claro / Oscuro (`ThemeToggle`)**:
  - Toggle accesible en la barra de navegación que persiste la preferencia en `localStorage` y actualiza la clase `dark` en el elemento raíz `<html>`.

### Corregido
- **Conversión de Divisas en Pagos de Tarjeta**: Corrección del cálculo contable en transferencias con monedas dispares donde la moneda original ingresada pertenecía a la cuenta destino (ej. pagar tarjeta en UYU con fondos de cuenta en EUR). Ahora debita el monto exacto convertido en la cuenta bancaria y acredita el 100% de la deuda en la tarjeta.
- **Eliminación de Signos Duplicados en Feeds**: Corrección del renderizado en las listas de transacciones del Dashboard y Movimientos para filas `TRANSFER` y `ADJUSTMENT`.
- **Manejo de Redirecciones en Server Actions**: Adición del helper `rethrowRedirect` para asegurar que las redirecciones en formularios cliente no sean capturadas por bloques `try/catch`.

---

## [1.1.0] - 2026-08-28
### Agregado
- **Estructura Base del Proyecto**:
  - Aplicación Next.js 14 con App Router y Tailwind CSS en `apps/web`.
  - Sistema de diseño financiero Finance Nomad con paleta de tokens semánticos (CSS variables) y tipografía mono para montos numéricos.
  - Módulo de autenticación Supabase con soporte para email/password, confirmación de correo y restablecimiento de contraseña.
- **Módulo de Cuentas e Instituciones** (PRD §1):
  - CRUD de instituciones financieras (bancos, billeteras, fintechs).
  - CRUD de cuentas monetarias asociadas a instituciones con soporte multi-moneda (`EUR`, `USD`, `UYU`, etc.).
  - Filtro de instituciones y cuentas activas / inactivas con triggers SQL de protección contra hard deletes.
- **Módulo de Movimientos / Ledger Mínimo** (PRD §2):
  - Formulario de registro de ingresos y gastos con conversión FX automática.
  - Listado de transacciones con filtros y detalle de cuotas (`installment_current` de `installment_total`).
- **Dashboard Principal** (PRD §6):
  - Visualización del Patrimonio Neto total consolidado en la moneda de preferencia del usuario (`display_currency`).
  - Resumen mensual de presupuesto gastado vs. proyectado.
  - Columnas de cuentas e historial reciente de movimientos.
- **Módulo de Personas y Préstamos Base** (PRD §4):
  - Listado y creación de personas para control de deudas/préstamos.
  - Ficha de persona con saldos consolidados y liquidación de deudas.
- **Módulo de Configuración de Usuario (`/settings`)**:
  - Selección de moneda global de presentación (`user_settings`).
- **Base de Datos y Migraciones**:
  - Esquema SQL inicial (`0001_init_schema.sql` a `0005_prevent_hard_delete.sql`) con RLS exhaustivo y protección contra borrado físico.
