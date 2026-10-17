# Progress — TrackFlow

> Estado actual y próximos pasos del proyecto. **Debe actualizarse en cada sesión**
> (ver protocolo obligatorio en [`AGENTS.md`](../AGENTS.md)).

## Estado actual

**Fase de configuración de infraestructura de agentes y mapa del monorepo (Hito 0/1).**

- [x] Inicializado el banco de memoria (`./memory-bank/`): `projectbrief.md`, `techContext.md`, `progress.md`.
- [x] Protocolo de agentes (`./AGENTS.md`) y estructura `.agents/` (reglas + skills).
- [x] **Mapeo de Capa de Aplicación** documentado en `techContext.md` (`./uis/website`, `./uis/backoffice`, `/services`).
- [x] Capa de dominio TypeScript (`src/types/models.ts`, `src/utils/*`) validada con `npx tsc --noEmit`.
- [x] Hito 2 (parcialmente): interfaz de pruebas `console.html` + `src/interactive-demo.ts`.
- [x] Sitio estático B2B (Hito 1) construido en la raíz: `index.html`, `application.html`, `validation.js`.

## Hito 1 — Sitio Web Público (objetivo actual del banco de memoria)

- [x] Landing page B2B (Header, Hero, Servicios, Cobertura, Beneficios, Contacto/Footer).
- [x] Formulario de solicitud de información con los 12 campos y validaciones.
- [x] Mensajes de error exactos de `CONTEXT.es.md`.
- [x] Advertencia de volumen "0-100 envíos/mes".
- [x] Marcado Schema.org `Organization` en la landing.
- [ ] **Migración a estructura oficial:** mover el sitio público a `./uis/website` (actualmente en la raíz).
- [ ] **Admin/Backoffice:** inicializar `./uis/backoffice` (hito futuro).
- [ ] **APIs:** crear microservicios en `/services` (hito futuro).

## Próximos pasos inmediatos

1. **Desarrollo UI y validaciones de formulario en `./uis/website`** (landing + formulario) respetando el README de `uis/`.
2. Implementar las validaciones en `./uis/website` con los mensajes exactos del briefing.
3. Integración del marcado Schema.org `Organization` (JSON-LD).
4. Pruebas de envío del formulario (simulación) y verificación con la skill `validate-landing-form`.

## Registro de avances

### 2026-10-17 — Configuración infraestructura de agentes y banco de memoria (actualización v2)

- Actualizado `memory-bank/` con el **mapeo estricto de capa de aplicación** (`./uis/website`, `./uis/backoffice`, `/services`) y la restricción de **prohibido crear carpetas paralelas** (`/apps`, `/frontend`, `/backend`, `/src/website`, etc.).
- Reordenado el flujo obligatorio de `AGENTS.md` en 4 pasos: **Requisitos → Rutas de Aplicación → Código y Calidad → Memoria**.
- Creada la regla `.agents/rules/app-structure-and-code.md` (aplicable a `./uis/**` y `/services/**`).
- Renombrada la skill a `.agents/skills/validate-landing-form/SKILL.md` (validación del sitio + formulario en `./uis/website`).
- Confirmado estado del repo: rama `feature/domain-models`, sin cambios pendientes.
- **Estado de validaciones:** `npx tsc --noEmit` ✅ | `npm run build` ✅ | preview local ✅ (HTTP 200).

> _Este archivo debe actualizarse al final de cada cambio relevante, conforme al flujo de `AGENTS.md`._
