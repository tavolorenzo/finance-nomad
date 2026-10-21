export interface WikiSection {
  title: string
  content: string
  tip?: string
}

export interface WikiArticle {
  id: string
  slug: string
  title: string
  category: 'core' | 'accounts' | 'transactions' | 'cards' | 'people' | 'budget' | 'analytics' | 'offline'
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
  category: 'core' | 'accounts' | 'cards' | 'people' | 'budget' | 'offline'
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
  { id: 'cards', label: 'Tarjetas & Cuotas' },
  { id: 'people', label: 'Personas & Cobros' },
  { id: 'accounts', label: 'Cuentas & Bancos' },
  { id: 'transactions', label: 'Movimientos & Ledger' },
  { id: 'budget', label: 'Presupuesto & Categorías' },
  { id: 'analytics', label: 'Análisis & Reportes' },
  { id: 'offline', label: 'Offline & Datos' }
] as const

export const WIKI_ARTICLES: WikiArticle[] = [
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
    summary: 'Cómo gestiona Finance Nomad las monedas del mundo, cotizaciones automáticas, conversiones cruzadas y sobreescritura manual.',
    sections: [
      {
        title: 'Divisa Global vs. Divisas Nominales',
        content: 'Finance Nomad está diseñado para personas que se mueven entre países. Tu patrimonio neto total y los totales del Dashboard se consolidan en tu "Moneda global" elegida (por ejemplo EUR, USD, AUD, UYU o NZD). Sin embargo, cada cuenta bancaria o billetera conserva su saldo nominal real en su moneda nativa, sin sufrir conversiones artificiales al visualizar tus cuentas.'
      },
      {
        title: 'Motor de Cotizaciones en Vivo y Fallback',
        content: 'La app consulta tipos de cambio en tiempo real a través de open.er-api.com (con soporte integral para divisas internacionales y regionales como UYU) y cuenta con un fallback secundario a la API del Banco Central Europeo (Frankfurter). Las cotizaciones se almacenan en una caché local con un tiempo de vida (TTL) de 1 hora para asegurar velocidad y funcionamiento sin conexión.'
      },
      {
        title: 'Sobreescritura Manual de Cotización',
        content: 'Si tu banco o casa de cambio aplicó una tasa diferente a la oficial del mercado, podés modificar manualmente el tipo de cambio en el formulario de movimiento. Al hacerlo, el sistema marca el registro como tasa personalizada (rate_overridden: true), garantizando que futuras actualizaciones de mercado nunca pisen tu cotización real.',
        tip: 'Al ingresar un movimiento en moneda extranjera, siempre podés revisar el contravalor calculado y editar tanto la tasa como la comisión (fee).'
      }
    ],
    relatedFaqIds: ['faq-fx-calc', 'faq-fx-manual', 'faq-fx-dashboard']
  },
  {
    id: 'wiki-cards',
    slug: 'tarjetas-de-credito-y-cuotas',
    title: 'Tarjetas de Crédito y Cuotas Diferidas',
    category: 'cards',
    categoryLabel: 'Tarjetas & Cuotas',
    iconName: 'CreditCard',
    badge: 'Contabilidad Precisa',
    targetRoute: '/transactions/new',
    targetLabel: 'Cargar gasto en cuotas',
    summary: 'Funcionamiento del sistema de cuotas automáticas (1 de N), compromisos diferidos y liquidación de resúmenes de tarjeta.',
    sections: [
      {
        title: 'Distribución Automática de Cuotas',
        content: 'Al cargar una compra en N pagos (por ejemplo 6 cuotas con tarjeta de crédito), Finance Nomad genera automáticamente las N filas en el libro contable distribuidas mes a mes. La cuota 1 se marca como COMPLETED y descuenta del saldo disponible de la tarjeta hoy; las cuotas 2 a N se agendan como PENDING vinculadas por un identificador común (parent_transaction_id).'
      },
      {
        title: 'Compromisos Diferidos vs. Saldo Nominal',
        content: 'Las cuotas futuras PENDING no reducen por adelantado tu saldo de dinero actual, pero sí computan en el límite de crédito consumido y en los compromisos proyectados de los próximos meses. De esta forma, siempre sabés cuánto margen tenés sin distorsionar tu patrimonio de hoy.'
      },
      {
        title: 'Pago del Resumen de Tarjeta',
        content: 'El pago de la tarjeta no es un gasto nuevo (el gasto ya se computó al comprar), sino una transferencia interna entre tu cuenta bancaria y tu tarjeta de crédito. Usá el botón "Pagar tarjeta" desde la ficha de la cuenta para precargar el saldo adeudado y saldarlo en un solo clic.',
        tip: 'Pagar la tarjeta nunca reduce tu presupuesto de consumo mensual porque se registra contablemente como TRANSFER.'
      }
    ],
    relatedFaqIds: ['faq-card-installments', 'faq-card-payment', 'faq-card-dates']
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
        title: 'Atribución de Compras a Contactos',
        content: 'Cuando hacés una compra en nombre de un amigo o familiar (o le prestás una extensión de tu tarjeta), podés seleccionar a esa persona en el campo "Persona" del formulario. El gasto no inflará tus consumos personales y se sumará automáticamente a la cuenta por cobrar de esa persona.'
      },
      {
        title: 'Cobros Totales, Parciales y Adelanto de Cuotas',
        content: 'En la ficha de cada persona podés registrar devoluciones con el modal "Registrar Cobro":\n• Caso A (Pago Total): Cancela el 100% de la deuda vencida.\n• Caso B (Pago Parcial): Aplica amortización cronológica FIFO a los consumos más antiguos.\n• Caso C (Adelanto): Cancela el saldo actual y descuenta el excedente de las cuotas diferidas futuras.'
      },
      {
        title: 'Notificación Interactiva por WhatsApp',
        content: 'Tocá "Notificar por WhatsApp" en la ficha de una persona para abrir el modal interactivo. Podés verificar el número de teléfono, revisar el texto generado y modificarlo antes de enviar. En Ajustes podés personalizar la plantilla con variables como $Nombre, $Total, $Detalle, $Cantidad y $Fecha.',
        tip: 'La desactivación de una persona se bloquea si todavía tiene saldos pendientes de cobro, protegiendo tus números.'
      }
    ],
    relatedFaqIds: ['faq-people-share', 'faq-people-partial', 'faq-people-whatsapp']
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
        title: 'Jerarquía Institución -> Cuentas',
        content: 'Cada cuenta pertenece a una Institución Financiera (por ejemplo N26, Commbank, Itaú o Wise). Dentro de cada institución podés crear cuentas de tipo Corriente (checking), Ahorros (savings), Tarjeta de Crédito (credit_card), Inversión (investing) o Efectivo (cash).'
      },
      {
        title: 'Cuenta Cash y Retiros de Cajero (ATM)',
        content: 'El sistema incluye por defecto una cuenta de Efectivo (Cash). Cuando retirás dinero de un cajero automático, no lo cargues como un gasto: registralo como una Transferencia desde tu cuenta bancaria hacia tu cuenta Cash. El gasto real ocurrirá recién cuando pagues en efectivo por un café o un servicio.'
      },
      {
        title: 'Ajuste Express de Saldo',
        content: 'Si tu saldo en la app no coincide con tu extracto bancario real (por ejemplo por propinas, redondeos o comisiones chicas), tocá "Ajuste Express" en la cuenta. Ingresá el saldo real del banco y el sistema generará automáticamente una fila contable de tipo ADJUSTMENT por la diferencia exacta, sin borrar ni alterar tu historial previo.',
        tip: 'Por seguridad contable, las instituciones y cuentas nunca se borran físicamente (soft delete: is_active = false) para no dejar transacciones huérfanas.'
      }
    ],
    relatedFaqIds: ['faq-acc-cash', 'faq-acc-express', 'faq-acc-delete']
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
      }
    ],
    relatedFaqIds: ['faq-ledger-types', 'faq-ledger-speed', 'faq-offline-sync']
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
      }
    ],
    relatedFaqIds: ['faq-analytics-filters', 'faq-analytics-currencies']
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
      }
    ],
    relatedFaqIds: ['faq-offline-airplane', 'faq-offline-sync']
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
    id: 'faq-card-installments',
    question: '¿Cómo registro una compra en cuotas con tarjeta de crédito?',
    answer: 'En el formulario de nuevo movimiento, seleccioná tu tarjeta de crédito y en el campo "Cuotas" elegí la cantidad de pagos (por ejemplo 3, 6 o 12). La app debitará la primera cuota hoy y agendará automáticamente las cuotas restantes mes a mes en estado pendiente.',
    category: 'cards',
    categoryLabel: 'Tarjetas & Cuotas',
    tags: ['tarjeta', 'cuotas', 'pagos', 'crédito', 'diferido'],
    relatedWikiSlug: 'tarjetas-de-credito-y-cuotas'
  },
  {
    id: 'faq-card-payment',
    question: '¿Pagar el resumen de mi tarjeta cuenta como un gasto en mis reportes?',
    answer: 'No. Cuando compraste algo con la tarjeta, ese consumo ya se contabilizó en tus gastos. El pago del resumen se registra como una Transferencia desde tu cuenta bancaria hacia la tarjeta, disminuyendo tu deuda sin duplicar tus gastos en los reportes.',
    category: 'cards',
    categoryLabel: 'Tarjetas & Cuotas',
    tags: ['pago tarjeta', 'transferencia', 'presupuesto', 'consumo', 'duplicado'],
    relatedWikiSlug: 'tarjetas-de-credito-y-cuotas'
  },
  {
    id: 'faq-card-dates',
    question: '¿Qué pasa si una cuota futura cambia de fecha o se adelanta?',
    answer: 'Podés ingresar a la sección de Movimientos y editar cualquier cuota pendiente para ajustar su fecha o confirmarla inmediatamente como cobrada/pagada.',
    category: 'cards',
    categoryLabel: 'Tarjetas & Cuotas',
    tags: ['cuotas', 'fechas', 'adelantar', 'movimientos'],
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
    answer: 'Por protección contable. Si una cuenta tiene transacciones registradas, eliminarla rompería el historial de tus movimientos. Por eso Finance Nomad utiliza baja lógica: podés desactivarla para que no aparezca en el día a día sin perder la trazabilidad de tu dinero.',
    category: 'accounts',
    categoryLabel: 'Cuentas & Bancos',
    tags: ['eliminar', 'desactivar', 'baja lógica', 'seguridad contable'],
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
    answer: 'Al registrarte por primera vez, Finance Nomad te guía mediante un Asistente Inicial interactivo. Podés elegir tu divisa base, seleccionar un pack de inicio (Nómada Digital o Local Clásico) y sembrar categorías y contactos en un clic.',
    category: 'accounts',
    categoryLabel: 'Cuentas & Bancos',
    tags: ['bienvenida', 'wizard', 'cuentas', 'categorias', 'setup', 'inicial'],
    relatedWikiSlug: 'cuentas-e-instituciones-financieras'
  }
]

export const QUICK_GUIDES: QuickGuide[] = [
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
    title: 'Registrar una compra en cuotas con tarjeta',
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
    description: 'Sembrá tus primeras cuentas, categorías nómadas y contactos con un solo clic.',
    iconName: 'Sparkles',
    route: '/welcome',
    routeLabel: 'Abrir Asistente Inicial',
    steps: [
      'Andá a Ajustes o abrí el Asistente Inicial directamente.',
      'Elegí tu divisa de referencia (EUR, USD, AUD, UYU, etc.).',
      'Seleccioná tu pack de cuentas favorito (Nómada Digital o Tradicional/Local).',
      'Revisá las categorías sugeridas y tocá "Inicializar mi espacio".'
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
