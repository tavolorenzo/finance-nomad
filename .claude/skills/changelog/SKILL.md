---
name: changelog
description: Usar obligatoriamente al finalizar cualquier cambio, corrección de bugs, refactorización o nueva funcionalidad en el proyecto para registrar la versión en docs/CHANGELOG.md.
---

Instrucción obligatoria para cualquier cambio en el repositorio:

Al implementar cualquier cambio funcional, refactorización, corrección de bugs o nueva funcionalidad:

1. **Mantenimiento de Versión en el Código (SemVer)**:
   - Al incorporar funcionalidades nuevas o cambios funcionales, incrementá la versión (`MAJOR.MINOR.PATCH`) en:
     - `apps/web/package.json` (`version`)
     - `apps/web/lib/version.ts` (retorno por defecto de `getAppVersion()`)
     - `apps/web/lib/version.test.ts` (pruebas unitarias)

2. **Registro en Changelog (`docs/CHANGELOG.md`)**:
   - Seguí el estándar [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/):
   - **Ubicación**:
     - Si se formaliza un corte de versión, definí la cabecera `## [X.Y.Z] - YYYY-MM-DD`.
     - Si es un cambio intermedio sin corte de versión, agregalo bajo la sección `## [Unreleased]`.
   - **Categorías a utilizar**:
     - `### Agregado`: para nuevas características, pantallas, componentes o Server Actions.
     - `### Modificado`: para cambios en funcionalidades o comportamientos existentes.
     - `### Corregido`: para solución de bugs o errores de cálculo/interfaz.
     - `### Eliminado`: para características o código removido.
   - **Formato de la entrada**:
     - Descripción clara y concisa en español (tono rioplatense).
     - Referencia al archivo modificado o componente principal con enlaces markdown.
     - Referencia al PRD (§X.Y) si corresponde.
