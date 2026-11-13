export interface WikiSection {
  title: string
  content: string
  tip?: string
}

export interface WikiArticle {
  id: string
  slug: string
  title: string
  category: 'core' | 'accounts' | 'transactions' | 'cards' | 'people' | 'budget' | 'analytics' | 'offline' | 'loans' | 'portfolio'
  categoryLabel: string
  iconName: string
  summary: string
  badge?: string
  targetRoute?: string
  targetLabel?: string
  sections: WikiSection[]
  relatedFaqIds?: string[]
}

export interface FaqItem {
  id: string
  question: string
  answer: string
  category: 'core' | 'accounts' | 'cards' | 'people' | 'budget' | 'offline' | 'loans' | 'transactions' | 'analytics' | 'portfolio'
  categoryLabel: string
  tags: string[]
  relatedWikiSlug?: string
}

export interface QuickGuide {
  id: string
  title: string
  description: string
  steps: string[]
  iconName: string
  route?: string
  routeLabel?: string
}

export const HELP_CATEGORIES = [
  { id: 'all', label: 'Todo' },
  { id: 'core', label: 'Multi-moneda (FX)' },
  { id: 'cards', label: 'Tarjetas de crédito & Cuotas' },
  { id: 'loans', label: 'Préstamos & Marcha' },
  { id: 'portfolio', label: 'Portafolio & Inversiones' },
  { id: 'people', label: 'Personas & Cobros' },
  { id: 'accounts', label: 'Cuentas & Bancos' },
  { id: 'transactions', label: 'Movimientos & Ledger' },
  { id: 'budget', label: 'Presupuesto & Categorías' },
  { id: 'analytics', label: 'Análisis & Reportes' },
  { id: 'offline', label: 'Offline & Datos' }
] as const

export const WIKI_ARTICLES: WikiArticle[] = [
  {
    id: 'wiki-dashboard',
    slug: 'dashboard-principal-y-torre-de-control',
    title: 'Dashboard Principal y Torre de Control',
    category: 'core',
    categoryLabel: 'Multi-moneda (FX)',
    iconName: 'LayoutDashboard',
    badge: 'Torre de Control',
    targetRoute: '/dashboard',
    targetLabel: 'Ir al Dashboard',
    summary: 'El centro de comando diario de Finance Nomad: separación de liquidez y tarjetas, balances desglosados, gastos propios vs. terceros y vista rápida de préstamos.',
    sections: [
      {
        title: 'Franja de Balances y KPIs Estratégicos',
        content: 'La parte superior del Dashboard resume tus cuatro métricas vitales: Patrimonio Neto consolidado, Flujo de Caja (Cash Flow) del período, Total Adeudado (tarjetas y cuotas de préstamos tomados) y Cuentas por Cobrar (gastos compartidos asumidos por terceros y préstamos otorgados).'
      },
      {
        title: 'Separación Nítida: Cuentas vs. Tarjetas de Crédito',
        content: 'Tus cuentas bancarias, cajas de ahorro y efectivo se visualizan en un bloque independiente enfocado en tu liquidez inmediata disponible. Las tarjetas de crédito se agrupan en su propio espacio mostrando el saldo corriente a pagar, su marca de red y el estado del período contable o alerta de resumen.'
      },
      {
        title: 'Alternador de Período: Mes Actual vs. Últimos 30 Días',
        content: 'Para evitar el punto ciego del cambio de mes cuando el calendario arranca en día 1 o 2, podés alternar con un toque entre "Mes actual" y "Últimos 30 días". Las métricas de ingresos, egresos y categorías se recalculan al instante.'
      },
      {
        title: 'Gastos Propios vs. Asumidos por Terceros',
        content: 'El widget de radiografía de gastos discrimina tu consumo personal real de lo que pagaste por cuenta de amigos o familiares en salidas grupales. El gráfico por categorías refleja estrictamente tus gastos propios para no distorsionar tu costo de vida.',
        tip: 'Tocá "Por Cobrar" o el botón de terceros para ir a /people y asentar reintegros recibidos en un toque.'
      },
      {
        title: 'Vista Rápida de Préstamos',
        content: 'Monitoreá tus préstamos activos tomados y otorgados sin salir del Dashboard, con alerta destacada de la próxima cuota a vencer indicando fecha, monto y contraparte.'
      }
    ],
    relatedFaqIds: ['faq-dashboard-periods', 'faq-dashboard-third-party', 'faq-dashboard-card-debt', 'faq-fx-dashboard']
  },
  {
    id: 'wiki-fx',
    slug: 'multi-moneda-y-cotizaciones',
    title: 'Multi-moneda y Cotizaciones en Vivo (FX)',
    category: 'core',
    categoryLabel: 'Multi-moneda (FX)',
    iconName: 'Coins',
    badge: 'Core del Nómada',
    targetRoute: '/settings',
    targetLabel: 'Configurar divisa global',
    summary: 'Cómo gestiona Finance Nomad las monedas del mundo, el catálogo dinámico de más de 30 divisas, cotizaciones automáticas, y tipos de cambio directos manuales (Dólar Blue / MEP).',
    sections: [
      {
        title: 'Divisa Global vs. Divisas Nominales',
        content: 'Finance Nomad está diseñado para personas que se mueven entre países. Tu patrimonio neto total y los totales del Dashboard se consolidan en tu "Moneda global" elegida (por ejemplo EUR, USD, AUD, UYU o NZD). Sin embargo, cada cuenta bancaria o billetera conserva su saldo nominal real en su moneda nativa, sin sufrir conversiones artificiales al visualizar tus cuentas.'
      },
      {
        title: 'Catálogo Dinámico de Divisas y Monedas Regionales',
        content: 'Además de las 5 monedas base iniciales, podés activar más de 30 divisas de todo el mundo (Pesos Argentinos - ARS, Reales Brasileños - BRL, Pesos Chilenos - CLP, Libras Esterlinas - GBP, Francos Suizos - CHF, etc.) desde Ajustes o durante el Asistente Inicial. Las monedas que actives quedan disponibles al instante en tus cuentas, tarjetas y movimientos.'
      },
      {
        title: 'Cotización Automática vs. Tasa Manual Directa (Dólar Blue / MEP)',
        content: 'Cada divisa secundaria puede operar en modo "Auto (Mercado)" (consultando open.er-api.com en tiempo real con fallback al BCE) o en modo "Manual". En modo manual, definís directamente la cotización contra tu moneda global (ejemplo: 1 USD = 1.280 ARS). Finance Nomad protege esta cotización personalizada para que nunca sea pisada por actualizaciones automáticas de mercado, reflejando fielmente tu realidad financiera.'
      },
      {
        title: 'Sobreescritura Manual en Transacciones Puntuales',
        content: 'Si tu banco o casa de cambio aplicó una tasa diferente en una operación específica, podés modificar manualmente el tipo de cambio en el formulario de movimiento. Al hacerlo, el sistema marca el registro como tasa personalizada (rate_overridden: true), garantizando que futuras actualizaciones de mercado nunca pisen tu cotización real.',
        tip: 'Podés gestionar tus divisas activas y cambiar entre modo Auto y Manual en cualquier momento desde Ajustes > Mis Divisas Activas.'
      }
    ],
    relatedFaqIds: ['faq-fx-calc', 'faq-fx-manual', 'faq-fx-dashboard', 'faq-fx-custom-currency', 'faq-fx-manual-profile-rate']
  },
  {
    id: 'wiki-cards',
    slug: 'tarjetas-de-credito-y-cuotas',
    title: 'Tarjetas de Crédito y Cuotas Diferidas',
    category: 'cards',
    categoryLabel: 'Tarjetas de crédito & Cuotas',
    iconName: 'CreditCard',
    badge: 'Contabilidad Precisa',
    targetRoute: '/cards',
    targetLabel: 'Ir al Centro de Tarjetas de Crédito',
    summary: 'Centro de control unificado (/cards), sistema de cuotas automáticas (1 de N), curva de liberación de cuotas y liquidación de resúmenes.',
    sections: [
      {
        title: 'Centro de Control y Análisis de Tarjetas de Crédito (/cards)',
        content: 'Cuando tenés al menos una tarjeta de crédito configurada, se habilita en el menú principal la vista "Tarjetas de crédito" (/cards). Allí podés analizar en un solo lugar el total de tus resúmenes del período contable elegido, cuánto corresponde a tus gastos propios ("Personal") frente a consumos de terceros (extensiones), la utilización global de tu límite de crédito y una matriz visual que simula cada plástico detectando automáticamente el sello de la red (VISA, AMEX, Mastercard o Maestro) a partir del nombre de la cuenta.',
        tip: 'Desde cada tarjeta en /cards podés disparar en 1 clic la verificación del resumen, la carga rápida en bloque o el registro del pago mensual.'
      },
      {
        title: 'Curva de Liberación de Cuotas (Run-off a 6 y 12 Meses)',
        content: 'El panel de proyección de /cards te muestra mes a mes cuánto dinero ya tenés comprometido en futuros resúmenes por compras en cuotas pasadas, diferenciando tus gastos propios de los de terceros. Además, calcula automáticamente los "Hitos de alivio financiero", indicándote en qué mes exacto terminan tus planes actuales y cuánto saldo mensual liberás.'
      },
      {
        title: 'Distribución Automática de Cuotas',
        content: 'Al cargar una compra en N pagos (por ejemplo 6 cuotas con tarjeta de crédito), Finance Nomad genera automáticamente las N filas en el libro contable distribuidas mes a mes. La cuota 1 se marca como COMPLETED y descuenta del saldo disponible de la tarjeta hoy; las cuotas 2 a N se agendan como PENDING vinculadas por un identificador común (parent_transaction_id).'
      },
      {
        title: 'Compromisos Diferidos vs. Saldo Nominal',
        content: 'Las cuotas futuras PENDING no reducen por adelantado tu saldo de dinero actual, pero sí computan en el límite de crédito consumido y en los compromisos proyectados de los próximos meses. De esta forma, siempre sabés cuánto margen tenés sin distorsionar tu patrimonio de hoy.'
      },
      {
        title: 'Pago del Resumen de Tarjeta y Mes Contable Imputado',
        content: 'El pago de la tarjeta no es un gasto nuevo (el gasto ya se computó al comprar), sino una transferencia interna entre tu cuenta bancaria y tu tarjeta de crédito. Como los resúmenes cierran a fin de mes pero suelen vencer en los primeros días del mes siguiente, el modal "Registrar pago" te permite seleccionar qué resumen estás cancelando (por ejemplo, registrar el pago el 4 de noviembre pero imputarlo al resumen de octubre). De esta manera, el dinero sale del banco en la fecha real del pago y el resumen de octubre queda marcado como saldado sin distorsionar el mes en curso.',
        tip: 'Pagar la tarjeta nunca reduce tu presupuesto de consumo mensual porque se registra contablemente como TRANSFER.'
      },
      {
        title: 'Carga Rápida en Bloque (Bulk Ingest) y Pegado Mágico',
        content: 'Para evitar cargar consumos y cuotas una por una, disponés del Asistente de Carga Rápida. Podés usar la grilla con atajos de teclado (Tab/Enter), donde cada fila muestra su Fecha y su Mes contable asignado, o el "Pegado Mágico", donde pegás directamente el texto de tu resumen de homebanking o notificaciones de compra. El sistema detecta en milisegundos fechas en múltiples formatos (DD/MM/AA, DD MM AA, DD-MM-AA o DD/MM/AAAA), limpia el número de tarjeta opcional de 4 dígitos, identifica el comercio, reconoce planes de cuotas (ej: 12/12, 2/ 3 o C.04/12), divisas opcionales (UYU, USD, EUR, ARS) y montos (destacando automáticamente las filas con monto negativo como Pago / Refund). Además, podés asignar una moneda o persona masiva, o elegir una Persona en un movimiento puntual directamente desde la lista de Movimientos detectados.',
        tip: 'Recordá verificar siempre las filas antes de confirmar, ya que la lectura automática puede cometer errores.'
      },
      {
        title: 'Mes Contable, Día de Cierre y Verificación del Resumen',
        content: 'Como la fecha de cierre de tu tarjeta no siempre coincide con el último día del mes, cada consumo guarda su "Mes contable" (el resumen en el que realmente impacta). En la ficha de tu tarjeta verás en pills destacadas el total adeudado en cada moneda operada (moneda local y USD) y, discretamente debajo, el consolidado en tu moneda global preferida. Si configurás el "Día de cierre" en tu tarjeta, al cargar una compra posterior a ese día la app te sugerirá automáticamente imputarla al "Próximo mes" (desplazando en cascada todas las cuotas si compraste en pagos). Además, desde el botón "Verificar resumen" podés comparar línea por línea tus registros contra el estado de cuenta del banco, confirmar ítems, corregir importes o pasar consumos al mes siguiente.',
        tip: 'Durante los últimos 5 y los primeros 5 días de cada mes, el Dashboard te mostrará un recordatorio directo para conciliar tus tarjetas en segundos.'
      }
    ],
    relatedFaqIds: ['faq-card-analytics-center', 'faq-card-installments', 'faq-card-payment', 'faq-card-payment-period', 'faq-card-dates', 'faq-card-bulk', 'faq-card-magic-paste', 'faq-card-accounting-period', 'faq-card-verify-statement']
  },
  {
    id: 'wiki-people',
    slug: 'personas-y-cuentas-por-cobrar',
    title: 'Personas, Gastos Compartidos y Cuentas por Cobrar',
    category: 'people',
    categoryLabel: 'Personas & Cobros',
    iconName: 'Users',
    badge: 'Cobros Claros',
    targetRoute: '/people',
    targetLabel: 'Ver directorio de personas',
    summary: 'Atribución de gastos a terceros, seguimiento de deudas consolidadas, pagos parciales y avisos por WhatsApp.',
    sections: [
      {
        title: 'Atribución de Compras a Contactos y Filtro de Período Contable',
        content: 'Cuando hacés una compra en nombre de un amigo o familiar (o le prestás una extensión de tu tarjeta), podés seleccionar a esa persona en el campo "Persona" del formulario. Tanto en el directorio (/people) como en la ficha de la persona (/people/[id]), disponés del mismo selector de "Período contable" del módulo de tarjetas. Esto te permite navegar entre meses (por ejemplo, revisar el período anterior durante los primeros días del mes para enviar el aviso por WhatsApp sin mezclar consumos del nuevo mes). Si un movimiento histórico o en efectivo no tiene mes contable asignado, el sistema asume automáticamente el mes de la fecha del gasto.',
        tip: 'El enlace entre el directorio de Personas y el detalle de cada contacto mantiene sincronizado el período contable que estés consultando.'
      },
      {
        title: 'Cobros Totales, Parciales y Adelanto de Cuotas',
        content: 'En la ficha de cada persona podés registrar devoluciones con el modal "Registrar Cobro":\n• Caso A (Pago Total): Cancela el 100% de la deuda vencida.\n• Caso B (Pago Parcial): Aplica amortización cronológica FIFO a los consumos más antiguos.\n• Caso C (Adelanto): Cancela el saldo actual y descuenta el excedente de las cuotas diferidas futuras.'
      },
      {
        title: 'Notificación Interactiva por WhatsApp',
        content: 'Tocá "Notificar por WhatsApp" en la ficha de una persona para abrir el modal interactivo. Podés verificar el número de teléfono, revisar el texto generado y modificarlo antes de enviar. En Ajustes podés personalizar la plantilla con variables como $Nombre, $Total, $Detalle, $Cantidad y $Fecha.',
        tip: 'La desactivación de una persona se bloquea si todavía tiene saldos pendientes de cobro, protegiendo tus números.'
      },
      {
        title: 'Contacto de Sistema "Personal" y Prevención de Duplicados',
        content: 'El contacto "Personal" es una palabra clave reservada del sistema creada por defecto para representar tus consumos propios (no puede modificarse, desactivarse ni duplicarse). Para evitar confusiones en los selectores y cuentas por cobrar, si ingresás un nombre ya existente, el sistema te avisa para que sumes una inicial o apellido (ej. "Diego M.").',
        tip: 'Asignar una inicial a contactos con nombres similares garantiza que reconozcas al instante a quién le prestaste dinero.'
      }
    ],
    relatedFaqIds: ['faq-people-share', 'faq-people-partial', 'faq-people-whatsapp', 'faq-people-reserved']
  },
  {
    id: 'wiki-accounts',
    slug: 'cuentas-instituciones-y-efectivo',
    title: 'Cuentas, Instituciones y Dinero en Efectivo',
    category: 'accounts',
    categoryLabel: 'Cuentas & Bancos',
    iconName: 'Wallet',
    badge: 'Estructura Robusta',
    targetRoute: '/accounts',
    targetLabel: 'Gestionar mis cuentas',
    summary: 'Organización de bancos, brokers, tarjetas, cuenta Cash por defecto y conciliación rápida mediante Ajuste Express.',
    sections: [
      {
        title: 'Jerarquía Institución -> Cuentas y Alta Continua con Saldo Inicial',
        content: 'Cada cuenta pertenece a una Institución Financiera (por ejemplo N26, Commbank, Itaú o Wise). Al crear una nueva institución desde Cuentas, la app te lleva directamente al formulario para dar de alta sus productos financieros (Cuenta Corriente, Caja de Ahorro, Tarjeta de Crédito, Inversión o Efectivo), permitiéndote ingresar el saldo inicial de apertura en el acto (asentado como ADJUSTMENT sin alterar tus gastos) y sumar varios productos seguidos con el botón "Crear y agregar otro producto".'
      },
      {
        title: 'Cuenta Cash Opcional y Retiros de Cajero (ATM)',
        content: 'El Asistente de Bienvenida crea tu billetera de Efectivo principal. Si más adelante creás otra institución y también querés asociarle una cuenta de efectivo, podés marcar la casilla opcional "Incluir una cuenta de Efectivo en esta institución". Cuando retirás dinero de un cajero automático, registralo como una Transferencia desde tu cuenta bancaria hacia tu cuenta Cash; el gasto real ocurrirá recién cuando pagues en efectivo.'
      },
      {
        title: 'Ajuste Express de Saldo',
        content: 'Si tu saldo en la app no coincide con tu extracto bancario real (por ejemplo por propinas, redondeos o comisiones chicas), tocá "Ajuste Express" en la cuenta. Ingresá el saldo real del banco y el sistema generará automáticamente una fila contable de tipo ADJUSTMENT por la diferencia exacta, sin borrar ni alterar tu historial previo.',
        tip: 'Por seguridad contable, las instituciones y cuentas nunca se borran físicamente (soft delete: is_active = false) para no dejar transacciones huérfanas.'
      },
      {
        title: 'Navegación por Período Contable e Historial Filtrado',
        content: 'Al ingresar al detalle de cualquier cuenta o tarjeta (/accounts/{id}), contás con una barra de control de Período Contable idéntica a la del Centro de Tarjetas de Crédito. Podés avanzar o retroceder entre meses (o volver al mes actual con un clic) para analizar los consumos del resumen en tarjetas de crédito o el balance mensual de ingresos y débitos en cuentas bancarias. También podés alternar el historial entre "Este período" y "Todos los movimientos".',
        tip: 'Al pasar de Tarjetas de crédito al detalle de una cuenta, el período contable seleccionado se conserva automáticamente en la URL (?period=YYYY-MM).'
      },
      {
        title: 'Carga Rápida y Pegado Mágico de Home Banking',
        content: 'Desde la ficha de cualquier cuenta bancaria, caja de ahorro, cuenta corriente o billetera (/accounts/{id}), tocá el botón "Carga rápida" para registrar múltiples movimientos en bloque o volcar directamente el extracto de tu home banking. El Pegado Mágico interpreta fechas (incluyendo formatos con puntos como DD.MM.AAAA), conceptos, montos y signos (+ para ingresos y - para gastos o débitos), sugiriendo categorías en tiempo real y permitiéndote alternar entre Gasto e Ingreso antes de asentar los movimientos en el ledger.',
        tip: 'El cálculo en vivo del bloque te muestra el Total de Gastos, Total de Ingresos y el Saldo Neto resultante que impactará en tu cuenta.'
      }
    ],
    relatedFaqIds: ['faq-acc-cash', 'faq-acc-express', 'faq-acc-delete', 'faq-acc-period', 'faq-acc-bulk', 'faq-acc-magic-paste']
  },
  {
    id: 'wiki-ledger',
    slug: 'libro-diario-y-zero-wait-ui',
    title: 'Libro Diario Maestro (Ledger) y Zero-Wait UI',
    category: 'transactions',
    categoryLabel: 'Movimientos & Ledger',
    iconName: 'Sparkles',
    badge: 'Respuesta < 16ms',
    targetRoute: '/transactions',
    targetLabel: 'Ver movimientos del libro diario',
    summary: 'Arquitectura contable de doble entrada, lotes atómicos (Ledger Bundles) e interfaz instantánea sin esperas de red.',
    sections: [
      {
        title: 'Experiencia Zero-Wait UI',
        content: 'Al guardar una transacción, la interfaz se actualiza de inmediato (en menos de 16 milisegundos) en la memoria del navegador y en la base local IndexedDB. No tenés que esperar a que el servidor de Supabase responda para seguir cargando tus finanzas.'
      },
      {
        title: 'Lotes Atómicos (Ledger Bundles)',
        content: 'Las operaciones complejas (como transferencias inter-cuenta o compras en 12 cuotas) se empaquetan en un lote atómico con UUIDs locales. O se guardan todas las filas juntas o no se guarda ninguna, impidiendo inconsistencias o registros huérfanos.'
      },
      {
        title: 'Cálculo Reactivo: Baseline + Delta',
        content: 'Para ofrecer velocidad extrema sin consumir datos móviles excesivos, la app nunca descarga historiales completos de años pasados: toma un saldo base (Baseline) calculado en base de datos y le suma los deltas de las operaciones locales pendientes de sincronizar.'
      },
      {
        title: 'Paginación de Historial y Prevención de Scroll Infinito',
        content: 'Para evitar listas interminables y acelerar la navegación en dispositivos móviles, tanto la vista general de Movimientos (/transactions) como las fichas de Cuentas y Personas presentan paginación automática (en bloques de 20 movimientos y 10 en cobros históricos). Podés avanzar o retroceder entre páginas al instante y solicitar más movimientos del servidor cuando llegues al final de los registros ya cargados.',
        tip: 'El control de paginación te muestra en todo momento el rango exacto visible y el total de movimientos registrados.'
      },
      {
        title: 'Edición de Movimientos y Asignación Rápida de Categoría',
        content: 'Si guardaste un gasto o ingreso rápido sin categoría (o lo importaste con Pegado Mágico y quedó sin clasificar), verás el chip interactivo "+ Sin categoría" directamente en la fila del movimiento tanto en Movimientos (/transactions), como en el Dashboard y en el detalle de cada cuenta (/accounts/{id}). Al tocarlo (o desde el ícono de lápiz de edición), se abre el modal para asignarle categoría (o crear una nueva en el acto), cambiar la persona asignada, corregir la nota, fecha o el monto. Si es una compra en cuotas, podés propagar la categoría y descripción a todas las cuotas del plan con un solo check.',
        tip: 'Al categorizar un movimiento pendiente de clasificación, tus gráficos del Dashboard, Presupuesto y Análisis se actualizan al instante en 0ms.'
      }
    ],
    relatedFaqIds: ['faq-ledger-types', 'faq-ledger-speed', 'faq-offline-sync', 'faq-transactions-pagination', 'faq-transactions-edit-category']
  },
  {
    id: 'wiki-analytics',
    slug: 'analisis-reportes-y-kpis',
    title: 'Dashboard de Análisis y Reportes Financieros',
    category: 'analytics',
    categoryLabel: 'Análisis & Reportes',
    iconName: 'BarChart3',
    badge: 'Métricas en Vivo',
    targetRoute: '/analytics',
    targetLabel: 'Explorar reportes',
    summary: 'Visualizá tus hábitos de consumo, tasa de ahorro, gastos por categoría y distribución multi-divisa.',
    sections: [
      {
        title: 'Tarjetas de KPIs Principales',
        content: 'En la pantalla de Análisis contás con 5 métricas clave calculadas en tiempo real:\n• Gasto Total del período seleccionado.\n• Ingreso Total.\n• Flujo Neto (Superávit o Déficit).\n• Tasa de Ahorro (% de ingresos retenidos).\n• Promedio de Gasto Diario.'
      },
      {
        title: 'Gráficos Interactivos Nativos',
        content: 'Cuatro gráficos SVG ligeros adaptados al tema visual:\n• Gastos por Categoría: barra stacked porcentual y desglose de montos.\n• Flujo de Caja Mensual: barras comparativas de ingresos frente a egresos mes a mes.\n• Distribución Multi-Moneda: porcentaje de gastos en cada divisa local (EUR, USD, AUD, etc.).\n• Métodos de Pago: participación de tarjetas de crédito, cuentas bancarias y efectivo.'
      },
      {
        title: 'Filtros de Período Rápido',
        content: 'Alterná con un toque entre "Este mes", "Últimos 3 meses", "Últimos 6 meses", "Este año" o "Histórico completo" para evaluar tu evolución a lo largo del viaje.',
        tip: 'Todos los gráficos se sincronizan de inmediato con las nuevas transacciones cargadas en modo local.'
      },
      {
        title: 'Master Switch: Gastos Propios vs. Terceros',
        content: 'En la cabecera contás con el alternador "Solo personales" y "Todos". Con "Solo personales" activo, la pantalla aísla tu costo de vida real excluyendo consumos realizados por cuenta de amigos, familiares o extensiones de tarjeta (gastos compartidos a cobrar). Si querés auditar el flujo bruto total que movieron tus cuentas, cambiá a "Todos".',
        tip: 'Si tenés movimientos de terceros en el período, el sistema te muestra discretamente al lado del switch cuántos consumos fueron excluidos.'
      }
    ],
    relatedFaqIds: ['faq-analytics-filters', 'faq-analytics-currencies', 'faq-analytics-scope-switch']
  },
  {
    id: 'wiki-categories',
    slug: 'categorias-y-personalizacion',
    title: 'Categorías de Gastos Personalizadas',
    category: 'budget',
    categoryLabel: 'Presupuesto & Categorías',
    iconName: 'Tags',
    badge: 'Organización Visual',
    targetRoute: '/categories',
    targetLabel: 'Administrar categorías',
    summary: 'Crea, edita y organiza tus categorías con iconos temáticos y colores semánticos.',
    sections: [
      {
        title: 'Catálogo con Iconos y Colores Semánticos',
        content: 'Cada categoría cuenta con un icono descriptivo (comida, transporte, vivienda, entretenimiento, viajes, salud, etc.) y un color semántico del sistema (accent, income, expense, pending). Esto permite identificar de un vistazo hacia dónde va tu plata en las listas y gráficos.'
      },
      {
        title: 'Baja Lógica de Categorías',
        content: 'Si ya no utilizás una categoría, podés desactivarla sin borrar tus transacciones históricas. Las categorías inactivas desaparecen del selector al crear un movimiento pero permanecen en tus estadísticas pasadas.'
      },
      {
        title: 'Sembrado de Categorías Iniciales',
        content: 'Si tu cuenta es nueva, podés hacer clic en "Cargar categorías recomendadas" para inicializar automáticamente una estructura completa pensada para nómadas (Comida, Supermercado, Alquiler, Vuelos, Transporte, Salidas, Servicios y Salud).'
      }
    ],
    relatedFaqIds: ['faq-cat-create', 'faq-cat-deactivate']
  },
  {
    id: 'wiki-budget',
    slug: 'presupuesto-mensual-y-gastos-fijos',
    title: 'Presupuesto Mensual, Gastos Fijos y Ejecución 1-Tap',
    category: 'budget',
    categoryLabel: 'Presupuesto & Categorías',
    iconName: 'PiggyBank',
    badge: 'Planificación Mensual',
    targetRoute: '/budget',
    targetLabel: 'Ir a Presupuesto',
    summary: 'Planificá tus gastos fijos recurrentes, ingresos proyectados y cuotas vigentes del mes con barras de progreso multi-moneda y ejecución en un solo toque.',
    sections: [
      {
        title: 'Gastos Fijos e Ingresos Proyectados',
        content: 'En /budget podés dar de alta, editar o desactivar tus estimaciones mensuales tanto de gastos fijos (Alquiler, Internet, Gimnasio, Seguros) como de ingresos proyectados (Sueldo, Honorarios). Cada estimación se vincula a una categoría, una divisa, un día estimado del mes (1 al 31) y una cuenta preferida opcional.',
        tip: 'Si el pago de un gasto fijo o el cobro de un ingreso ya no corre más, desactivalo con un clic sin perder tu historial.'
      },
      {
        title: 'Cruce Automático y Conversión Multi-Moneda',
        content: 'Finance Nomad cruza automáticamente tus estimaciones activas con los movimientos reales propios registrados en esa categoría durante el período seleccionado (excluyendo transferencias internas, ajustes de saldo y gastos de terceros). Si pagaste con una cuenta en otra moneda, el motor convierte el importe para reflejar el porcentaje exacto de cobertura.'
      },
      {
        title: 'Ejecución 1-Tap y Compromisos en Cuotas',
        content: 'Desde cada tarjeta podés tocar "Ejecutar pago" (o "Registrar ingreso") para asentar el movimiento real en el acto con arquitectura Zero-Wait UI. Si la cuenta elegida opera en una divisa diferente a la del estimado, se abre un cuadro rápido con el tipo de cambio sugerido para confirmar el contravalor exacto. Además, el panel lista automáticamente las cuotas vigentes de tus tarjetas de crédito y préstamos de ese mes.'
      }
    ],
    relatedFaqIds: ['faq-budget-create', 'faq-budget-execute-fx', 'faq-cat-create']
  },
  {
    id: 'wiki-offline',
    slug: 'modo-offline-y-sincronizacion',
    title: 'Modo Offline y Sincronización en Background',
    category: 'offline',
    categoryLabel: 'Offline & Datos',
    iconName: 'WifiOff',
    badge: '100% Funcional sin Internet',
    summary: 'Cómo operar en aviones o zonas sin cobertura con cola Outbox y sincronización automática.',
    sections: [
      {
        title: 'Operación Local-First',
        content: 'Finance Nomad está pensado para el viaje. Si estás en un vuelo internacional o en una zona remota sin señal de datos, podés registrar gastos, transferencias y cobros con total normalidad. Las operaciones se resguardan en la base IndexedDB de tu dispositivo.'
      },
      {
        title: 'Estados del SyncStatusBadge',
        content: 'El indicador en la esquina superior derecha informa el estado de conexión:\n• Al día (punto verde): Todo guardado y sincronizado con Supabase.\n• Sincronizando (spinner): Enviando movimientos encolados.\n• Guardado local (ámbar): Sin red, operaciones guardadas con seguridad en tu dispositivo.\n• Reintentando: Conexión intermitente en proceso de reconexión.'
      },
      {
        title: 'Catálogos Maestros Online-First',
        content: 'Por seguridad e integridad, la creación inicial de nuevas instituciones, cuentas bancarias y personas requiere conexión activa. Si estás offline, los formularios de catálogo te avisarán para proteger la estructura.',
        tip: 'Apenas recuperes señal de WiFi o datos, la cola Outbox se vacía en background sin que tengas que hacer nada.'
      },
      {
        title: 'PWA y Resiliencia con Service Worker',
        content: 'Finance Nomad es una Progressive Web App (PWA) instalable en tu celular o computadora. Un Service Worker nativo cachea los archivos estáticos y las vistas navegadas. Si recargás la pantalla (F5) o abrís la app sin conexión, no verás la pantalla de error del navegador: la app responderá directamente con los datos locales guardados en IndexedDB.',
        tip: 'Podés agregar Finance Nomad a la pantalla de inicio desde el menú de opciones de Safari (Compartir > Agregar a pantalla de inicio) o Chrome (Instalar aplicación).'
      },
      {
        title: 'Consulta de Préstamos Offline',
        content: 'Tus deudas bancarias, préstamos otorgados y cuadros de marcha en /loans se persisten en el snapshot de arranque en tu dispositivo. Podés consultar cuotas, saldos remanentes y vencimientos futuros sin conexión.'
      },
      {
        title: 'Detección de Nueva Versión y Actualización Limpia',
        content: 'Cuando estás conectado y se publica una nueva versión de Finance Nomad, la app lo detecta en segundo plano al recuperar el foco de la pestaña (o desde el botón "Buscar actualización" en Ajustes) y te muestra un aviso superior no intrusivo. Al tocar "Actualizar / Recargar", el sistema renueva la caché del Service Worker y carga las mejoras al instante sin afectar tus datos locales.',
        tip: 'En Ajustes > Sistema y entorno podés ver la versión instalada y verificar actualizaciones manualmente cuando quieras.'
      }
    ],
    relatedFaqIds: ['faq-offline-airplane', 'faq-offline-sync', 'faq-offline-pwa', 'faq-app-version-update']
  },
  {
    id: 'wiki-loans',
    slug: 'prestamos-y-amortizaciones',
    title: 'Préstamos y Amortizaciones (Itaú Uruguay)',
    category: 'loans',
    categoryLabel: 'Préstamos & Marcha',
    iconName: 'Landmark',
    badge: 'Fase 4',
    targetRoute: '/loans',
    targetLabel: 'Ir a Préstamos',
    summary: 'Control integral de préstamos tomados (bancarios/deudas), préstamos otorgados a terceros e intermediaciones con el sistema de amortización francés de Banco Itaú Uruguay.',
    sections: [
      {
        title: 'Sistema Francés de Banco Itaú Uruguay',
        content: 'Las cuotas se calculan bajo el sistema de cuota nivelada constante (francés) tomando la Tasa Efectiva Anual (TEA) y convirtiéndola exponencialmente a tasa mensual. En las primeras cuotas el interés es mayor y decrece con cada pago, mientras que la porción de amortización de capital aumenta. Adicionalmente, se puede activar el IVA del 22% sobre intereses reglamentario en Uruguay.',
        tip: 'Si tenés la carátula de tu préstamo de Itaú, podés ingresar la TEA directa en el simulador para que el cronograma coincida con tu extracto bancario.'
      },
      {
        title: 'Imputación Contable de la Cuota (Opción B)',
        content: 'Al pagar cada cuota, el sistema genera dos filas atómicas en el libro contable: una por la amortización de capital (que cancela tu pasivo sin computar como consumo innecesario) y otra por los intereses devengados (imputada a la categoría de gastos financieros). De este modo, tus analíticas de gastos en /analytics y tu presupuesto en /budget reflejan el costo real sin duplicar montos.'
      },
      {
        title: 'Intermediación y Préstamos a Terceros',
        content: 'Si tomás un préstamo en el banco para ayudar a un amigo o familiar, podés vincular la Institución (el banco que te presta a vos) y la Persona (quien te debe las cuotas). También podés registrar préstamos directos otorgados a terceros con fondos propios de tus cuentas.'
      },
      {
        title: 'Pagos Secuenciales Estrictos',
        content: 'Para garantizar la precisión contable del cuadro de marcha, las cuotas deben abonarse en estricto orden cronológico correlativo (cuota 1, 2, 3... N). Cada pago cancela la cuota vigente y actualiza el saldo deudor remanente.'
      }
    ],
    relatedFaqIds: ['faq-loans-calc', 'faq-loans-ledger', 'faq-loans-intermediary', 'faq-loans-extraordinary']
  },
  {
    id: 'wiki-portfolio',
    slug: 'portafolio-de-inversiones',
    title: 'Portafolio de Inversiones y Capital Invertido',
    category: 'portfolio',
    categoryLabel: 'Portafolio & Inversiones',
    iconName: 'TrendingUp',
    badge: 'Trackeo & Consolidación',
    targetRoute: '/portfolio',
    targetLabel: 'Ir a Portafolio',
    summary: 'Seguimiento informativo de tus acciones, ETFs, criptomonedas e instrumentos locales con cálculo de Costo Promedio Ponderado (PPC) y consolidación estimada en tu Patrimonio Neto.',
    sections: [
      {
        title: 'Carácter Informativo y Consolidación Estimada',
        content: 'El módulo de Portafolio (/portfolio) es una herramienta de seguimiento personal y consolidación patrimonial estimada. Las cotizaciones automáticas provienen de proveedores públicos gratuitos (Yahoo / Google Finance y CoinGecko) y pueden presentar demoras o diferencias respecto a tu broker; los valores tienen fines exclusivamente informativos y no constituyen asesoramiento financiero ni recomendación de inversión.',
        tip: 'En la tarjeta de Patrimonio Neto del Dashboard contás con el switch "+ Portafolio" (activo por defecto) para incluir o excluir el valor estimado de tus inversiones cuando quieras.'
      },
      {
        title: 'Cotización Automática por Ticker vs. Instrumentos Locales Manuales',
        content: 'Al registrar un activo podés elegir entre dos modos:\n• Ticker de mercado (Auto): Ideal para acciones internacionales, CEDEARs, ETFs y criptomonedas (ej. AAPL, SPY, TSLA, BTC-USD). La app consulta el precio actual automáticamente.\n• Instrumento local (Manual): Pensado para bonos locales, letras, plazos fijos o fondos sin ticker internacional. Definís su valor unitario manualmente y podés actualizarlo en 1 clic desde el ícono de lápiz en la tabla de tenencias.'
      },
      {
        title: 'Histórico de Compras/Ventas (BUY / SELL) y Costo Promedio (PPC)',
        content: 'Cada compra (BUY) suma unidades y recalcula tu Costo Promedio Ponderado (PPC) incluyendo comisiones. Cada venta (SELL) reduce tus unidades abiertas manteniendo el PPC de las restantes y calcula automáticamente tu ganancia o pérdida realizada histórica.'
      },
      {
        title: 'Vínculo Opcional con Cuenta Bancaria o Broker',
        content: 'Al cargar una operación podés elegir si querés impactar o no una cuenta bancaria:\n• Desactivado (Solo trackeo): Registra la tenencia en el portafolio sin tocar el saldo de tus cuentas actuales (ideal para cargar inversiones históricas).\n• Activado: Descuenta el monto invertido de la cuenta elegida (si es compra) o acredita el cobro neto (si es venta) mediante un asiento patrimonial ADJUSTMENT que no distorsiona tus gastos de consumo mensual.',
        tip: 'Si eliminás una operación vinculada desde el historial del portafolio, el movimiento contable asociado en tu cuenta se revierte automáticamente.'
      }
    ],
    relatedFaqIds: ['faq-portfolio-disclaimer', 'faq-portfolio-account-impact', 'faq-portfolio-manual-price', 'faq-portfolio-networth-toggle']
  }
]

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-fx-calc',
    question: '¿Cómo calcula Finance Nomad el tipo de cambio entre divisas?',
    answer: 'La app consulta los tipos de cambio de mercado en tiempo real a través del proveedor open.er-api.com y recurre a la API del Banco Central Europeo si es necesario. Guarda las tasas en una memoria caché local por 1 hora para que todo funcione rápido incluso con baja conectividad.',
    category: 'core',
    categoryLabel: 'Multi-moneda (FX)',
    tags: ['moneda', 'cotización', 'fx', 'dólar', 'euro', 'tipo de cambio'],
    relatedWikiSlug: 'multi-moneda-y-cotizaciones'
  },
  {
    id: 'faq-fx-manual',
    question: '¿Puedo editar la cotización manualmente si el banco me cobró otra tasa?',
    answer: 'Sí. En el formulario de carga de movimientos podés modificar directamente el importe convertido o el tipo de cambio. Al hacerlo, el sistema activará el indicador de tasa personalizada y respetará ese número para siempre, sin ser sobreescrito por el mercado.',
    category: 'core',
    categoryLabel: 'Multi-moneda (FX)',
    tags: ['cotización', 'manual', 'tasa', 'banco', 'comisión', 'fee'],
    relatedWikiSlug: 'multi-moneda-y-cotizaciones'
  },
  {
    id: 'faq-fx-dashboard',
    question: '¿Por qué veo un saldo en una moneda en Cuentas y en otra en el Dashboard?',
    answer: 'Porque en la pantalla de Cuentas ves la realidad de tu billetera (tus dólares son dólares, tus euros son euros). En cambio, el Dashboard y el Patrimonio Neto consolidan la suma de todas tus cuentas en tu divisa global preferida (definida en Ajustes) para que sepas exactamente cuánto dinero tenés en total.',
    category: 'core',
    categoryLabel: 'Multi-moneda (FX)',
    tags: ['patrimonio', 'dashboard', 'moneda global', 'display currency'],
    relatedWikiSlug: 'multi-moneda-y-cotizaciones'
  },
  {
    id: 'faq-dashboard-periods',
    question: '¿Cómo funciona el alternador entre "Mes actual" y "Últimos 30 días" en el Dashboard?',
    answer: 'El switch superior te permite cambiar la ventana de tiempo del Dashboard en un clic: "Mes actual" computa desde el día 1 del mes calendario hasta fin de mes; "Últimos 30 días" toma los 30 días corridos hasta hoy. Esto resulta ideal para los primeros días del mes cuando necesitás ver tu flujo reciente sin perder perspectiva.',
    category: 'core',
    categoryLabel: 'Multi-moneda (FX)',
    tags: ['dashboard', 'período', 'mes actual', '30 días', 'cash flow'],
    relatedWikiSlug: 'dashboard-principal-y-torre-de-control'
  },
  {
    id: 'faq-dashboard-third-party',
    question: '¿Por qué el Dashboard separa mis gastos propios de los gastos de terceros?',
    answer: 'Porque cuando pagás una cena o un viaje grupal con tu tarjeta, el dinero sale de tu plástico pero no es un consumo personal tuyo, sino un crédito a tu favor que te van a reintegrar. Separarlo en la Radiografía de Gastos evita que tu costo de vida parezca falsamente inflado y te indica exactamente cuánto dinero tenés en la calle para cobrar.',
    category: 'people',
    categoryLabel: 'Personas & Cobros',
    tags: ['dashboard', 'terceros', 'gastos compartidos', 'consumo propio', 'por cobrar'],
    relatedWikiSlug: 'dashboard-principal-y-torre-de-control'
  },
  {
    id: 'faq-dashboard-card-debt',
    question: '¿Cómo se calcula el "Total Adeudado" en el Dashboard?',
    answer: 'Utiliza un cálculo híbrido: muestra en valor principal la deuda corriente a pagar (saldo deudor actual de tus tarjetas de crédito más cuotas impagas de préstamos tomados) y detalla debajo el total de cuotas futuras ya comprometidas en compras a plazo, dándote control inmediato sin perder de vista tu pasivo total.',
    category: 'cards',
    categoryLabel: 'Tarjetas de crédito & Cuotas',
    tags: ['dashboard', 'adeudado', 'deuda', 'tarjetas', 'préstamos', 'cuotas futuras'],
    relatedWikiSlug: 'dashboard-principal-y-torre-de-control'
  },
  {
    id: 'faq-fx-custom-currency',
    question: '¿Cómo agrego una moneda regional o personalizada (ej. Pesos Argentinos - ARS)?',
    answer: 'Andá a Ajustes > "Mis Divisas Activas" y tocá "+ Agregar divisa". Se abrirá el catálogo con más de 30 monedas del mundo (ARS, BRL, CLP, COP, MXN, etc.) con buscador en vivo. Seleccionala y quedará disponible de inmediato en todos tus formularios de cuentas y movimientos.',
    category: 'core',
    categoryLabel: 'Multi-moneda (FX)',
    tags: ['moneda', 'divisa', 'ars', 'pesos', 'personalizada', 'catálogo', 'activo'],
    relatedWikiSlug: 'multi-moneda-y-cotizaciones'
  },
  {
    id: 'faq-fx-manual-profile-rate',
    question: '¿Cómo configuro una cotización fija (ej. Dólar Blue o MEP) contra mi moneda global?',
    answer: 'En Ajustes > "Mis Divisas Activas", buscá la moneda secundaria y cambiá el selector de "Auto (Mercado)" a "Manual". Ingresá directamente cuántas unidades de esa divisa equivalen a 1 unidad de tu moneda global (ej: 1 USD = 1.280 ARS). El sistema aplicará esa cotización directa en tus balances y formularios sin que el mercado oficial la sobreescriba.',
    category: 'core',
    categoryLabel: 'Multi-moneda (FX)',
    tags: ['dólar blue', 'mep', 'cotización manual', 'tasa fija', 'fx', 'tipo de cambio'],
    relatedWikiSlug: 'multi-moneda-y-cotizaciones'
  },
  {
    id: 'faq-card-analytics-center',
    question: '¿Dónde puedo ver todas mis tarjetas juntas, cuándo libero cuotas y cuánto gastaron terceros?',
    answer: 'En la sección "Tarjetas de crédito" (/cards) del menú principal (que se activa automáticamente cuando tenés al menos una tarjeta de crédito creada). Ahí vas a encontrar tus plásticos con detección automática de sello (VISA, AMEX, Mastercard o Maestro), el desglose entre tu consumo propio ("Personal") y el de terceros, la curva de liberación de cuotas a 6 o 12 meses y la tabla maestra de todos tus planes de cuotas activos.',
    category: 'cards',
    categoryLabel: 'Tarjetas de crédito & Cuotas',
    tags: ['tarjetas', 'análisis', 'cuotas futuras', 'liberación', 'visa', 'mastercard', 'amex', 'maestro', 'terceros'],
    relatedWikiSlug: 'tarjetas-de-credito-y-cuotas'
  },
  {
    id: 'faq-card-installments',
    question: '¿Cómo registro una compra en cuotas con tarjeta de crédito?',
    answer: 'En el formulario de nuevo movimiento, seleccioná tu tarjeta de crédito y en el campo "Cuotas" elegí la cantidad de pagos (por ejemplo 3, 6 o 12). La app debitará la primera cuota hoy y agendará automáticamente las cuotas restantes mes a mes en estado pendiente.',
    category: 'cards',
    categoryLabel: 'Tarjetas de crédito & Cuotas',
    tags: ['tarjeta', 'cuotas', 'pagos', 'crédito', 'diferido'],
    relatedWikiSlug: 'tarjetas-de-credito-y-cuotas'
  },
  {
    id: 'faq-card-payment',
    question: '¿Pagar el resumen de mi tarjeta cuenta como un gasto en mis reportes?',
    answer: 'No. Cuando compraste algo con la tarjeta, ese consumo ya se contabilizó en tus gastos. El pago del resumen se registra como una Transferencia desde tu cuenta bancaria hacia la tarjeta, disminuyendo tu deuda sin duplicar tus gastos en los reportes.',
    category: 'cards',
    categoryLabel: 'Tarjetas de crédito & Cuotas',
    tags: ['pago tarjeta', 'transferencia', 'presupuesto', 'consumo', 'duplicado'],
    relatedWikiSlug: 'tarjetas-de-credito-y-cuotas'
  },
  {
    id: 'faq-card-payment-period',
    question: 'Si pago el resumen de octubre en los primeros días de noviembre, ¿a qué mes se imputa el pago?',
    answer: 'Al registrar el pago de tu tarjeta, podés seleccionar el "Resumen a cancelar (mes contable)" —por ejemplo Octubre—. La app registra la salida del dinero de tu cuenta bancaria en la fecha del pago (noviembre), pero imputa el crédito de cancelación al resumen seleccionado (octubre). Así, el estado de cuenta de octubre queda saldado y no absorbe pagos que distorsionen el resumen de noviembre.',
    category: 'cards',
    categoryLabel: 'Tarjetas de crédito & Cuotas',
    tags: ['pago tarjeta', 'mes contable', 'resumen', 'vencimiento', 'impago', 'deuda'],
    relatedWikiSlug: 'tarjetas-de-credito-y-cuotas'
  },
  {
    id: 'faq-card-dates',
    question: '¿Qué pasa si una cuota futura cambia de fecha o se adelanta?',
    answer: 'Podés ingresar a la sección de Movimientos y editar cualquier cuota pendiente para ajustar su fecha o confirmarla inmediatamente como cobrada/pagada.',
    category: 'cards',
    categoryLabel: 'Tarjetas de crédito & Cuotas',
    tags: ['cuotas', 'fechas', 'adelantar', 'movimientos'],
    relatedWikiSlug: 'tarjetas-de-credito-y-cuotas'
  },
  {
    id: 'faq-card-bulk',
    question: '¿Cómo cargo los consumos actuales o cuotas viejas de mi tarjeta sin cargarlas una a una?',
    answer: 'Podés usar el Asistente de Carga Rápida ("Carga rápida" desde la ficha de tu tarjeta o el paso opcional post-onboarding). Te permite tipear múltiples filas en segundos con navegación ágil por teclado (Tab/Enter) o pegar directamente el texto copiado de tu resumen bancario. Además, cada consumo viene asignado a "Personal" por defecto, pero podés reasignarlo a un contacto si fue un gasto compartido a cobrar.',
    category: 'cards',
    categoryLabel: 'Tarjetas de crédito & Cuotas',
    tags: ['carga rápida', 'bulk', 'resumen', 'pegar texto', 'cuotas vigentes', 'tarjeta', 'personas', 'split pay'],
    relatedWikiSlug: 'tarjetas-de-credito-y-cuotas'
  },
  {
    id: 'faq-card-magic-paste',
    question: '¿Qué formato de texto reconoce el Pegado Mágico de resúmenes?',
    answer: 'Reconoce líneas que empiezan con la fecha (en formato DD/MM/AA, DD MM AA, DD-MM-AA, DD/MM/AAAA o DD/MM), seguidas opcionalmente por los 4 dígitos de la tarjeta (XXXX), la descripción del comercio, la cuota (ej. 12/12, 2/ 3, C.04/12 o Cuota 3 de 6), la moneda opcional (UYU, USD, EUR, ARS) y el importe final. Si el importe es negativo, se asume como un pago o reintegro (refund) y la fila se destaca visualmente. También podés usar el selector de moneda para asignarle una divisa a todas las filas cuando no viene indicada en cada línea.',
    category: 'cards',
    categoryLabel: 'Tarjetas de crédito & Cuotas',
    tags: ['pegado mágico', 'copiar y pegar', 'resumen bancario', 'parser', 'extracto', 'refund', 'moneda'],
    relatedWikiSlug: 'tarjetas-de-credito-y-cuotas'
  },
  {
    id: 'faq-card-accounting-period',
    question: '¿Qué pasa cuando compro con tarjeta después de la fecha de cierre?',
    answer: 'Al cargar un gasto con tarjeta de crédito vas a ver el selector "Mes contable (estado de cuenta)" con las opciones "Mes actual" y "Próximo mes". Si configuraste el día de cierre en tu tarjeta (por ejemplo, día 24) y cargás una compra del día 26, el sistema selecciona automáticamente "Próximo mes". Si la compra es en cuotas, todas las cuotas se desplazan en bloque a partir del próximo resumen.',
    category: 'cards',
    categoryLabel: 'Tarjetas de crédito & Cuotas',
    tags: ['mes contable', 'cierre', 'próximo mes', 'resumen', 'corte', 'cuotas', 'tarjeta'],
    relatedWikiSlug: 'tarjetas-de-credito-y-cuotas'
  },
  {
    id: 'faq-card-verify-statement',
    question: '¿Cómo verifico y concilio el estado de cuenta mensual de mi tarjeta?',
    answer: 'Entrá al detalle de tu tarjeta de crédito y tocá "Verificar resumen" (o accedé desde el banner recordatorio que aparece en el Dashboard durante los últimos 5 y primeros 5 días del mes). Vas a ver las pills con el total en moneda local y moneda extranjera, y debajo cada consumo con botones para Confirmar, Corregir el importe, Asignar al próximo mes (desplazando en cascada sus cuotas si aplica) o Agregar un gasto que no habías anotado.',
    category: 'cards',
    categoryLabel: 'Tarjetas de crédito & Cuotas',
    tags: ['verificar', 'conciliar', 'estado de cuenta', 'resumen', 'confirmar', 'corregir', 'próximo mes'],
    relatedWikiSlug: 'tarjetas-de-credito-y-cuotas'
  },
  {
    id: 'faq-people-share',
    question: '¿Cómo cargo un gasto que pagué yo pero le corresponde a otra persona?',
    answer: 'Al cargar el movimiento, en el desplegable "Persona" elegí el nombre de tu contacto en vez de "Personal". El monto se debitará de tu cuenta o tarjeta pero se imputará como saldo a favor en la ficha de esa persona bajo Cuentas por Cobrar.',
    category: 'people',
    categoryLabel: 'Personas & Cobros',
    tags: ['personas', 'amigos', 'prestado', 'cobrar', 'compartir'],
    relatedWikiSlug: 'personas-y-cuentas-por-cobrar'
  },
  {
    id: 'faq-people-partial',
    question: '¿Cómo registro cuando una persona me paga solo una parte de su deuda?',
    answer: 'Ingresá a Personas, abrí la ficha de tu contacto y tocá "Registrar Cobro". Escribí el monto que te transfirió y la cuenta donde recibiste la plata. El sistema aplicará una amortización FIFO (cancela primero los gastos más viejos) y dejará asentado el saldo pendiente restante.',
    category: 'people',
    categoryLabel: 'Personas & Cobros',
    tags: ['cobro parcial', 'devolución', 'fifo', 'amortización'],
    relatedWikiSlug: 'personas-y-cuentas-por-cobrar'
  },
  {
    id: 'faq-people-whatsapp',
    question: '¿Cómo personalizo el mensaje de cobro que envío por WhatsApp?',
    answer: 'Andá a Ajustes o al botón de plantilla en Personas (/people/template). Podés editar el mensaje predeterminado usando las etiquetas $Nombre, $Total, $Detalle, $Cantidad y $Fecha con previsualización en tiempo real.',
    category: 'people',
    categoryLabel: 'Personas & Cobros',
    tags: ['whatsapp', 'mensaje', 'plantilla', 'recordatorio'],
    relatedWikiSlug: 'personas-y-cuentas-por-cobrar'
  },
  {
    id: 'faq-people-reserved',
    question: '¿Por qué no puedo crear una persona llamada "Personal" o con un nombre repetido?',
    answer: '"Personal" es una palabra reservada del sistema creada por defecto para tus consumos propios, evitando mezclar tus gastos con deudas de terceros. Si intentás registrar a alguien con el nombre de un contacto existente, la app te avisará para que sumes una inicial o apellido (ej. "Diego M.") y así puedas distinguirlos sin confusiones al cargar movimientos o registrar cobros.',
    category: 'people',
    categoryLabel: 'Personas & Cobros',
    tags: ['personal', 'reservado', 'duplicado', 'nombre', 'inicial', 'contacto', 'personas'],
    relatedWikiSlug: 'personas-y-cuentas-por-cobrar'
  },
  {
    id: 'faq-acc-cash',
    question: '¿Cómo debo registrar cuando saco efectivo de un cajero automático (ATM)?',
    answer: 'Registralo como una Transferencia: elegí tu cuenta bancaria como origen y la cuenta "Efectivo (Cash)" como destino. No lo cargues como un gasto para no distorsionar tu dinero disponible.',
    category: 'accounts',
    categoryLabel: 'Cuentas & Bancos',
    tags: ['efectivo', 'cash', 'cajero', 'atm', 'transferencia'],
    relatedWikiSlug: 'cuentas-instituciones-y-efectivo'
  },
  {
    id: 'faq-acc-express',
    question: '¿Qué es y cuándo debo usar el Ajuste Express de Saldo?',
    answer: 'El Ajuste Express sirve para conciliar tu saldo en la app cuando no coincide exactamente con el extracto de tu banco (por propinas, comisiones o redondeos no registrados). En vez de buscar centavo por centavo, escribís el saldo real del banco y la app genera una fila contable de Ajuste automático.',
    category: 'accounts',
    categoryLabel: 'Cuentas & Bancos',
    tags: ['ajuste express', 'conciliación', 'saldo banco', 'diferencia'],
    relatedWikiSlug: 'cuentas-instituciones-y-efectivo'
  },
  {
    id: 'faq-acc-delete',
    question: '¿Por qué no puedo eliminar definitivamente una cuenta bancaria?',
    answer: 'Por protección contable. Si una cuenta tiene transacciones registradas, eliminarla de forma aislada rompería el historial de tus movimientos. Por eso Finance Nomad utiliza baja lógica (podés desactivarla para que no aparezca en el día a día sin perder la trazabilidad de tu dinero). El borrado físico definitivo solo se ejecuta en cascada cuando se da de baja por completo el usuario del sistema.',
    category: 'accounts',
    categoryLabel: 'Cuentas & Bancos',
    tags: ['eliminar', 'desactivar', 'baja lógica', 'seguridad contable', 'baja de usuario'],
    relatedWikiSlug: 'cuentas-instituciones-y-efectivo'
  },
  {
    id: 'faq-acc-period',
    question: '¿Cómo funciona el Período Contable dentro del detalle de una cuenta?',
    answer: 'Al igual que en Tarjetas de crédito y Personas, el detalle de cada cuenta (/accounts/{id}) incluye un selector de Período Contable (YYYY-MM). Te permite revisar resúmenes anteriores o futuros, sincronizar la verificación del estado de cuenta y alternar entre los movimientos del mes activo o el historial completo.',
    category: 'accounts',
    categoryLabel: 'Cuentas & Bancos',
    tags: ['período contable', 'cuentas', 'resumen', 'mes', 'filtro movimientos'],
    relatedWikiSlug: 'cuentas-instituciones-y-efectivo'
  },
  {
    id: 'faq-acc-bulk',
    question: '¿Cómo importo movimientos de mi home banking o extracto en una cuenta?',
    answer: 'Desde la ficha de tu cuenta bancaria o billetera (/accounts/{id}), tocá el botón "Carga rápida". Vas a ingresar a una grilla spreadsheet donde podés cargar movimientos por teclado o usar "Pegado Mágico" con el ícono de chispas. Pegá las líneas de texto copiadas de tu home banking o extracto; el sistema reconoce automáticamente fecha, comercio/concepto, monto, moneda y clasifica si es gasto (débito) o ingreso (sueldo, transferencia recibida).',
    category: 'accounts',
    categoryLabel: 'Cuentas & Bancos',
    tags: ['carga rápida', 'home banking', 'extracto', 'pegado mágico', 'importar', 'banco', 'billetera', 'caja de ahorro'],
    relatedWikiSlug: 'cuentas-instituciones-y-efectivo'
  },
  {
    id: 'faq-acc-magic-paste',
    question: '¿Cómo distingue el Pegado Mágico entre gastos e ingresos en cuentas bancarias?',
    answer: 'En cuentas bancarias y billeteras, el motor interpreta los montos con signo negativo o palabras de débito/compra como gastos (OUTCOME), y los montos positivos con signo más o palabras como sueldo, haberes, acreditación o transferencia recibida como ingresos (INCOME). Además, en la vista previa del pegado podés hacer clic en la etiqueta de cada fila para conmutar directamente entre Gasto e Ingreso antes de volcar a la grilla.',
    category: 'accounts',
    categoryLabel: 'Cuentas & Bancos',
    tags: ['pegado mágico', 'gastos', 'ingresos', 'signo', 'débito', 'crédito', 'conmutar', 'home banking'],
    relatedWikiSlug: 'cuentas-instituciones-y-efectivo'
  },
  {
    id: 'faq-offline-airplane',
    question: '¿Puedo usar la aplicación en un avión o sin datos móviles?',
    answer: 'Sí, totalmente. Toda la carga de movimientos, cobros, cuotas y transferencias funciona offline gracias al almacenamiento local en IndexedDB. Al reconectarte a internet, tus operaciones se sincronizan automáticamente con el servidor.',
    category: 'offline',
    categoryLabel: 'Offline & Datos',
    tags: ['offline', 'avión', 'sin internet', 'viaje', 'sincronización'],
    relatedWikiSlug: 'modo-offline-y-sincronizacion'
  },
  {
    id: 'faq-offline-sync',
    question: '¿Qué significan los estados del badge de sincronización en la barra superior?',
    answer: '• Verde ("Al día"): Tus datos están respaldados en la nube.\n• Spinner ("Sincronizando"): Transmitiendo datos pendientes.\n• Ámbar ("Guardado local"): Operando sin conexión, datos seguros en tu dispositivo.\n• "Reintentando": Reconectando tras una pérdida de red.',
    category: 'offline',
    categoryLabel: 'Offline & Datos',
    tags: ['badge', 'sincronización', 'indicador', 'conexión'],
    relatedWikiSlug: 'modo-offline-y-sincronizacion'
  },
  {
    id: 'faq-offline-pwa',
    question: '¿Qué pasa si recargo la página (F5) o abro la app sin internet?',
    answer: 'Gracias al Service Worker nativo y al manifiesto PWA, Finance Nomad no muestra la pantalla de error del navegador. El cascarón de la app se sirve desde la caché del navegador y los saldos, movimientos y préstamos se hidratan automáticamente desde tu base de datos local IndexedDB.',
    category: 'offline',
    categoryLabel: 'Offline & Datos',
    tags: ['pwa', 'service worker', 'f5', 'recarga', 'offline', 'pantalla de inicio'],
    relatedWikiSlug: 'modo-offline-y-sincronizacion'
  },
  {
    id: 'faq-app-version-update',
    question: '¿Cómo me entero cuando hay una nueva versión de Finance Nomad publicada?',
    answer: 'La aplicación verifica automáticamente en segundo plano al volver a la pestaña (si tenés conexión) si se publicó una versión más reciente. Cuando hay una actualización disponible, aparece un aviso discreto en la parte superior con el botón "Actualizar / Recargar", que limpia la caché del navegador y aplica los cambios en un toque. También podés verificarlo manualmente desde Ajustes > Sistema y entorno.',
    category: 'offline',
    categoryLabel: 'Offline & Datos',
    tags: ['versión', 'actualización', 'recargar', 'nueva versión', 'pwa', 'ajustes'],
    relatedWikiSlug: 'modo-offline-y-sincronizacion'
  },
  {
    id: 'faq-transactions-pagination',
    question: '¿Por qué los movimientos se muestran paginados en lugar de una lista interminable?',
    answer: 'Para prevenir el scroll infinito y mantener la interfaz ágil incluso con cientos o miles de operaciones registradas. Al paginar en bloques de 20 movimientos (y 10 en cobros de personas), el navegador consume menos memoria y renderiza fluidamente en cualquier teléfono. Podés recorrer las páginas con los botones Anterior/Siguiente o los números de página, y cargar lotes más antiguos cuando llegues al final.',
    category: 'transactions',
    categoryLabel: 'Movimientos & Ledger',
    tags: ['paginación', 'páginas', 'histórico', 'scroll', 'movimientos', 'cuentas'],
    relatedWikiSlug: 'libro-diario-y-zero-wait-ui'
  },
  {
    id: 'faq-cat-create',
    question: '¿Cómo creo o personalizo mis categorías de gastos?',
    answer: 'Entrá a la sección "Categorías" desde el menú lateral o el menú Más. Podés crear nuevas categorías asignándoles un nombre, un icono de la biblioteca y un color semántico para reconocerlas al instante.',
    category: 'budget',
    categoryLabel: 'Presupuesto & Categorías',
    tags: ['categorías', 'crear', 'color', 'iconos'],
    relatedWikiSlug: 'categorias-y-personalizacion'
  },
  {
    id: 'faq-cat-deactivate',
    question: '¿Puedo ocultar una categoría que ya no uso sin alterar mis balances?',
    answer: 'Sí. Editá la categoría y desmarcá la opción "Activa". Ya no figurará al cargar nuevos gastos, pero seguirá apareciendo en tus reportes históricos y movimientos previos.',
    category: 'budget',
    categoryLabel: 'Presupuesto & Categorías',
    tags: ['categoría', 'desactivar', 'ocultar', 'historial'],
    relatedWikiSlug: 'categorias-y-personalizacion'
  },
  {
    id: 'faq-budget-create',
    question: '¿Cómo agrego o edito mis gastos fijos e ingresos proyectados del mes?',
    answer: 'Entrá a "Presupuesto" (/budget) y tocá "Nuevo estimado". Elegí si es un gasto fijo recurrente o un ingreso proyectado, asignale un monto, moneda, categoría vinculada, día de vencimiento (1 al 31) y tu cuenta preferida. Podés editar o desactivar cualquier estimado cuando cambien tus costos fijos.',
    category: 'budget',
    categoryLabel: 'Presupuesto & Categorías',
    tags: ['presupuesto', 'gastos fijos', 'ingresos', 'alquiler', 'estimado', 'crear', 'editar'],
    relatedWikiSlug: 'presupuesto-mensual-y-gastos-fijos'
  },
  {
    id: 'faq-budget-execute-fx',
    question: '¿Qué pasa al tocar "Ejecutar pago" en un gasto fijo si mi cuenta está en otra moneda?',
    answer: 'Si el estimado y su cuenta preferida comparten la misma divisa, el pago se asienta de inmediato en 1 toque. Si la cuenta está en otra moneda (o si no configuraste cuenta preferida), se abre una confirmación rápida con la tasa de cambio sugerida para que verifiques el importe exacto a debitar antes de confirmar.',
    category: 'budget',
    categoryLabel: 'Presupuesto & Categorías',
    tags: ['presupuesto', 'ejecutar pago', '1-tap', 'multi-moneda', 'conversión', 'cuenta preferida'],
    relatedWikiSlug: 'presupuesto-mensual-y-gastos-fijos'
  },
  {
    id: 'faq-analytics-filters',
    question: '¿Cómo cambio el período de análisis en los reportes?',
    answer: 'En la parte superior de la pantalla de Análisis contás con botones para filtrar por "Este mes", "3 meses", "6 meses", "Este año" o "Histórico completo". Todos los KPIs y gráficos se actualizan en el acto.',
    category: 'budget',
    categoryLabel: 'Análisis & Reportes',
    tags: ['reportes', 'análisis', 'filtros', 'tiempo', 'meses'],
    relatedWikiSlug: 'analisis-reportes-y-kpis'
  },
  {
    id: 'faq-analytics-currencies',
    question: '¿Cómo se muestran los gastos de distintas monedas en los gráficos de análisis?',
    answer: 'Los gráficos de categorías y flujos convierten todos los importes a tu moneda global usando la tasa de cambio registrada en cada transacción. Además, disponés de un gráfico exclusivo de Distribución Multi-Moneda para ver cuánto gastaste en cada divisa local.',
    category: 'core',
    categoryLabel: 'Análisis & Reportes',
    tags: ['análisis', 'gráficos', 'conversión', 'divisas locales'],
    relatedWikiSlug: 'analisis-reportes-y-kpis'
  },
  {
    id: 'faq-analytics-scope-switch',
    question: '¿Cómo excluyo los gastos de terceros o compartidos en mis reportes?',
    answer: 'En la cabecera de Análisis (/analytics) disponés del Master Switch: elegí "Solo personales" para analizar estrictamente tus consumos y tasa de ahorro personal sin la distorsión de compras que hiciste a nombre de otras personas. Si seleccionás "Todos", vas a ver la totalidad de movimientos registrados.',
    category: 'analytics',
    categoryLabel: 'Análisis & Reportes',
    tags: ['análisis', 'master switch', 'terceros', 'gastos compartidos', 'costo de vida', 'personales'],
    relatedWikiSlug: 'analisis-reportes-y-kpis'
  },
  {
    id: 'faq-oauth-providers',
    question: '¿Puedo iniciar sesión con Google?',
    answer: 'Sí. Podés usar "Continuar con Google" en la pantalla de inicio de sesión para entrar al instante sin tener que recordar contraseñas ni esperar códigos de verificación por email.',
    category: 'core',
    categoryLabel: 'Multi-moneda (FX)',
    tags: ['oauth', 'google', 'login', 'social', 'registro']
  },
  {
    id: 'faq-welcome-wizard',
    question: '¿Cómo configuro mis primeras cuentas y categorías si soy nuevo?',
    answer: 'Al registrarte por primera vez, Finance Nomad te guía mediante un Asistente Inicial interactivo de 5 pasos. Podés elegir tu divisa base (sugerida automáticamente por tu región), configurar tus bancos o billeteras con sus cuentas y saldos iniciales reales (o límite de crédito para tarjetas de crédito), definir tus categorías y crear tus contactos para gastos compartidos (Split Pay).',
    category: 'accounts',
    categoryLabel: 'Cuentas & Bancos',
    tags: ['bienvenida', 'wizard', 'cuentas', 'tarjetas', 'limite', 'categorias', 'setup', 'inicial'],
    relatedWikiSlug: 'cuentas-e-instituciones-financieras'
  },
  {
    id: 'faq-password-requirements',
    question: '¿Qué requisitos debe cumplir mi contraseña y cómo la restablezco?',
    answer: 'La contraseña debe tener como mínimo 6 caracteres (recomendamos 8 o más combinando letras y números). Por seguridad, Supabase rechaza contraseñas vulnerables conocidas o filtradas en brechas públicas. Si la olvidaste o querés cambiarla, elegí "Restablecé la contraseña" en la pantalla de acceso para recibir un enlace de recuperación seguro en tu email.',
    category: 'core',
    categoryLabel: 'Multi-moneda (FX)',
    tags: ['contraseña', 'seguridad', 'recuperación', 'reset', 'requisitos', 'login']
  },
  {
    id: 'faq-login-progressive-flow',
    question: '¿Cómo funciona el acceso y registro rápido con email?',
    answer: 'Ingresá tu correo en la pantalla de acceso. Finance Nomad detecta automáticamente si ya tenés una cuenta para pedirte tu contraseña o, si sos nuevo, te permite crear tu contraseña en el momento sin tener que cambiar de pantalla.',
    category: 'core',
    categoryLabel: 'Multi-moneda (FX)',
    tags: ['login', 'registro', 'email', 'acceso', 'cuenta', 'contraseña']
  },
  {
    id: 'faq-loans-calc',
    question: '¿Cómo se calculan las cuotas de un préstamo?',
    answer: 'Finance Nomad utiliza el sistema francés de amortización con cuota nivelada, estándar de Banco Itaú Uruguay. A partir de la TEA (Tasa Efectiva Anual), calcula exponencialmente la tasa mensual y desglosa en cada cuota el capital amortizado y los intereses decrecientes, con opción de aplicar el 22% de IVA uruguayo.',
    category: 'loans',
    categoryLabel: 'Préstamos & Marcha',
    tags: ['préstamo', 'itaú', 'cuota', 'amortización', 'sistema francés', 'tea', 'iva', 'interés'],
    relatedWikiSlug: 'prestamos-y-amortizaciones'
  },
  {
    id: 'faq-loans-ledger',
    question: '¿Cómo impacta el pago de una cuota en mis gastos y presupuesto?',
    answer: 'Se aplica la Opción B de imputación contable: el pago genera dos movimientos ligados. El capital reduce tu deuda sin computar como consumo del mes, y los intereses se imputan a una categoría de costo financiero para reflejarse con total exactitud en tus gráficos de Análisis y en tu Presupuesto.',
    category: 'loans',
    categoryLabel: 'Préstamos & Marcha',
    tags: ['pago', 'cuota', 'ledger', 'intereses', 'capital', 'gastos', 'presupuesto'],
    relatedWikiSlug: 'prestamos-y-amortizaciones'
  },
  {
    id: 'faq-loans-intermediary',
    question: '¿Puedo tomar un préstamo de un banco y asignárselo a otra persona?',
    answer: 'Sí. Al crear el préstamo, podés indicar la Institución financiera que te otorgó los fondos (ej. Itaú) y seleccionar la Persona del directorio que es la beneficiaria real. De este modo, la app te ayuda a controlar tanto tu compromiso ante el banco como la deuda que esa persona tiene con vos.',
    category: 'loans',
    categoryLabel: 'Préstamos & Marcha',
    tags: ['intermediario', 'banco', 'persona', 'garante', 'amigos', 'terceros'],
    relatedWikiSlug: 'prestamos-y-amortizaciones'
  },
  {
    id: 'faq-loans-extraordinary',
    question: '¿Puedo realizar pagos adelantados o saltear cuotas?',
    answer: 'En esta etapa no se permiten pagos extraordinarios ni salteados. Las cuotas deben cancelarse en estricto orden cronológico correlativo (primero la cuota 1, luego la 2, etc.) para mantener la consistencia matemática de la marcha de amortización.',
    category: 'loans',
    categoryLabel: 'Préstamos & Marcha',
    tags: ['pagos extraordinarios', 'adelanto', 'orden secuencial', 'cuotas'],
    relatedWikiSlug: 'prestamos-y-amortizaciones'
  },
  {
    id: 'faq-portfolio-disclaimer',
    question: '¿De dónde salen las cotizaciones del Portafolio y qué precisión tienen?',
    answer: 'Las cotizaciones automáticas se consultan en fuentes públicas gratuitas (Yahoo / Google Finance para acciones y ETFs, y CoinGecko para criptomonedas) con caché inteligente y respaldo local para modo offline. Como indica el aviso informativo del módulo, los precios pueden tener demoras y se brindan exclusivamente para seguimiento personal y consolidación estimada.',
    category: 'portfolio',
    categoryLabel: 'Portafolio & Inversiones',
    tags: ['portafolio', 'cotizaciones', 'tickers', 'google finance', 'yahoo', 'coingecko', 'disclaimer', 'informativo'],
    relatedWikiSlug: 'portafolio-de-inversiones'
  },
  {
    id: 'faq-portfolio-account-impact',
    question: 'Al cargar una compra o venta de inversión, ¿se descuenta o acredita en mi cuenta bancaria?',
    answer: 'Es opcional y vos lo elegís en cada operación. Si cargás inversiones que ya tenías de antes, dejá desmarcada la casilla de impacto en cuenta para que solo queden en el seguimiento del portafolio. Si estás comprando o vendiendo hoy con plata de una cuenta, activá la casilla: la app descontará el capital invertido (en compras) o acreditará lo cobrado (en ventas) sin inflar tus gastos de consumo del mes.',
    category: 'portfolio',
    categoryLabel: 'Portafolio & Inversiones',
    tags: ['portafolio', 'compra', 'venta', 'buy', 'sell', 'cuenta bancaria', 'acreditar', 'descontar'],
    relatedWikiSlug: 'portafolio-de-inversiones'
  },
  {
    id: 'faq-portfolio-manual-price',
    question: '¿Cómo cargo un instrumento local (bono, plazo fijo o fondo) que no tiene ticker público?',
    answer: 'Al abrir "Registrar operación" en Portafolio, seleccioná "Instrumento local (Manual)". Ingresá un código identificatorio (ej. BONO-UY o PF-ITAU), las unidades, tu precio de compra y el valor unitario actual. Podés actualizar ese valor manual en cualquier momento tocando el ícono de lápiz junto al precio actual en la tabla de tenencias.',
    category: 'portfolio',
    categoryLabel: 'Portafolio & Inversiones',
    tags: ['portafolio', 'manual', 'instrumento local', 'bonos', 'plazo fijo', 'fondos', 'precio manual'],
    relatedWikiSlug: 'portafolio-de-inversiones'
  },
  {
    id: 'faq-portfolio-networth-toggle',
    question: '¿El valor de mi portafolio se suma al Patrimonio Neto del Dashboard?',
    answer: 'Sí, por defecto se consolida automáticamente en la tarjeta de Patrimonio Neto del Dashboard mostrando el desglose entre tus cuentas líquidas y el valor estimado del portafolio. Si querés ver únicamente tu liquidez sin inversiones, podés desmarcar el toggle "+ Portafolio" en la misma tarjeta.',
    category: 'portfolio',
    categoryLabel: 'Portafolio & Inversiones',
    tags: ['portafolio', 'patrimonio neto', 'dashboard', 'toggle', 'consolidación'],
    relatedWikiSlug: 'portafolio-de-inversiones'
  },
  {
    id: 'faq-transactions-edit-category',
    question: 'Guardé un movimiento sin categoría o me equivoqué en el detalle, ¿puedo actualizarlo sin borrarlo?',
    answer: 'Sí. En el listado de Movimientos (/transactions), en el Dashboard y en el detalle de cada cuenta (/accounts/{id}), los ingresos y gastos sin clasificar muestran el botón "+ Sin categoría" y cada fila incluye el ícono de lápiz ("Editar movimiento"). Desde ahí podés asignar o crear una categoría al instante, cambiar la persona asignada, editar la descripción, la fecha o corregir el monto en movimientos simples. Si el gasto es en cuotas, el sistema te permite aplicar el cambio de categoría y nota a todas las cuotas del plan automáticamente.',
    category: 'transactions',
    categoryLabel: 'Movimientos & Ledger',
    tags: ['editar', 'actualizar', 'sin categoría', 'categoría', 'movimiento', 'corregir', 'cuotas'],
    relatedWikiSlug: 'libro-diario-y-zero-wait-ui'
  }
]

export const QUICK_GUIDES: QuickGuide[] = [
  {
    id: 'guide-budget',
    title: 'Armar tu presupuesto fijo y ejecutar pagos en 1 toque',
    description: 'Configurá tus compromisos recurrentes e ingresos del mes para medir tu margen de ahorro y asentar pagos sin recargar datos.',
    iconName: 'PiggyBank',
    route: '/budget',
    routeLabel: 'Ir a Presupuesto',
    steps: [
      'Entrá a "Presupuesto" desde el menú lateral (o desde la tarjeta de Presupuesto en el Dashboard) y tocá "Nuevo estimado".',
      'Elegí "Gasto fijo recurrente", ingresá el concepto (ej. Alquiler), el monto estimado, la moneda, su categoría y el día de vencimiento.',
      'Seleccioná tu cuenta preferida para habilitar el pago rápido y guardá.',
      'Cuando llegue el día de pago, simplemente tocá "Ejecutar pago" en la tarjeta del estimado para asentarlo al instante en tu libro contable.'
    ]
  },
  {
    id: 'guide-pay-card-statement',
    title: 'Pagar el resumen mensual de tu tarjeta de crédito',
    description: 'Registrá la cancelación del resumen mensual de tu tarjeta de crédito eligiendo el mes contable a cancelar.',
    iconName: 'CreditCard',
    route: '/cards',
    routeLabel: 'Ir a Tarjetas de crédito',
    steps: [
      'Entrá a "Tarjetas de crédito" (/cards) o al detalle de tu tarjeta de crédito desde Cuentas.',
      'Tocá el botón "Registrar pago" para abrir el modal transaccional.',
      'En "Resumen a cancelar (mes contable)", confirmá si pagás el resumen del mes anterior o el mes en curso (la app sugiere automáticamente el mes cerrado).',
      'Seleccioná la cuenta bancaria de origen de los fondos e ingresá o cargá el monto total de la deuda con el atajo "Pagar total".',
      'Confirmá el pago: el débito se asienta en tu banco en la fecha real de la transferencia y el resumen de la tarjeta de crédito queda saldado sin duplicar gastos.'
    ]
  },
  {
    id: 'guide-verify-statement',
    title: 'Verificar y conciliar el resumen de tu tarjeta de crédito',
    description: 'Compará tus gastos registrados contra el estado de cuenta mensual, corregí diferencias o pasá compras post-cierre al próximo mes.',
    iconName: 'CreditCard',
    route: '/accounts',
    routeLabel: 'Ir a Cuentas',
    steps: [
      'Abrí tu tarjeta de crédito desde Cuentas (o desde el banner del Dashboard a fin/principio de mes) y tocá "Verificar resumen".',
      'Elegí el Mes contable que querés auditar y revisá las pills superiores con los totales por moneda y el estado de conciliación.',
      'Tocá "Confirmar" en cada gasto que coincida con tu extracto, o "Corregir" si necesitás ajustar el monto o comercio.',
      'Si una compra entró después de la fecha de cierre, tocá "Asignar al próximo mes" (si tiene cuotas, todas se correrán en cascada).',
      'Si en el resumen figura un cargo que olvidaste anotar, sumalo en el acto con "Agregar gasto al resumen".'
    ]
  },
  {
    id: 'guide-loans',
    title: 'Crear un préstamo y registrar el pago de cuotas',
    description: 'Calculá tu cuadro de amortización francesa de Banco Itaú y debitá cuotas con desglose exacto de capital e intereses.',
    iconName: 'Landmark',
    route: '/loans',
    routeLabel: 'Ir a Préstamos',
    steps: [
      'Entrá a "Préstamos" desde el menú y tocá "Nuevo Préstamo".',
      'Definí si es una deuda tomada o dinero que prestaste vos, completá el capital, la divisa, el plazo y la TEA (ej. 28.5%).',
      'Si el dinero ingresó a tu banco, activá la casilla para registrar el desembolso inicial automáticamente.',
      'Revisá la simulación interactiva de cuotas en vivo y confirmá la creación.',
      'En la ficha del préstamo, tocá "Pagar Cuota" en el vencimiento vigente, seleccioná tu cuenta de débito y confirmá.'
    ]
  },
  {
    id: 'guide-shared-dinner',
    title: 'Cargar una cena compartida con amigos',
    description: 'Registrá un gasto pagado por vos que le corresponde a otra persona sin inflar tus propios consumos.',
    iconName: 'Users',
    route: '/transactions/new',
    routeLabel: 'Nuevo movimiento',
    steps: [
      'Entrá a "Cargar movimiento" desde el botón destacado.',
      'Completá el importe total que pagaste en el restaurante y tu tarjeta o cuenta.',
      'En el campo "Persona", seleccioná el nombre de tu amigo (o crealo si es la primera vez).',
      'Guardá la transacción: el dinero se descuenta de tu saldo pero queda sumado como cuenta por cobrar en la ficha de esa persona.'
    ]
  },
  {
    id: 'guide-installments',
    title: 'Registrar una compra en cuotas con tarjeta de crédito',
    description: 'Gestioná compras en varios pagos sin distorsionar tu saldo de dinero disponible hoy.',
    iconName: 'CreditCard',
    route: '/transactions/new',
    routeLabel: 'Cargar compra',
    steps: [
      'Abrí el formulario de nuevo movimiento y seleccioná tu tarjeta de crédito.',
      'Ingresá el monto total de la compra en la moneda del comercio.',
      'En el selector "Cuotas", elegí la cantidad de pagos (ej. 3, 6 o 12).',
      'Listo: la primera cuota se debita hoy y las demás quedan agendadas automáticamente para los meses siguientes.'
    ]
  },
  {
    id: 'guide-reconcile',
    title: 'Conciliar el saldo de tu cuenta en 10 segundos',
    description: 'Ajustá el saldo de la app para que coincida exactamente con lo que dice la app de tu banco.',
    iconName: 'Sliders',
    route: '/accounts',
    routeLabel: 'Ir a Cuentas',
    steps: [
      'Andá a "Cuentas" y seleccioná la cuenta bancaria que querés conciliar.',
      'Tocá el botón "Ajuste Express".',
      'Escribí el saldo final exacto que ves en tu extracto bancario.',
      'Confirmá: Finance Nomad genera una transacción de ajuste automático por la diferencia exacta sin borrar movimientos anteriores.'
    ]
  },
  {
    id: 'guide-change-currency',
    title: 'Cambiar de país y divisa principal',
    description: 'Adaptá la visualización de tu dinero cuando te mudás a otro destino sin tocar tus saldos reales.',
    iconName: 'Coins',
    route: '/settings',
    routeLabel: 'Ir a Ajustes',
    steps: [
      'Abrí "Ajustes" desde el menú lateral o desde la opción Más en móvil.',
      'En la sección "Moneda global", elegí la divisa del nuevo país (ej. AUD, EUR, USD, UYU, NZD).',
      'El sistema reconvierte tu patrimonio neto total y los resúmenes del Dashboard en tiempo real.'
    ]
  },
  {
    id: 'guide-offline-usage',
    title: 'Usar la app en un avión o sin señal',
    description: 'Continuá anotando tus gastos sin preocuparte por la conexión a internet.',
    iconName: 'WifiOff',
    steps: [
      'Cargá tus movimientos normalmente aunque no tengas conexión.',
      'El indicador en la barra superior pasará a "Guardado local" (ámbar).',
      'Tus transacciones se guardan cifradas y seguras en la base de datos de tu teléfono.',
      'Al aterrizar o conectarte a WiFi, la app se sincroniza automáticamente en segundo plano.'
    ]
  },
  {
    id: 'guide-welcome-wizard',
    title: 'Configurar tu espacio en 30 segundos con el Asistente Inicial',
    description: 'Sembrá tus primeras cuentas con saldo real, categorías nómadas y contactos con un solo clic.',
    iconName: 'Sparkles',
    route: '/welcome',
    routeLabel: 'Abrir Asistente Inicial',
    steps: [
      'Al crear tu cuenta, el Asistente Inicial se abre automáticamente para nuevos usuarios.',
      'Elegí tu divisa de consolidación patrimonial (sugerida automáticamente por tu región).',
      'Definí tus instituciones y cuentas con sus monedas nativas, saldos reales o límite de crédito (en tarjetas).',
      'Seleccioná o agregá tus categorías y contactos para gastos compartidos.',
      'Tocá "Configurá mi espacio" para sembrar tus datos y entrar al Dashboard listo para operar.'
    ]
  },
  {
    id: 'guide-manage-currencies',
    title: 'Agregar una moneda personalizada y fijar su cotización',
    description: 'Habilitá divisas regionales como ARS o BRL y establecé una cotización manual directa contra tu divisa global.',
    iconName: 'Coins',
    route: '/settings',
    routeLabel: 'Ir a Ajustes',
    steps: [
      'Andá a Ajustes > sección "Mis Divisas Activas".',
      'Tocá "+ Agregar divisa" y buscá tu moneda en el catálogo (por ejemplo Pesos Argentinos - ARS).',
      'Cambiá el modo de cotización de "Auto" a "Manual".',
      'Escribí el valor directo contra tu moneda global (por ejemplo: si tu base es USD y el Blue cotiza a 1.280, poné 1280).',
      'Listo: tus cuentas y transacciones en esa divisa se calcularán siempre con tu tipo de cambio personalizado.'
    ]
  },
  {
    id: 'guide-card-bulk-ingest',
    title: 'Cargar consumos y cuotas pendientes de tarjeta de crédito en bloque',
    description: 'Importá los consumos de tu resumen bancario o compras en cuotas en segundos con la grilla rápida o pegado de texto.',
    iconName: 'CreditCard',
    route: '/accounts',
    routeLabel: 'Ir a Cuentas',
    steps: [
      'Entrá a Cuentas y abrí tu tarjeta de crédito.',
      'Tocá en "Carga rápida" junto a Pagar tarjeta (o ingresá tras el Asistente Inicial de Bienvenida).',
      'Elegí entre cargar filas ágilmente con teclado o tocar "Pegar Resumen Mágico" para pegar el texto copiado de tu banco.',
      'Si tenés compras en cuotas intermedias (ej. cuota 4 de 12), seleccionalo en el chip de cuotas: se computará la cuota 4 en el resumen y se agendarán automáticamente las cuotas 5 a 12 en meses futuros.',
      'Si pagaste gastos de un contacto, reasigná la columna Persona de "Personal" al contacto: se computará a cobrar y podrás ver el desglose en vivo.',
      'Verificá el cálculo en vivo de impacto financiero y tocá "Guardar consumos".'
    ]
  },
  {
    id: 'guide-account-bulk-ingest',
    title: 'Importar movimientos de home banking en una cuenta con Pegado Mágico',
    description: 'Copia y pegá los movimientos de tu extracto bancario o billetera para registrar ingresos y gastos en bloque.',
    iconName: 'Wallet',
    route: '/accounts',
    routeLabel: 'Ir a Cuentas',
    steps: [
      'Ingresá a Cuentas y abrí tu cuenta bancaria, caja de ahorro o billetera.',
      'Tocá el botón "Carga rápida" con el ícono de chispas en la cabecera.',
      'Presioná "Pegado Mágico" y pegá las líneas copiadas de tu home banking (o tocá "Cargar ejemplo" para ver el formato).',
      'Revisá la vista previa: el detector clasifica automáticamente si es Gasto o Ingreso y sugiere categorías.',
      'Hacé clic en "Volcar a la grilla", revisá el impacto financiero en vivo y tocá "Guardar movimientos".'
    ]
  },
  {
    id: 'guide-portfolio',
    title: 'Registrar tus inversiones y consolidarlas en tu Patrimonio Neto',
    description: 'Llevá el control de tus acciones, ETFs, cripto o instrumentos locales y decidí cuándo impactar tus cuentas bancarias.',
    iconName: 'TrendingUp',
    route: '/portfolio',
    routeLabel: 'Ir a Portafolio',
    steps: [
      'Entrá a "Portafolio" (/portfolio) desde el menú lateral y tocá "Registrar operación".',
      'Elegí si es una Compra (BUY) o Venta (SELL), y seleccioná "Ticker de mercado (Auto)" para activos públicos (ej. AAPL, SPY, BTC-USD) o "Instrumento local (Manual)" para bonos y fondos propios.',
      'Ingresá la cantidad de unidades, el precio unitario de la operación y la divisa.',
      'Si querés descontar la compra o acreditar la venta en una cuenta bancaria, activá la casilla opcional y elegí la cuenta.',
      'Guardá la operación: verás tu Costo Promedio Ponderado (PPC), tu rendimiento abierto y el valor consolidado en el Patrimonio Neto del Dashboard.'
    ]
  },
  {
    id: 'guide-edit-transaction-category',
    title: 'Asignar categoría o corregir un movimiento ya guardado',
    description: 'Clasificá en 1 clic los gastos o ingresos que guardaste rápido sin categoría o corregí su nota, persona o importe.',
    iconName: 'Tags',
    route: '/transactions',
    routeLabel: 'Ir a Movimientos',
    steps: [
      'Ubicá el movimiento en Movimientos (/transactions), en el widget del Dashboard o dentro de la ficha de su cuenta (/accounts/{id}).',
      'Tocá directamente el chip "+ Sin categoría" (o el ícono de lápiz a la derecha del monto).',
      'Elegí la categoría correspondiente en el selector (o tocá "+ Crear categoría..." para dar de alta una nueva en el acto).',
      'Si querés, ajustá también la descripción, la fecha, la persona asignada o el importe.',
      'Si es una compra en cuotas, dejá marcada la casilla "Aplicar a todas las cuotas del plan" y tocá "Guardar cambios".'
    ]
  }
]

export function searchHelp(
  query: string,
  categoryFilter: string = 'all'
): {
  articles: WikiArticle[]
  faqs: FaqItem[]
  guides: QuickGuide[]
  totalMatches: number
} {
  const cleanQuery = query.trim().toLowerCase()
  const isAllCategories = categoryFilter === 'all'

  // Filtrar artículos
  const articles = WIKI_ARTICLES.filter((article) => {
    const matchesCategory = isAllCategories || article.category === categoryFilter
    if (!matchesCategory) return false
    if (!cleanQuery) return true

    const inTitle = article.title.toLowerCase().includes(cleanQuery)
    const inSummary = article.summary.toLowerCase().includes(cleanQuery)
    const inCategory = article.categoryLabel.toLowerCase().includes(cleanQuery)
    const inSections = article.sections.some(
      (sec) =>
        sec.title.toLowerCase().includes(cleanQuery) ||
        sec.content.toLowerCase().includes(cleanQuery) ||
        (sec.tip && sec.tip.toLowerCase().includes(cleanQuery))
    )

    return inTitle || inSummary || inCategory || inSections
  })

  // Filtrar FAQs
  const faqs = FAQ_ITEMS.filter((faq) => {
    const matchesCategory = isAllCategories || faq.category === categoryFilter
    if (!matchesCategory) return false
    if (!cleanQuery) return true

    const inQuestion = faq.question.toLowerCase().includes(cleanQuery)
    const inAnswer = faq.answer.toLowerCase().includes(cleanQuery)
    const inCategory = faq.categoryLabel.toLowerCase().includes(cleanQuery)
    const inTags = faq.tags.some((tag) => tag.toLowerCase().includes(cleanQuery))

    return inQuestion || inAnswer || inCategory || inTags
  })

  // Filtrar Guías Rápidas
  const guides = QUICK_GUIDES.filter((guide) => {
    if (!cleanQuery) return true
    const inTitle = guide.title.toLowerCase().includes(cleanQuery)
    const inDesc = guide.description.toLowerCase().includes(cleanQuery)
    const inSteps = guide.steps.some((step) => step.toLowerCase().includes(cleanQuery))
    return inTitle || inDesc || inSteps
  })

  const totalMatches = articles.length + faqs.length + guides.length

  return {
    articles,
    faqs,
    guides,
    totalMatches
  }
}
