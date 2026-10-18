---
name: help-maintenance
description: Usar obligatoriamente al incorporar o modificar funcionalidades, módulos, flujos contables o pantallas para actualizar la Wiki, Preguntas Frecuentes y Guías en apps/web/lib/help-data.ts y docs/PRD.md.
---

# Mantenimiento del Centro de Ayuda, FAQ y Wiki

Cada vez que se implemente una funcionalidad nueva, se modifique una regla de negocio o se añada una pantalla/modal en `apps/web`:

1. **Actualizar la Wiki (`apps/web/lib/help-data.ts`)**:
   - Si creás un módulo nuevo (ej. Préstamos, Portafolio, Conciliación bancaria), agregá un objeto `WikiArticle` a `WIKI_ARTICLES`:
     - `id`: identificador único prefijado (ej. `wiki-loans`).
     - `slug`: url-friendly string en minúsculas y guiones.
     - `title`: nombre claro de la funcionalidad.
     - `category`: asociá a la categoría correspondiente (`core`, `cards`, `people`, `accounts`, `transactions`, `budget`, `analytics`, `offline`).
     - `iconName`: nombre de icono Lucide válido existente en `ICON_MAP` de `HelpCenter.tsx`.
     - `badge`: etiqueta orientativa breve (ej. 'En Desarrollo', 'Nuevo').
     - `targetRoute`: enlace directo a la página de la funcionalidad (ej. `/loans`).
     - `sections`: desglose de subsecciones con conceptos, funcionamiento y tips prácticos (`tip`).
     - `relatedFaqIds`: array con IDs de preguntas frecuentes asociadas.

2. **Actualizar Preguntas Frecuentes (`FAQ_ITEMS`)**:
   - Agregá al menos 1 o 2 preguntas frecuentes en `FAQ_ITEMS` abordando:
     - ¿Cómo se usa esta funcionalidad?
     - ¿Cómo impacta en el patrimonio neto, saldos nominales o presupuesto?
     - Casos especiales (ej. offline, comisiones, monedas extranjeras).
   - Incluí `tags` semánticos para alimentar el buscador instantáneo.

3. **Recetas Rápidas (`QUICK_GUIDES`)**:
   - Si la funcionalidad introduce un flujo transaccional recurrente, agregá una receta paso a paso de 3 a 4 pasos en `QUICK_GUIDES`.

4. **Tono Rioplatense**:
   - Todo texto debe tratar de "vos", ser conciso, directo y sin formalismos como "por favor" (ver `copy-style/SKILL.md`).

5. **Pruebas Automatizadas**:
   - Ejecutá `npm test -- lib/help-data.test.ts components/HelpCenter.test.tsx --run` para verificar unicidad de IDs, coherencia de categorías y que ningún test falle.
