# Progress — TrackFlow

> Estado actual y próximos pasos del proyecto. **Debe actualizarse en cada cambio relevante**
> (ver protocolo obligatorio en [`AGENTS.md`](../AGENTS.md)).

## Estado actual

**✅ Setup de infraestructura de agentes completado (2026-10-20).** El briefing canónico es `BRIEFING.md`; la aplicación aún conserva partes en la raíz y su migración oficial está pendiente.

- [x] Inicializado el banco de memoria (`./memory-bank/`): `projectbrief.md`, `techContext.md`, `progress.md`.
- [x] Protocolo de agentes (`./AGENTS.md`) y estructura `.agents/` (reglas + skills).
- [x] **Mapeo de Capa de Aplicación** documentado en `techContext.md` (`./uis/website`, `./uis/backoffice`, `./services`).
- [x] Regla de aplicación `.agents/rules/app-structure-and-code.md` (aplicable a `./uis/**` y `./services/**`).
- [x] Skill de validación `.agents/skills/validate-landing-form/SKILL.md`.
- [x] Capa de dominio TypeScript (`src/types/models.ts`, `src/utils/*`) validada con `npx tsc --noEmit`.
- [x] Hito 2 (parcial): modelos y utilidades TypeScript, demo de consola `console.html` + `src/interactive-demo.ts`.
- [x] Sitio estático B2B (Hito 1) construido en la raíz: `index.html`, `application.html`, `validation.js`; la migración a `uis/website` sigue pendiente.
- [ ] Hito 3: alcance no especificado en `BRIEFING.md`; no se atribuyen entregables hasta recibir su definición oficial.
- [x] AUTH-01: autenticación JWT, modelos Pydantic, capa CRUD (`src/services.py`) y routers FastAPI sobre TinyDB implementados en `src/` por solicitud explícita. `User` persiste solo `id`, `email`, `hashed_password`, `is_active`, `role` y `created_at`; los datos personales viven en `profiles`. Es una excepción temporal a `./services`; migrar allí antes de ampliar el backend.
- [x] Seguridad de rutas: `GET/PUT /profiles/me` están protegidas y `/users` exige autenticación; listado, lectura y borrado impiden el acceso a cuentas ajenas sin rol admin. No existen cinco rutas adicionales de inventario/pedidos/productos en el repo; solo están definidas las dos rutas de perfiles fuera de `/users` y `/auth`.
- [x] Auditoría reproducible AUTH-01 en `scripts/auth01_audit.py`: última ejecución, 12 verificaciones PASS y 0 FAIL; queda BLOCKED el criterio de cinco rutas externas porque solo existen `GET/PUT /profiles/me` fuera de `/users` y `/auth`.
- [x] Suite pytest en `tests/test_auth_validation.py`: última ejecución `10 passed, 1 failed`; la única falla es el criterio de cinco rutas externas, ya que solo existen `GET/PUT /profiles/me` fuera de `/users` y `/auth`.

## Hito 1 — Sitio Web Público

- [x] Landing page B2B (Header, Hero, Servicios, Cobertura, Beneficios, Contacto/Footer).
- [x] Formulario de solicitud de información con los 12 campos y validaciones.
- [x] Mensajes de error exactos de `BRIEFING.md`.
- [x] Advertencia de volumen "0-100 envíos/mes".
- [x] Marcado Schema.org `Organization` en la landing.
- [ ] **Migración a estructura oficial:** mover el sitio público a `./uis/website` (actualmente en la raíz); revisar antes `uis/README.md`.
- [ ] **Admin/Backoffice:** inicializar `./uis/backoffice` (hito futuro).
- [ ] **APIs:** crear servicios backend en `./services` (hito futuro).

## Próximos pasos

1. Validar landing, formulario y JSON-LD contra `BRIEFING.md` usando `.agents/skills/validate-landing-form/SKILL.md`; registrar las comprobaciones que realmente se ejecuten.
2. Migrar el sitio existente a `./uis/website`, respetando el README de `uis/` y evitando duplicar aplicaciones.
3. Completar o definir el alcance del Hito 2 y sus pruebas; el estado actual es una demo de utilidades, no un producto operacional.
4. Solicitar la definición oficial del Hito 3 antes de planificarlo.
5. En hitos posteriores, implementar backoffice y APIs solo en `./uis/backoffice` y `./services`, respectivamente, después de revisar sus README.
6. Migrar los módulos AUTH-01 de `src/` a `./services` cuando se autorice la normalización de la estructura.

## Registro de avances

### 2026-10-17 — Verificación final del flujo de entrega (4 pasos) ✅

- Ejecutada la verificación completa de los 4 pasos de `AGENTS.md` sobre la rama `feature/agent-memory-bank`.
- **Paso 1 — Requisitos:** confirmado que todos los documentos usan la empresa real **TrackFlow** (Los Ángeles + Zaragoza, 130 empleados, ~9M€, 3 servicios: almacén, última milla, logística inversa; Hito 1 Landing/Formulario). Sin placeholders ni texto genérico.
- **Paso 2 — Rutas:** confirmado que NO existen carpetas paralelas (`/apps`, `/frontend`, `/backend`, `/src/website`, etc.). Capa de aplicación mapeada solo en `./uis/website`, `./uis/backoffice` y `/services`.
- **Paso 3 — Calidad:** sin archivos temporales (`.tmp`/`.bak`/`.log`), bloques de código Markdown balanceados, `npx tsc --noEmit` ✅ y `npm run build` ✅.
- **Paso 4 — Memoria:** este registro actualiza el banco de memoria.

### 2026-10-17 — Configuración infraestructura de agentes y banco de memoria (actualización v2)

- Actualizado `memory-bank/` con el **mapeo estricto de capa de aplicación** (`./uis/website`, `./uis/backoffice`, `/services`) y la restricción de **prohibido crear carpetas paralelas** (`/apps`, `/frontend`, `/backend`, `/src/website`, etc.).
- Reordenado el flujo obligatorio de `AGENTS.md` en 4 pasos: **Requisitos → Rutas de Aplicación → Código y Calidad → Memoria**.
- Creada la regla `.agents/rules/app-structure-and-code.md` (aplicable a `./uis/**` y `/services/**`).
- Renombrada la skill a `.agents/skills/validate-landing-form/SKILL.md` (validación del sitio + formulario en `./uis/website`).
- Confirmado estado del repo: rama `feature/domain-models`, sin cambios pendientes.
- **Estado de validaciones:** `npx tsc --noEmit` ✅ | `npm run build` ✅ | preview local ✅ (HTTP 200).

> _Este archivo debe actualizarse al final de cada cambio relevante, conforme al flujo de `AGENTS.md`._
