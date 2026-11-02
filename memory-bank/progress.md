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
- [x] Seguridad de rutas: `GET/PUT /profiles/me` están protegidas y `/users` exige autenticación; listado, lectura y borrado impiden el acceso a cuentas ajenas sin rol admin.
- [x] **Hito backoffice de inventario (backend):** implementado el módulo completo de inventario en `src/` — tabla TinyDB `inventory` en `src/database.py`, esquemas (`InventoryItem`, `InventoryItemCreate/Update`, `StockAdjustment`, `WarehouseLocation`, `InventoryStatus`) en `src/schemas.py`, capa de servicio (`create/list/get/update/adjust/delete/inventory_summary` + derivación automática de estado `in_stock|low_stock|out_of_stock`) en `src/services.py` y router `src/routers/inventory.py` con 7 endpoints protegidos por JWT: `GET/POST /inventory`, `GET /inventory/summary`, `GET/PUT/DELETE /inventory/{item_id}`, `PATCH /inventory/{item_id}/stock`.
- [x] **Hito backoffice de inventario (frontend):** 3 vistas en `uis/backoffice` — listado `/inventory` (métricas, filtros por búsqueda/almacén/estado, tabla con badges y acciones), alta `/inventory/new` (formulario validado) y detalle `/inventory/[id]` (ficha, ajuste de stock ±, edición y borrado); entrada "Inventario" añadida al `Sidebar`.
- [x] Criterio de 5 rutas externas SATISFECHO: **9 operaciones protegidas** fuera de `/users` y `/auth` (`GET/PUT /profiles/me` + 7 de inventario); `tests/test_auth_validation.py` pasa completo.
- [x] Auditoría reproducible AUTH-01 en `scripts/auth01_audit.py`: última ejecución, 12 verificaciones PASS y 0 FAIL.
- [x] Suite pytest en `tests/`: última ejecución global **48 passed, 0 failed**.
- [x] AUTH-02 inicial en `./uis/backoffice`: aplicación Next.js privada con login, registro, perfil y guard cliente; CORS local de FastAPI configurado por `FRONTEND_ORIGINS` (default `http://localhost:3001`). `npm run typecheck`, `npm run build`, rutas Next y preflight CORS local verificados; falta E2E real en navegador.
- [x] Dependencias runtime de backoffice: `npm audit --omit=dev` sin vulnerabilidades. `npm audit` completo aún reporta 7 advisories de dependencias de desarrollo de Tailwind 3; el arreglo que propone npm requiere migrar a Tailwind 4 (`--force`), por lo que no se aplicó automáticamente.
- [x] AUTH-03 backend: forgot/reset/change-password con Resend, `BackgroundTasks` para respuesta anti-enumeración, JWT de un solo uso guardado por hash en TinyDB y tests simulados; `uv run pytest -q tests/test_password_reset.py` pasó (8 tests). Escaneo de patrones conocidos de credenciales en código fuente sin coincidencias; `.env` está ignorado.
- [x] AUTH-03 frontend completo: vistas `/forgot-password`, `/reset-password` y `/account/change-password` implementadas con react-hook-form, validación bcrypt 72 bytes, enlace en `/login` y notice de `passwordReset=success`.
- [ ] Añadir `RESEND_API_KEY`, `EMAIL_FROM`, `FRONTEND_URL` y `RESET_TOKEN_EXPIRE_MINUTES` a `.env.example`; la herramienta de edición bloqueó ese archivo. No se tocó `.env` y todavía hace falta configurar una API key real de Resend para el envío efectivo.

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
5. Completar la validación visual y pruebas E2E del backoffice AUTH-02 en `./uis/backoffice`.
6. Migrar los módulos AUTH-01 de `src/` a `./services` cuando se autorice la normalización de la estructura.

## Registro de avances

### 2026-10-30 — Hito backoffice de inventario: backend + vistas ✅

- ✅ **Backend inventario completo** (en `src/`, misma excepción temporal documentada):
  - `src/database.py`: nueva tabla TinyDB `inventory` + `InventoryQuery`.
  - `src/schemas.py`: `WarehouseLocation` (`los_angeles`, `zaragoza`), `InventoryStatus`, `InventoryItem`, `InventoryItemCreate/Update`, `StockAdjustment` (todos `extra="forbid"`).
  - `src/services.py`: `create_inventory_item`, `list_inventory_items(w)/status`, `get_inventory_item`, `update_inventory_item`, `adjust_inventory_stock` (rechaza saldos negativos), `delete_inventory_item`, `inventory_summary()`; derivación automática de estado; acceso con `DB_LOCK` y rollback en fallo.
  - `src/routers/inventory.py`: 7 endpoints protegidos con JWT; escritura restringida a `admin`/`manager` (403 en otro caso); mapeo de errores 409 (SKU duplicado), 404, 422, 500.
  - Registrado en `src/main.py` (`app.include_router(inventory_router)`).
- ✅ **Frontend inventario** (`uis/backoffice`):
  - `src/types/inventory.ts` (tipos + etiquetas ES + helper `canManageInventory`).
  - `src/services/inventory.ts` (8 llamadas API sobre `apiRequest`).
  - Vistas `src/app/(private)/inventory/page.tsx`, `inventory/new/page.tsx`, `inventory/[id]/page.tsx`; ítem "Inventario" en `Sidebar.tsx`.
- ✅ **Verificación:** `pytest tests/` → **48 passed, 0 failed** (criterio de 5 rutas externas ahora SATISFECHO: 9 protegidas).
- ✅ **TypeScript raíz y backoffice:** `npx tsc --noEmit` sin errores.
- ✅ **Build Next.js:** `npm run build` OK (12 rutas; incluye `/inventory`, `/inventory/new`, `/inventory/[id]`).
- ✅ **E2E API en vivo:** 11/11 checks (401 sin token, 201 create, ajuste ± con recálculo de estado, 404 tras delete, roles) y smoke test **16/16**.

### 2026-10-23 — Validación final y despliegue en desarrollo ✅

- ✅ **scripts/analyze.py** — Corregido el orden de import (sys.path.insert antes de import desde src).
- ✅ **Todos los tests:** 47 passed, 1 failed (fallo conocido: solo 2 rutas externas, no 5).
- ✅ **CLI analizador:** `uv run python scripts/analyze.py data/raw/incidents.csv` — 15 incidencias, exportación CSV funcional.
- ✅ **API REST verificada:**
  - `POST /api/incidents/analyze` con CSV real → 200 JSON correcto.
  - `GET /api/incidents/results/export` → CSV descargable.
  - CSV vacío → 400.
  - Sin archivo → 422.
  - Extensión no .csv → 400.
  - Swagger docs activo en `/docs`.
- ✅ **TypeScript raíz:** `npx tsc --noEmit` sin errores.
- ✅ **TypeScript backoffice:** `npx tsc --noEmit` sin errores.
- ✅ **Servidor FastAPI** arrancado y probado en `http://127.0.0.1:8000`.
- ✅ **`.env.example`** actualizado con todas las variables necesarias (SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, RESEND_API_KEY, EMAIL_FROM, FRONTEND_URL, RESET_TOKEN_EXPIRE_MINUTES, FRONTEND_ORIGINS).
- ⚠️ **Pendiente:** Copiar `.env.example` → `.env` y configurar `RESEND_API_KEY` real para envío de emails.
- ⚠️ **Pendiente:** Iniciar Next.js backoffice (`cd uis/backoffice && npm run dev`) para probar frontend.

### 2026-10-22 — Verificación completa del proyecto con Analizador de Incidencias integrado ✅

- ✅ **Analizador de Incidencias (Fases 1 y 2) completo:**
  - `scripts/analyzer_core.py` — Módulo reutilizable con stdlib (requiere columnas: id, title, category, priority, status).
  - `scripts/analyze.py` — CLI con argparse, exportación a CSV, reporte legible.
  - `src/incident_service.py` — Mismo análisis como servicio compartido (acepta str, IO, bytes).
  - `src/routers/incidents.py` — Endpoints `POST /api/incidents/analyze` (multipart CSV → JSON) y `GET /api/incidents/results/export` (CSV descargable).
  - Router registrado en `src/main.py` (prefix `/api/incidents`).
  - Documentado en `services/README.md`.
- ✅ **AUTH-03 backend:** 8/8 tests pasando.
- ✅ **AUTH-03 seguridad:** `test_auth_token_purpose.py` 4/4 tests pasando (rechaza tokens password_reset y sin exp).
- ✅ **AUTH-03 frontend (Next.js backoffice):** 3 vistas implementadas + enlace en login + notice de éxito.
- ✅ **TypeScript raíz:** `npx tsc --noEmit` sin errores.
- ✅ **TypeScript backoffice:** `npx tsc --noEmit` sin errores.
- ✅ **Tests globales:** 22 passed, 1 failed (fallo conocido: solo 2 rutas externas existen, no las 5 que pide el test AUTH-01).
- ⚠️ 1 fallo conocido en `test_auth_validation.py::test_five_secured_routes_exist_outside_users_and_auth` — la API solo define GET/PUT `/profiles/me` fuera de `/users` y `/auth`.

> _Este archivo debe actualizarse al final de cada cambio relevante, conforme al flujo de `AGENTS.md`._
