---
name: changelog
description: Usar obligatoriamente al finalizar cualquier cambio, corrección de bugs, refactorización o nueva funcionalidad en el proyecto para registrar la versión en docs/CHANGELOG.md.
---

Instrucción obligatoria para cualquier cambio en el repositorio:

Al terminar una tarea, actualizá `docs/CHANGELOG.md` siguiendo el estándar [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/):

1. **Ubicación**:
   - Si no hay un release formal con tag nuevo, agregá el cambio bajo la sección `## [Unreleased]`.
   - Si se trata de un corte de versión, definí la cabecera `## [X.Y.Z] - YYYY-MM-DD`.

2. **Categorías a utilizar**:
   - `### Agregado`: para nuevas características, pantallas, componentes o Server Actions.
   - `### Modificado`: para cambios en funcionalidades o comportamientos existentes.
   - `### Corregido`: para solución de bugs o errores de cálculo/interfaz.
   - `### Eliminado`: para características o código removido.

3. **Formato de la entrada**:
   - Descripción clara y concisa en español.
   - Referencia al archivo modificado o componente principal.
   - Referencia al PRD (§X.Y) si corresponde.
