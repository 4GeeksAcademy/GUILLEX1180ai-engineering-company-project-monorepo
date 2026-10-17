# AGENTS.md — Protocolo de Agentes del Monorepo TrackFlow

> Este archivo define el **proceso obligatorio** que todo agente (IA o humano)
> debe seguir al trabajar en el monorepo de **TrackFlow Tech**.
> Fuente de verdad de negocio: [`CONTEXT.es.md`](./CONTEXT.es.md).

---

## 1. Archivos a leer al iniciar cada sesión

Antes de escribir o modificar cualquier código, todo agente DEBE leer:

1. **`./CONTEXT.es.md`** — briefing de negocio, entidades, campos del formulario, validaciones y mensajes de error.
2. **Todo el contenido de `./memory-bank/`** — contexto técnico y estado del proyecto:
   - `memory-bank/projectbrief.md`
   - `memory-bank/techContext.md`
   - `memory-bank/progress.md`

> Si `CONTEXT.es.md` no está disponible, leer la versión en inglés `./CONTEXT.md`.

---

## 2. Flujo obligatorio de 4 pasos antes de cada commit

Todo cambio que vaya a commitearse **debe** pasar por los siguientes 4 pasos, en orden:

### Paso 1 — Verificación de Requisitos

Validar que el código cumple con las especificaciones de:

- `CONTEXT.es.md` (entidades, campos, validaciones, mensajes de error).
- `memory-bank/` (projectbrief, techContext, progress).

### Paso 2 — Validación de Rutas de Aplicación

Confirmar que **no se crearon archivos ni carpetas paralelas fuera de la estructura oficial**:

- Sitio público B2B → `./uis/website`
- App interna / Backoffice → `./uis/backoffice`
- APIs y Microservicios → `/services`

> Está **prohibido** crear árboles paralelos (`/apps`, `/frontend`, `/backend`, `/src/website`, etc.).
> Cualquier desviación requiere confirmación explícita y debe quedar registrada en `memory-bank/progress.md`.

### Paso 3 — Verificación de Código y Calidad

Ejecutar formateo, linter y pruebas estáticas **sin errores ni advertencias**:

- `npx tsc --noEmit` (typecheck estricto de la capa TS).
- `npm run build` (compilación de producción).
- Cualquier linter/formateador configurado en el proyecto.

### Paso 4 — Actualización de Memoria

Actualizar `memory-bank/progress.md` reflejando:

- Los cambios realizados.
- El estado actual del proyecto.
- Próximos pasos.

---

## 3. Carpetas y archivos protegidos

Los siguientes archivos/carpetas están **protegidos**: requieren **confirmación explícita**
antes de editarlos:

| Protegido                                                                                | Razón                                     |
| ---------------------------------------------------------------------------------------- | ----------------------------------------- |
| `package.json`, `pnpm-workspace.yaml`, `tsconfig.json`, Dockerfiles y otros configs raíz | Afectan a todo el monorepo                |
| READMEs principales de la plantilla en `./uis/` y `/services`                            | Documentación oficial de estructura       |
| Documentos del banco de memoria (`./memory-bank/*`) en refactorizaciones mayores         | Requieren revisión de consistencia previa |

---

## 4. Estructura de agentes del monorepo

| Ruta                | Propósito                                       |
| ------------------- | ----------------------------------------------- |
| `./agents/`         | Agentes de IA internos (copilotos, asistentes)  |
| `./.agents/rules/`  | Reglas de desarrollo (convenciones)             |
| `./.agents/skills/` | Skills reutilizables de validación/verificación |
| `./skills/`         | Skills generales de la plantilla                |
| `./memory-bank/`    | Banco de memoria del proyecto                   |

---

## 5. Definition of Done (DoD)

Un cambio se considera **completado** cuando:

- [ ] Cumple los 4 pasos del flujo obligatorio.
- [ ] Respeta los archivos protegidos (o cuenta con confirmación explícita).
- [ ] `memory-bank/progress.md` refleja el nuevo estado.
