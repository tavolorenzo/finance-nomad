# Product Requirement Document (PRD): Personal Finance & Portfolio Manager (Backpacker & Nómada Edition)

## 1. Visión del Producto
Aplicación de finanzas personales, gestión de presupuestos, préstamos y seguimiento de inversiones orientada a usuarios con alta movilidad internacional (backpackers, nómadas digitales, expats). 

El sistema está optimizado para el manejo multi-moneda sin fricción, seguimiento de compras en cuotas diferidas, gestión de gastos compartidos con terceros (extensiones) y trazabilidad contable total a través de un libro diario maestro (*Ledger*). La interfaz busca la máxima simplicidad (registros en 3 segundos) manteniendo buenas prácticas de UI/UX.

---

## 2. Archivo Base de Contexto (Finances 2026 Workbook)
El proyecto toma como referencia directa la hoja de cálculo **`Finances 2026`**, compuesta por las siguientes pestañas y estructuras de origen:

1. **`CONFIG`**: Tabla paramétrica de tipos de cambio referenciales (AUD, EUR, USD, UYU, NZD), lista de bancos (`Commbank`, `N26`, `Wise`, `ANZ`, `Itaú`, `Scotiabank`), tipos de cuenta (`Everyday`, `Saver`, `Investing`, `Visa`, `Amex`), calendario de meses, personas asignadas (`Personal`, `Gladys`, `Diego`, `Ale`, `Romina`) y catálogo de categorías.
2. **`Account_Flow`**: Libro diario primario con registros de `Date`, `Moneda`, `Statement` (ciclo/cierre), `Movment` (Income/Outcome), `Import`, `Bank`, `Account`, `Categoria`, `Pagos` (seguimiento de cuotas, ej. *5 de 6*), `Persona` y `Nota`.
3. **`Expected_Account_Flow`**: Planificación de compromisos futuros y cuotas proyectadas con un indicador de verificación (`DONE: True/False`).
4. **`For_CSV_Import`**: Zona de preparación / staging para procesar y conciliar extractos bancarios descargados.
5. **`Loans`**: Tabla de amortización de préstamos (Período, Cuota, Interés, Pago, Saldo restante, Vencimiento `VTO`, Estado `Paid`).
6. **`Portfolio`**: Ficha de inversiones con tickers (`AAPL`, `TSLA`, `NFLX`, `DBK`, `XRP`, `BYD`), unidades, costo promedio, valor de mercado actual y cálculo de ganancias/pérdidas ($/\%$).
7. **`Monthly_Tracker` & `Dashboard`**: Tableros de control con cálculo de Patrimonio Neto Total, Balance Disponible, cumplimiento de Meta Anual ($59\%$) y desglose mensual por categorías.

---

## 3. Pilares de Arquitectura y Reglas de Negocio

### 3.1. Core Multi-Moneda y Cotizaciones (FX)
* **Moneda Global por Defecto (Display Currency):** Definible desde los ajustes (ej. AUD, EUR, USD). La pantalla principal convierte y consolida todo el Patrimonio Neto y Balance General en esta divisa en tiempo real. Se puede cambiar en 1 clic.
* **Saldos Nominales Reales:** En la vista de Cuentas y Bancos, los saldos se muestran en la moneda nativa de cada producto sin conversión forzada.
* **Soporte Dual en Transacciones:** Toda transacción guarda el importe original (moneda del gasto local) y el importe convertido (moneda de la cuenta impactada).
* **Tipos de Cambio (FX) y Cotizaciones Dinámicas:** Motor de cotizaciones estructurado con `open.er-api.com` (tiempo real y tasas fiables para más de 30 monedas globales y regionales como ARS, BRL, CLP, COP, MXN, UYU, AUD, NZD, EUR, USD) con fallback a Frankfurter API para cotizaciones del BCE.
* **Catálogo de Divisas Activas (`active_currencies`):** Cada usuario puede activar monedas del catálogo y configurar para cada divisa secundaria su modalidad:
  - `auto`: Consulta de mercado en vivo periódica con TTL de 1 hora en caché local.
  - `manual`: Cotización fija directa contra la moneda global (`1 [GLOBAL] = X [DIVISA]`, e.g. Dólar Blue o MEP), protegida de sobreescrituras automáticas de mercado y sincronizada en toda la aplicación.
* **Sobreescritura Manual en Transacciones:** Soporte para sobreescritura manual puntual a nivel transacción (`rate_overridden: true`) para respetar comisiones y tipos de cambio bancarios específicos.

### 3.2. Estructura Jerárquica de Bancos y Productos
Institución Financiera (Banco/Broker) -> Productos:
  - Cuentas (Corriente, Ahorro, Cash)
  - Créditos (Tarjetas, Préstamos)
  - Inversiones (Portafolios/Brokers)

* **Cuenta Cash (Default):** Existe por defecto en el sistema para registrar retiros de cajero (ATM) como transferencias desde cuentas bancarias hacia efectivo.
* **Baja Lógica (Soft Deletes) y Cascada por Baja de Usuario:** Durante el uso normal de la aplicación, ni instituciones, ni cuentas, ni personas sufren borrado físico en base de datos (`prevent_hard_delete_ledger_entities()`), utilizando siempre el flag `is_active = false`. Únicamente cuando se elimina la cuenta del usuario en `auth.users` (o mediante habilitación explícita de sesión `app.allow_hard_delete = 'on'`), el trigger permite la purga física en cascada (`ON DELETE CASCADE`) de todas sus entidades y movimientos asociados.

### 3.3. Tarjetas de Crédito, Cuotas y Extensiones
* **Compras en Cuotas Diferidas:** Un gasto de N pagos genera automáticamente N registros en la Base de Datos Maestra distribuidos mes a mes (1 de N, 2 de N, ...). La primera cuota se marca como `COMPLETED` y descuenta del saldo inmediatamente; las cuotas 2 a N se marcan como `PENDING` ligadas por `parent_transaction_id` y computan como compromisos diferidos/crédito sin restar saldo nominal por adelantado.
* **Gasto Asignado a Terceros (Extensiones / Personas):** Permite atribuir una compra (o sus cuotas) a un contacto (ej. Gladys). Incrementa la "Cuenta por Cobrar" de esa persona.
* **Pagos de Tarjeta:** Tratados como transferencias inter-cuenta (Disminuye saldo en cuenta bancaria, aumenta saldo disponible en la tarjeta) mediante dos filas enlazadas por `parent_transaction_id`.

### 3.4. Tabla Maestra de Transacciones (master_transactions) y Ledger Bundles
Todos los eventos de la app alimentan un *Ledger* o Libro Diario Unificado para garantizar consistencia contable, auditoría y análisis estadístico.
Las mutaciones se empaquetan en el cliente como **Ledger Bundles** atómicos e idempotentes, calculando saldos reactivos con la fórmula *Baseline + Delta* y sincronizándose de forma transparente mediante una cola *Outbox* local en IndexedDB.

---

## 4. Especificación de Pantallas y Navegación

### 4.1. Dashboard General (Home / Torre de Control)
* **Franja Superior de Balances y KPIs Clave (4 Cards Estratégicas):**
  - **Patrimonio Neto:** Valor patrimonial consolidado en divisa global (activos líquidos en cuentas menos pasivos consolidados).
  - **Cash Flow del Período:** Flujo neto ($\text{Ingresos} - \text{Gastos Propios}$), tasa de ahorro y desglose de entradas y salidas.
  - **Total Adeudado (Cálculo Híbrido):** Cifra principal con la deuda corriente a pagar (tarjetas de crédito y cuotas impagas de préstamos tomados) con badge secundario indicando el importe de cuotas futuras ya comprometidas en compras a plazo.
  - **Por Cobrar:** Cuentas por cobrar acumuladas de terceros (gastos compartidos con `settled_at is null`) y préstamos otorgados vigentes, con acceso directo a `/people`.
* **Switch de Período Rápido:** Alternador en la cabecera para cambiar la ventana de tiempo del Dashboard entre **"Mes actual"** (mes calendario en curso) y **"Últimos 30 días"** (ventana móvil para cubrir la bisagra del cambio de mes).
* **Separación Visual Nítida: Cuentas y Tarjetas de Crédito:**
  - **Cuentas & Efectivo:** Bloque exclusivo de liquidez inmediata (cuentas corrientes, cajas de ahorro, billeteras virtuales, efectivo e inversiones), con total consolidado disponible y accesos directos de creación y listado.
  - **Tarjetas de Crédito:** Bloque dedicado para plásticos con detección automática de red (VISA, Mastercard, AMEX), saldo corriente a pagar, estado del período contable o alerta de resumen mensual.
* **Radiografía de Gastos y Analítica:**
  - **Consumo Propio vs. Asumido por Terceros:** Barra dividida proporcional que aísla el costo de vida real personal frente a consumos pagados por cuenta de terceros a cobrar.
  - **Gastos Personales por Categoría:** Gráfico de barras horizontales estilizadas y desglose porcentual que refleja estrictamente los consumos propios.
* **Vista Rápida de Préstamos:** Resumen de préstamos activos tomados (`borrowed`) y otorgados (`lent`) con alerta destacada de la próxima cuota a vencer (monto, fecha y contraparte).
* **Movimientos Recientes:** Feed de últimas transacciones con doble indicador de moneda, insignias de tipo (`Transferencia`, `Ajuste`, `Pendiente`), badges de cuotas (`C de T`) y personas asignadas.
* **Banners Inteligentes:**
  - Recordatorio interactivo durante la ventana de cierre/verificación de resúmenes de tarjetas de crédito (primeros 5 y últimos 5 días del mes).
  - Tour guiado de incorporación (`OnboardingTour`) para nuevos usuarios.

### 4.2. Cuentas, Bancos e Instituciones
* Acordeones agrupados por Institución Financiera con totales consolidados y soporte de baja lógica (`is_active`).
* **Flujo Continuo Institución $\rightarrow$ Productos Financieros y Efectivo Opcional:** Al crear una institución desde `/accounts` (`InstitutionForm`), la creación de una cuenta `Efectivo` no es forzada sino opcional mediante una casilla desmarcada por defecto (dado que el `WelcomeWizard` ya inicializa la billetera de efectivo). Tras guardar la institución, el sistema redirige automáticamente a `/accounts/new?institutionId={id}` para configurar los productos financieros de esa entidad.
* **Saldo Inicial en Alta de Cuenta y Carga Múltiple (`AccountForm`):** Permite ingresar el **saldo inicial** opcional al crear cualquier producto (excepto tarjetas de crédito), generando un asiento `ADJUSTMENT` automático para evitar el *cold start*, e incluye la acción **"Crear y agregar otro producto"** para dar de alta varias cuentas en la misma institución sin salir del formulario.
* **Día de Cierre en Tarjetas de Crédito (`closing_day`):** Campo opcional en la configuración de tarjetas (1 a 31) que permite preseleccionar automáticamente el mes contable siguiente cuando se registra una compra posterior al cierre.
* **Ficha de Detalle de Cuenta (`/accounts/[id]`):** Incorpora una **Barra de Período Contable** interactiva (`< Período contable: Mes Año >`) homologada con `/cards` y `/people/[id]`, con soporte de query param `?period=YYYY-MM`, botón *"Volver al período actual"*, y selector de alcance del historial (*"Este período"* vs. *"Todos"*). Muestra el saldo nominal (o **Consumos del resumen del período** en tarjetas de crédito filtrados por `accounting_period`), balance disponible y compromisos diferidos/retención (para tarjetas de crédito), métricas del período seleccionado, feed de transacciones filtrado y acceso directo a acciones:
  - **Verificar Resumen (`/accounts/[id]/verify?period={period}`):** Acceso al módulo de conciliación mensual con propagación automática del período seleccionado.
  - **Ajuste Express de Saldo (`ExpressAdjustModal`):** Crea un movimiento automático de corrección contable (`ADJUSTMENT`) por la diferencia con el extracto bancario.
  - **Registrar Pago de Tarjeta (`RegisterCardPaymentModal`):** Precarga inteligente del saldo adeudado y genera la transferencia inter-cuenta de liquidación.
  - **Paginación en Historial de Movimientos (`PaginationControl`):** Navegación en bloques de 20 movimientos con selector de página y resumen tabular (`Mostrando X a Y de Z`), eliminando el scroll infinito y garantizando rendimiento DOM constante.
* **Inversiones:** Valor de mercado y P&L.

### 4.3. Formulario Universal de Transacciones (`/transactions/new` y `@modal`)
* Interfaz **Zero-Wait UI** (< 16ms): persistencia inmediata en memoria y cola local Outbox (IndexedDB) sin congelar la interacción esperando la red.
* **Listado General de Movimientos (`/transactions`, `TransactionsList`):** Paginación estructurada (20 movimientos por página con `PaginationControl`) sobre el libro diario local, integrando la descarga progresiva de lotes remotos al alcanzar las páginas finales del historial.
* Toggle Gasto | Ingreso | Transferencia.
* Selector de Producto (Cuenta / Tarjeta).
* Importe Original + Moneda del Gasto.
* Campo opcional de **Fee / Comisión**.
* Tipo de Cambio en vivo con selector de tasa y edición manual (`rate_overridden`).
* Monto Final Convertido Resultante.
* Date Picker (Fecha).
* Categoría & Descripción.
* Asignación a Persona (Por defecto: *Personal*).
* Selector de Cuotas (N Pagos — Habilitado para Tarjetas, distribuidas mes a mes).
* **Edición de Movimientos y Asignación Rápida de Categoría (`EditTransactionModal`):** Capacidad de editar un movimiento ya registrado o asignarle/modificarle su categoría (`category_id`), persona (`person_id`), descripción (`notes`), fecha (`date`) e importe (en movimientos individuales) directamente desde el listado general de movimientos (`TransactionsList` en `/transactions`), desde el widget del Dashboard (`RecentTransactionsWidget` en `/dashboard`) y desde el detalle de cuentas (`AccountDetailClient` en `/accounts/[id]`). Los ingresos y gastos sin categoría muestran el chip interactivo **`+ Sin categoría`** de 1 clic, e incluyen opción de propagar categoría, nota y persona a todas las cuotas de un mismo plan (`installment_total > 1`).

### 4.4. Transferencias (Locales & Overseas)
* Selector de Cuenta Origen y Cuenta Destino.
* Monto Enviado + Fee opcional.
* Tipo de Cambio Aplicado.
* Monto Recibido.
* Genera 2 registros enlazados por `parent_transaction_id` en el *Ledger* (débito negativo en origen y crédito positivo en destino).

### 4.5. Personas & Cuentas por Cobrar
* **Selector de Período Contable (`accounting_period`):** Tanto en el directorio general (`/people`) como en el detalle de cada contacto (`/people/[id]`), se incluye la barra de filtro de **Período contable** (`YYYY-MM`, idéntica al módulo de Tarjetas). Para los movimientos que no poseen `accounting_period` registrado (anteriores o en efectivo/débito), se asume como período efectivo el mes de la fecha del gasto (`date.slice(0, 7)`).
* **Separación Estricta por Período:** Permite consultar los primeros días del mes el período contable anterior (ej. para notificar por WhatsApp lo adeudado del resumen recién cerrado) sin mezclar en el mismo saldo los consumos o cuotas del período actual. Exhibe de forma diferenciada el saldo del período seleccionado (`=== YYYY-MM`), saldos pendientes de períodos anteriores (`< YYYY-MM`) y compromisos de próximos meses (`> YYYY-MM`).
* **Contacto de Sistema "Personal"**: Entidad reservada del sistema asignada por defecto a los consumos propios del usuario. No puede renombrarse, desactivarse ni duplicarse (protegida como palabra reservada `Personal` en frontend y backend).
* **Prevención de Nombres Duplicados y Aviso en Tiempo Real**: Si el usuario tipea el nombre de una persona ya existente (activa o desactivada), el formulario muestra un aviso preventivo sugiriendo incorporar una inicial o apellido (ej. *"Diego M."*) para garantizar que los contactos se reconozcan de manera inequívoca en selectores de consumos y cobros.
* CRUD completo de contactos (`/people/new`, `/people/[id]/edit`) con baja lógica protegida (la desactivación se bloquea si la persona tiene movimientos pendientes de cobro).
* Ficha de Persona (`/people/[id]`): Saldo por cobrar del período contable seleccionado, alerta y listado separado de períodos anteriores sin cobrar, desglose de cuotas/períodos futuros e historial de movimientos cobrados con paginación integrada (`PaginationControl`, 10 cobros por página).
* Acciones en ficha de persona:
  - **"Registrar Cobro / Liquidación"** (precarga el saldo del período contable seleccionado y permite amortizar por período, acumulado o total global con `settled_at`).
  - **"Notificar por WhatsApp" (`WhatsAppNotifyModal`):** Filtra automáticamente los movimientos pendientes correspondientes al período contable seleccionado para generar el detalle y total del mensaje antes de disparar el link a WhatsApp (`wa.me`).
* **Configuración de Plantilla WhatsApp (`/people/template`):** Pantalla y modal para personalizar el mensaje predeterminado con variables dinámicas (`$Nombre`, `$Total`, `$Detalle`, `$Cantidad`, `$Fecha`), previsualización en vivo (*Live Preview*) y persistencia por usuario en `user_settings`.

### 4.6. Gastos Fijos & Presupuestos (`/budget`)
* **ABM / CRUD Completo de Estimaciones (`BudgetEstimateModal`):** Creación, edición y desactivación lógica (`is_active`) tanto de **Gastos Fijos Recurrentes** (`EXPENSE_ESTIMATE`) como de **Ingresos Proyectados** (`INCOME_ESTIMATE`), con soporte de alta de categoría en vivo y validación de estado online (`useOnlineStatus()`).
* **Selector de Período Contable (`YYYY-MM`) y KPIs Consolidados:** Tarjetas de resumen en la divisa global del usuario para *Gastos fijos del mes*, *Compromisos en cuotas*, *Ingresos proyectados* y *Margen proyectado* (`Ingresos - (Gastos Fijos + Cuotas)`).
* **Cruce Multi-Moneda Exacto:** Compara cada estimado con los movimientos reales propios de su categoría en el período seleccionado (excluyendo `TRANSFER`, `ADJUSTMENT` y gastos a nombre de terceros), convirtiendo entre monedas cuando difieren.
* **Compromisos y Cuotas Vigentes del Mes:** Lista automáticamente las cuotas activas de tarjetas de crédito del período contable y los vencimientos de préstamos tomados (`loan_installments`).
* **Acción 1-Tap "Ejecutar Pago" / "Registrar Ingreso" (`ExecutePaymentButton`):** Ejecución instantánea con **Zero-Wait UI** si la cuenta preferida comparte la moneda del estimado, o modal rápido con tipo de cambio sugerido y monto convertido si las divisas difieren o no hay cuenta predefinida.

### 4.7. Préstamos Formales y Amortizaciones (Loans)
* **Doble Sentido y Roles**: Control de Préstamos Tomados (Deudas bancarias / pasivos) y Otorgados (Acreencias por cobrar a terceros).
* **Intermediación Financiera**: Soporte para tomar un préstamo de una entidad bancaria (ej. Itaú) y asignarlo a una persona del directorio (`beneficiary_person_id`), actuando como intermediario/garante.
* **Sistema de Amortización Francés (Banco Itaú Uruguay)**:
  - Cálculo de cuota fija nivelada constante a partir de la Tasa Efectiva Anual (TEA) con conversión exponencial a tasa mensual: $i = (1 + \text{TEA})^{1/12} - 1$.
  - Desglose cronológico de interés decreciente y amortización de capital creciente.
  - Soporte para IVA sobre intereses del 22% reglamentario en Uruguay.
  - Simulador y Previsualización en Vivo (*Live Preview*) en el formulario de alta antes de guardar.
* **Desembolso Inicial Opcional**: Selector para acreditar automáticamente el capital en una cuenta bancaria (`INCOME` si es tomado) o debitarlo (`OUTCOME` si es otorgado).
* **Imputación Contable de Cuotas (Opción B)**:
  - Generación de Ledger Bundle atómico con dos filas ligadas: amortización de capital (reduce el pasivo sin computar como consumo) e intereses (+ IVA) imputados a la categoría de gastos financieros para su reflejo en `/analytics` y `/budget`.
* **Cancelación Secuencial Estricta**: Pago correlativo cuota por cuota (1 a N) con modal interactivo `PayLoanInstallmentModal` y estado de préstamo (`ACTIVE` / `PAID`).

### 4.8. Portafolio de Inversiones (`/portfolio`)
* **Aviso / Disclaimer Informativo Permanente**: Banner visible aclarando que las cotizaciones provienen de fuentes públicas gratuitas (Yahoo / Google Finance y CoinGecko) con posibles demoras y que el módulo tiene fines exclusivamente **informativos, de seguimiento personal y consolidación patrimonial estimada**.
* **Doble Modalidad de Cotización (`quote_mode`)**:
  - `auto`: Consulta pública por ticker (acciones, CEDEARs, ETFs, criptomonedas) mediante `/api/portfolio/quotes` con caché de 15 minutos y respaldo en `localStorage` para uso offline.
  - `manual`: Soporte completo para instrumentos locales (bonos locales, letras, plazos fijos, fondos) con edición rápida en 1 clic desde la tabla de tenencias.
* **Operaciones de Compra (`BUY`) y Venta (`SELL`) con Impacto Opcional en Cuenta**:
  - Permite registrar operaciones en modo **"Solo trackeo"** (sin afectar saldos bancarios, ideal para tenencias históricas) o activando el switch opcional para debitar el capital invertido (`BUY`) o acreditar el cobro neto (`SELL`) en una cuenta mediante un asiento `ADJUSTMENT` enlazado por `linked_transaction_id` (sin inflar los gastos de consumo en `/budget` ni `/analytics`).
* **Cálculo de Costo Promedio Ponderado (PPC / WAC) y 4 KPIs**:
  - Valor Estimado Actual, Capital Invertido, Rendimiento Abierto No Realizado ($ y %) y Resultado Realizado Histórico en la divisa global del usuario.
* **Consolidación en Dashboard con Toggle**:
  - La tarjeta de **Patrimonio Neto** en `/dashboard` incluye el toggle **`+ Portafolio`** (activo por defecto) para sumar o excluir en tiempo real el valor estimado del portafolio y exhibir su desglose (`Cuentas · Portafolio est.`).

### 4.9. Ajustes y Sistema (`/settings`)
* Selector de divisa global preferida (`display_currency`).
* Selector de tema visual Claro / Oscuro con persistencia en preferencias (`ThemeToggle`).
* Envío de correo para restablecimiento de contraseña (`SendResetLinkButton` y flujo `/auth/update-password`).
* Acceso directo al Centro de Ayuda & Wiki y disparador del Onboarding Tour (`TourTriggerButton`).
* Ficha de Información del Sistema (`SystemInfoCard`): versión actual de la aplicación, commit de Git abreviado, entorno de ejecución y botón manual **"Buscar actualización"**.
* **Detección de Nueva Versión y Banner de Actualización (`VersionUpdateBanner`, `/api/version`):** Verificación híbrida (`version` SemVer + `commitSha`) periódica y al recuperar el foco de la ventana/pestaña (con *cooldown* de 5 minutos y respeto del estado online) comparando la versión en ejecución en la pestaña del navegador contra la última versión publicada en el servidor mediante `/api/version`. Si se detecta discrepancia, se despliega un banner de aviso no intrusivo con un botón de acción directa (**"Actualizar / Recargar"**) que purga la caché estática del Service Worker (`fn-*`) y recarga la aplicación para asegurar que el usuario opere siempre con el código y esquema más reciente.
* **Baja de Cuenta / Eliminar Usuario (Pendiente de implementación Frontend):** Sección de zona de peligro (*Danger Zone*) en `/settings` con función en el frontend y confirmación explícita de seguridad para que el usuario pueda darse de baja definitiva del sistema, limpiando la base local (`IndexedDB`) y ejecutando el borrado en cascada de su usuario en `auth.users` junto con todos sus registros financieros.

### 4.10. Centro de Ayuda, FAQ y Wiki (`/help`)
* **Wiki de Funcionalidades**: Base de conocimiento exhaustiva con artículos temáticos (`WIKI_ARTICLES`), desglose conceptual, tips orientativos y accesos directos a las pantallas operativas (Multi-moneda FX, Cuentas/Bancos, Ledger & Zero-Wait UI, Tarjetas y Cuotas, Personas y Cobros, Conciliación Express, Presupuesto, Análisis y Modo Offline).
* **Preguntas Frecuentes (FAQ)**: Acordeón interactivo categorizado con etiquetas semánticas (`tags`) y referencias cruzadas directas a los artículos de la Wiki.
* **Recetas Rápidas (Paso a Paso)**: Guías prácticas numeradas para los casos de uso más frecuentes de un nómada (cargar cenas compartidas, compras en cuotas, conciliación en 10 segundos, cambio de país/divisa y uso offline).
* **Buscador Hero en Vivo**: Filtrado instantáneo por texto libre y selector de categorías con contador de coincidencias y restablecimiento en 1 clic.
* **Integración del Tour Guiado**: Disparador de `OnboardingTour` embebido para repasar el recorrido interactivo de 5 pasos en cualquier momento.

### 4.11. Asistente Inicial de Bienvenida (`/welcome`)
* **Propósito**: Resolver el problema de "cold start" guiando a los nuevos usuarios en la configuración inicial de su patrimonio sin tablas vacías ni fricción.
* **Acceso Exclusivo**: Reservado estrictamente a nuevos usuarios sin cuentas o con `onboarding_completed: false`. Si un usuario existente accede a la ruta, se redirige automáticamente a `/dashboard`.
* **Flujo Interactivo en 5 Pasos**:
  1. *Moneda Universal*: Detección automática por región (locale/timezone, ej. Argentina -> USD/ARS) para sugerir la divisa más familiar para el usuario con badge indicativo y catálogo modal con más de 30 monedas.
  2. *Instituciones, Cuentas y Saldo Inicial*: Creación flexible y dinámica de múltiples instituciones (bancos, fintechs, billeteras de efectivo) con sus respectivas cuentas, divisas nativas y saldo inicial actual (registrado como asiento `ADJUSTMENT` en el ledger sin distorsionar gastos ni presupuestos), con previsualización de contravalor y ajuste directo de cotización en el momento.
  3. *Categorías de Gastos e Ingresos*: Selección de categorías nómadas estándar y creación rápida de categorías personalizadas en el momento.
  4. *Personas (Split Pay y Extensiones)*: Explicación amigable del funcionamiento de gastos compartidos con amigos/familiares y extensiones de tarjetas sin mezclar con consumos propios (`Personal`).
  5. *Cierre y Transición*: Resumen integral, botón *"Configurá mi espacio"* y animación interactiva por etapas mientras se siembra la base de datos. Si el usuario configuró una o más tarjetas de crédito, presenta un prompt opcional para saltar a la carga rápida de consumos o continuar directo al Dashboard.
* **Requisito Online**: Valida conectividad en vivo (`useOnlineStatus()`), mostrando advertencia preventiva e impidiendo la inicialización si el dispositivo está sin conexión.

### 4.12. Asistente de Carga Rápida y Pegado Mágico (`/welcome/credit-card` y `/accounts/[id]/bulk`)
* **Propósito**: Resolver la brecha de deuda del resumen actual y arrastre de cuotas vigentes en tarjetas de crédito, así como la importación masiva de movimientos desde home banking y extractos bancarios en cuentas de caja de ahorro, cuenta corriente y billeteras, evitando la carga manual movimiento por movimiento.
* **Acceso y Adaptación por Tipo de Producto**:
  - **Tarjetas de crédito**: Asistente con gestión de cuotas intermedias ($C$ de $T$), impacto en límite de crédito remanente y proyección de deuda futura.
  - **Cuentas bancarias y billeteras**: Asistente `AccountBulkWizard` con discriminación de Tipo (**Gasto** vs. **Ingreso**), cómputo de Saldo Neto Resultante en la cuenta y categorías sugeridas automáticamente.
  - **Accesibilidad**: Permanece accesible de forma permanente desde la ficha de cada cuenta o tarjeta (`/accounts/[id]/bulk`) mediante el botón *"Carga rápida"*.
* **Dual-Mode de Entrada**:
  - **Grilla Spreadsheet-like**: Navegación fluida por teclado (`Tab`/`Enter`), columna explícita de **Mes contable** (`accounting_period`) asignado a cada fila, auto-categorización heurística en tiempo real a partir del comercio tipeado, y selector de cuotas con chips rápidos (`1/1`, `3`, `6`, `12`, o cuota intermedia personalizada `C de T`) en tarjetas o selector de Tipo (`OUTCOME`/`INCOME`) en cuentas.
  - **Pegado Mágico (Smart Text Parser)**: Área de texto para volcar líneas en texto plano de extractos bancarios o emails; un motor de expresiones regulares extrae secuencialmente fecha inicial (`DD/MM/AA`, `DD MM AA`, `DD-MM-AA`, `DD.MM.AA`, `DD/MM/AAAA`, `DD.MM.AAAA`), número de tarjeta opcional (`XXXX`), comercio, plan de cuotas (`X/X`, `X/ X`, `C.04/12`), divisa opcional (`UYU`, `USD`, `EUR`, `ARS`, etc.) e importe final.
    - En tarjetas de crédito: destaca automáticamente filas con monto negativo como **Pago / Refund**.
    - En cuentas bancarias: interpreta montos con signo negativo o palabras de débito como **Gasto** y montos positivos o palabras de ingresos (sueldo, transferencia recibida, etc.) como **Ingreso**, permitiendo conmutar directamente con 1 clic en la vista previa.
    - Incluye selectores de moneda y persona a importar en dos filas, selector individual de **Persona** por cada fila en la vista previa (*Movimientos detectados*) y leyenda recordatoria de verificación manual.
* **Lógica Contable de Cuotas Intermedias**: Al ingresar una cuota $C$ de $T$ (ej: 4 de 12), el sistema asienta la cuota corriente en el período actual y genera automáticamente las cuotas $C+1$ a $T$ como transacciones `PENDING` futuras vinculadas por `parent_transaction_id`, sin ensuciar el libro con cuotas pasadas ya canceladas.
* **Integración con Personas (Split Pay)**: Cada consumo adopta por defecto *"Personal"*. Permite asignar selectivamente gastos a terceros (con selector de contactos sin opciones duplicadas y preasignación en pegado mágico), resaltando visualmente los consumos compartidos en la grilla y discriminando en la barra de impacto financiero el monto personal frente al total a cobrar.
* **Live Impact Bar**: Cálculo en vivo de consumos del resumen actual, compromisos diferidos futuros, límite de crédito disponible remanente y desglose de gastos propios vs. a cobrar (en tarjetas) o Total Gastos, Total Ingresos y Saldo Neto Resultante (en cuentas bancarias).

### 4.13. Módulo de Verificación de Estado de Cuenta y Mes Contable (`/accounts/[id]/verify`)
* **Mes Contable (`accounting_period`):** Cada movimiento en `master_transactions` almacena el período contable (`YYYY-MM`) en el que impacta. Al registrar un gasto con tarjeta de crédito, el formulario presenta opciones rápidas de **Mes actual** y **Próximo mes** (con sugerencia automática si la fecha supera el `closing_day` de la tarjeta) y proyecta las cuotas subsecuentes a partir del mes elegido.
* **Pantalla de Verificación (`/accounts/[id]/verify`):**
  - **Summary con Pills:** Total consolidado en moneda nativa de la tarjeta, desglose separado por moneda de origen cuando hay consumos bimonetarios (ej. moneda local + USD), progreso de ítems confirmados vs. pendientes y total de gastos compartidos a recuperar.
  - **Acciones por Gasto:**
    - **Confirmar:** Marca el consumo como verificado (`is_verified = true`, `verified_at`).
    - **Corregir:** Modal para ajustar importe, moneda, fecha, descripción, categoría o persona asignada, confirmándolo automáticamente.
    - **Asignar al próximo mes (Opción A en cascada):** Desplaza el `accounting_period` al mes siguiente; si es una compra en cuotas, desplaza en cascada esa cuota y todas las cuotas siguientes del plan.
    - **Agregar gasto faltante:** Permite incorporar directamente en el período un cargo presente en el resumen bancario que no había sido registrado.
* **Banner Recordatorio en Dashboard:** Durante los últimos 5 días y los primeros 5 días de cada mes, si el usuario posee tarjetas de crédito activas, el Dashboard muestra un banner con acceso directo a la verificación de sus resúmenes.

### 4.14. Centro de Control y Análisis de Tarjetas de Crédito (`/cards`)
* **Visibilidad Dinámica en Navegación Principal:** El ítem **Tarjetas de crédito** (`/cards`) se incorpora en el bloque principal del menú lateral y barra móvil únicamente cuando el usuario posee al menos un producto financiero de tipo `credit_card` (permaneciendo oculto si no opera con tarjetas de crédito).
* **Bloque A — KPIs Globales Consolidados:**
  - **Consumos del Resumen (`accounting_period`):** Selector de período contable (`YYYY-MM`), pills por divisa operada y consolidado en la moneda global del usuario.
  - **Separación Propio vs. Terceros (Split Pay / Extensiones):** Desglose del monto atribuido a *"Personal"* frente a los consumos realizados por o para terceros.
  - **Compromisos Diferidos (Cuotas Futuras):** Total acumulado en períodos posteriores al seleccionado y cantidad de planes activos.
  - **Salud de Límite Global y Estado de Conciliación:** Porcentaje de utilización consolidada y progreso de verificación (`is_verified`) del período.
* **Bloque B — Curva de Compromisos y Liberación de Cuotas (*Run-off* a 6 y 12 Meses):**
  - Proyección mensual de compromisos asumidos apilando consumo propio vs. terceros.
  - **Hitos de Alivio Financiero (*Drop-off Insights*):** Detección automática de los meses en que finalizan planes de cuotas vigentes (`installment_current === installment_total`), informando cuánto saldo mensual se libera.
* **Bloque C — Matriz Visual de Plásticos con Detección de Sello de Red:**
  - Tarjeta rica por cada plástico con chip EMV estilizado y **detección automática del sello de red (`VISA`, `AMEX`, `MASTERCARD`, `MAESTRO`)** a partir del nombre del producto (`account.name`).
  - Indicador de próximo cierre (`closing_day` y días restantes), pills bimonetarias del período, barra de utilización de límite individual y botonera de acciones en 1 clic (`Verificar`, `Carga rápida`, `Detalle` y `Registrar pago`).
  - **Soporte de Mes Contable en Pago de Tarjeta y Estado del Resumen:** El modal `RegisterCardPaymentModal` y las transferencias hacia tarjetas permiten imputar el pago al resumen correspondiente (ej. pagar el resumen de octubre en los primeros días de noviembre sin distorsionar el mes en curso). `CreditCardsDashboard` computa los pagos aplicados (`periodPaymentsByCurrency`) y exhibe la insignia de `Resumen pagado` o `Pago parcial` al saldar el período.
* **Bloque D — Radiografía Analítica:**
  - **Listado Maestro de Planes de Cuotas Activos:** Seguimiento de cada compra financiada (`Cuota C de T`, barra de progreso, cuota mensual, saldo remanente y mes de finalización).
  - **Desglose por Persona y por Categoría:** Distribución de consumos del período (excluyendo `TRANSFER` y `ADJUSTMENT`) con enlaces directos al directorio de `/people`.
* **Nota de Evolución Futura (`due_day` — Día de Vencimiento de Pago):** Actualmente el ciclo de tarjetas opera sobre `closing_day` (día de cierre). Se deja documentado como mejora futura opcional la incorporación del campo `due_day` (día de vencimiento de pago del resumen) en `accounts` para alertar sobre fechas límite de pago además del corte contable.

### 4.15. Análisis y Datos (`/analytics`)
* Tablero analítico de evolución de ingresos, gastos de consumo (`OUTCOME`), tasa de ahorro, distribución por categorías, divisas e instituciones en moneda global.
* **Master Switch de Transacciones Personales vs. Terceros:** Control global (*Master Switch*) en la cabecera de **Análisis y Datos** (`/analytics`) para alternar en tiempo real entre **"Solo personales"** (excluye consumos asignados a otras personas del directorio distintas de `Personal` para aislar el costo de vida real) y **"Todos"** (incluye gastos a cuenta de terceros, compras compartidas y extensiones) con recálculo instantáneo en 0ms de todos los KPIs, gráficos y flujos de caja.

---

## 5. Esquema Simplificado de Base de Datos

```sql
-- Configuración de Usuario
CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_currency VARCHAR(5) NOT NULL DEFAULT 'EUR',
    theme VARCHAR(10) NOT NULL DEFAULT 'dark',
    whatsapp_template TEXT NULL,
    active_currencies JSONB NOT NULL DEFAULT '[
      {"code": "EUR", "mode": "auto"},
      {"code": "USD", "mode": "auto"},
      {"code": "AUD", "mode": "auto"},
      {"code": "UYU", "mode": "auto"},
      {"code": "NZD", "mode": "auto"}
    ]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Instituciones y Cuentas
CREATE TABLE institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) NOT NULL, -- checking, savings, credit_card, cash, investing
    currency VARCHAR(5) NOT NULL,
    credit_limit DECIMAL(12,2) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Personas / Contactos
CREATE TABLE people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(30) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla Maestra de Transacciones (Ledger)
CREATE TABLE master_transactions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_transaction_id UUID NULL,
    date DATE NOT NULL,
    type VARCHAR(20) NOT NULL, -- INCOME, OUTCOME, TRANSFER, ADJUSTMENT
    amount_original DECIMAL(12,2) NOT NULL,
    currency_original VARCHAR(5) NOT NULL,
    fee_amount DECIMAL(12,2) DEFAULT 0,
    exchange_rate DECIMAL(12,6) DEFAULT 1,
    amount_account DECIMAL(12,2) NOT NULL,
    currency_account VARCHAR(5) NOT NULL,
    institution_id UUID NOT NULL,
    account_id UUID NOT NULL,
    category_id UUID NULL,
    person_id UUID NULL,
    installment_current INT DEFAULT 1,
    installment_total INT DEFAULT 1,
    status VARCHAR(20) NOT NULL, -- COMPLETED, PENDING
    notes TEXT NULL,
    settled_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Funciones RPC Clave (Migración 0008)
-- get_account_balances_summary(): Agregación en SQL de saldos y compromisos diferidos por cuenta.
-- commit_ledger_bundle(p_bundle_id, p_bundle_type, p_rows): Inserción atómica e idempotente de bundles.
```